extends Node3D
## Original, project-scoped geometry. The render scene never owns game rules.
var mats: Dictionary = {}
var _static_batched := false

func mat(hex: String, glow: float = 0.0) -> StandardMaterial3D:
	var key := hex + str(glow)
	if mats.has(key): return mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.roughness = 0.85
	if glow > 0:
		m.emission_enabled = true
		m.emission = Color(hex)
		m.emission_energy_multiplier = glow
	mats[key] = m
	return m

func box(pos: Vector3, size: Vector3, color: String, rot: float = 0) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	n.mesh = mesh
	n.material_override = mat(color)
	add_child(n)
	n.position = pos
	n.rotation.y = rot
	return n

func cylinder(pos: Vector3, radius: float, height: float, color: String, top_radius: float = -1, sides: int = 12) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.bottom_radius = radius
	mesh.top_radius = radius if top_radius < 0 else top_radius
	mesh.height = height
	mesh.radial_segments = sides
	n.mesh = mesh
	n.material_override = mat(color)
	add_child(n)
	n.position = pos
	return n

func ring(pos: Vector3, radius: float, thickness: float, color: String) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - thickness
	mesh.outer_radius = radius
	mesh.rings = 48
	mesh.ring_segments = 6
	n.mesh = mesh
	n.material_override = mat(color,0.3)
	add_child(n)
	n.position = pos
	return n

func _ready() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("183c4c")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("b8e6ec")
	e.ambient_light_energy = 0.42
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55,-35,0)
	sun.light_color = Color("ffe4b1")
	sun.light_energy = 0.72
	sun.shadow_enabled = not OS.has_feature("web")
	sun.directional_shadow_max_distance = 60
	add_child(sun)
	# Floating foundation with a terraced, authored stone battle floor.
	box(Vector3(0,-1.15,0),Vector3(22.4,2.2,16.4),"304d54")
	box(Vector3(0,-0.28,0),Vector3(22.8,0.35,16.8),"759991")
	box(Vector3(0,-0.04,0),Vector3(21.4,0.25,15.4),"9bad9a")
	for x in range(-5,5):
		for z in range(-3,4):
			var colors := ["b3b49b","a8b29d","b7b7a1","a5ae99"]
			box(Vector3(x*2+1,0.08,z*2),Vector3(1.96,0.15,1.96),colors[posmod(x*7+z*3,4)])
	# Mosaic lanes and center, all visual only; the arena itself has no obstacles.
	for x in range(-9,10):
		box(Vector3(x,0.18,0),Vector3(0.6,0.025,0.17),"e0d4ab")
	ring(Vector3(0,0.2,0),2.7,0.035,"e6d8aa")
	ring(Vector3(0,0.2,0),2.25,0.025,"e6d8aa")
	for i in range(8):
		var a := i*TAU/8
		box(Vector3(sin(a)*2.48,0.2,cos(a)*2.48),Vector3(0.16,0.025,0.16),"e6d8aa",a)
	box(Vector3(0,0.2,0),Vector3(1.25,0.04,1.25),"6a9c9a",PI/4)
	box(Vector3(0,0.23,0),Vector3(0.85,0.04,0.85),"d6d6b5",PI/4)
	for side in [-1,1]:
		ring(Vector3(side*6,0.2,0),1.4,0.055,"83d6d2" if side<0 else "efae81")
		for z in range(-7,8,2):
			box(Vector3(side*10.6,0.36,z),Vector3(0.45,0.6,1.75),"507874")
		for x in range(-9,10,2):
			box(Vector3(x,0.35,side*7.6),Vector3(1.75,0.55,0.45),"507874")
		for z in [-1,1]:
			_tower(Vector3(side*10.4,0,z*7.3),side<0)
	# Large background supports, vines and distant floating garden fragments.
	for side in [-1,1]:
		for z in [-4,4]:
			box(Vector3(side*10.2,-2,z),Vector3(2,3.8,2),"31494d")
			cylinder(Vector3(side*10.25,-4,z),1.3,3,"31494d",0.4,5)
		for i in range(4):
			var p := Vector3(side*(12.5+i*0.9),-2.3-i*1.2,4.6-i*4)
			cylinder(p,1.6-i*.2,1.8,"345857",0.8,5)
			cylinder(p+Vector3(0,0.91,0),0.85,0.25,"668b70",0.85,7)
	for x in [-8,-5,5,8]:
		for z in [-7.5,7.5]:
			for i in range(3):
				cylinder(Vector3(x+i*.15,0.4,z),0.2,0.5,"779775",0,5)
	# A warm, graphic sky speckle field without particles or post-processing.
	for i in range(35):
		var p := Vector3(sin(i*17.1)*24,-5.0+fmod(i*1.31,7),cos(i*9.3)*20)
		if absf(p.x)>12 or absf(p.z)>9:
			cylinder(p,0.035,0.09,"90b9ac",0.035,5)
	_batch_static_geometry()

func _batch_static_geometry() -> void:
	# Only the authored geometry exists here. Later rings/boxes belong to combat
	# effects and must keep their own transforms, visibility and lifetimes.
	if _static_batched: return
	_static_batched = true
	var surfaces: Dictionary = {}
	var sources: Array[MeshInstance3D] = []
	for child in get_children():
		if not child is MeshInstance3D: continue
		var source := child as MeshInstance3D
		sources.append(source)
		for surface in range(source.mesh.get_surface_count()):
			var material := source.get_active_material(surface)
			if not surfaces.has(material):
				var tool := SurfaceTool.new()
				tool.begin(Mesh.PRIMITIVE_TRIANGLES)
				tool.set_material(material)
				surfaces[material] = tool
			# Authored primitives use translation/rotation only, with size baked
			# into the mesh. append_from retains indices, normals, tangents and UVs.
			# Stay in arena-local space so moving the arena still moves all its art.
			surfaces[material].append_from(source.mesh,surface,source.transform)
	for material in surfaces:
		var batch := MeshInstance3D.new()
		batch.name = "StaticBatch%d" % get_child_count()
		batch.mesh = surfaces[material].commit()
		add_child(batch)
	# Remove the source instances immediately: there must be no overlapping
	# unbatched geometry during the first rendered frame.
	for source in sources:
		remove_child(source)
		source.queue_free()

func _tower(p: Vector3, teal: bool) -> void:
	box(p+Vector3(0,0.1,0),Vector3(1.9,0.3,1.9),"436b69")
	box(p+Vector3(0,0.72,0),Vector3(1.22,1.3,1.22),"c3bc97")
	box(p+Vector3(0,1.45,0),Vector3(1.55,0.28,1.55),"577b72")
	cylinder(p+Vector3(0,2.05,0),0.68,1.05,"467f80" if teal else "b37c69",0,4).rotation.y=PI/4
	cylinder(p+Vector3(0,2.73,0),0.085,0.5,"eacb89",0.085,6)
	var lantern := cylinder(p+Vector3(0,1.03,-0.64),0.14,0.36,"ffd382",0.14,6)
	lantern.material_override = mat("ffd382",0.7)
	# Hanging pennants echo each duelist's color without blocking the arena.
	box(p+Vector3(0,-0.3,-0.7),Vector3(0.65,1.25,0.07),"55a6a6" if teal else "d99773")
