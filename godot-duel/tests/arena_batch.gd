extends SceneTree
## Structural/render-input regression, not a GPU timing or browser visual test.
## Run: godot --headless --path . --script res://tests/arena_batch.gd

const POSITION_EPSILON := 0.00002
const DIRECTION_EPSILON := 0.0003 # ArrayMesh packs normal/tangent directions.
const UV_EPSILON := 0.00001
const MATERIAL_PROPERTIES := ["albedo_color", "roughness", "metallic", "emission_enabled", "emission", "emission_energy_multiplier", "transparency", "shading_mode", "cull_mode", "vertex_color_use_as_albedo"]
const INSTANCE_PROPERTIES := ["visible", "layers", "cast_shadow", "gi_mode", "material_overlay", "transparency", "visibility_range_begin", "visibility_range_end", "extra_cull_margin"]

class CapturedArena:
	extends "res://scripts/arena.gd"
	var original_surfaces: Dictionary = {}
	var original_nodes: Array[WeakRef] = []
	var other_nodes: Array[Node] = []
	var original_surface_count := 0

	func _batch_static_geometry() -> void:
		if not _static_batched:
			# Observe the production builder immediately before the real merge.
			# No copied geometry fixture or production batching-disable flag.
			for child in get_children():
				if not child is MeshInstance3D:
					other_nodes.append(child)
					continue
				original_nodes.append(weakref(child))
				assert(child.transform.basis.is_equal_approx(child.transform.basis.orthonormalized()), "Static child scaling needs a normal-matrix-aware merge")
				assert(child.transform.basis.determinant() > 0, "Static mirrored children need winding correction")
				for surface in range(child.mesh.get_surface_count()):
					var material: Material = child.get_active_material(surface)
					if not original_surfaces.has(material): original_surfaces[material] = []
					var material_state: Dictionary = {}
					for property in MATERIAL_PROPERTIES: material_state[property] = material.get(property)
					var instance_state: Dictionary = {}
					for property in INSTANCE_PROPERTIES: instance_state[property] = child.get(property)
					original_surfaces[material].append({
						"arrays": child.mesh.surface_get_arrays(surface),
						"world": child.global_transform,
						"material_state": material_state,
						"instance_state": instance_state,
					})
					original_surface_count += 1
		super._batch_static_geometry()

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await _verify_arena(Transform3D.IDENTITY, Transform3D.IDENTITY)
	# Non-identity, non-uniformly scaled ancestors catch double transforms,
	# baking in world space and incorrect inherited normal transforms.
	await _verify_arena(
		Transform3D(Basis.from_euler(Vector3(0.2,0.6,-0.1)).scaled(Vector3(1.2,0.8,1.5)),Vector3(11,-3,7)),
		Transform3D(Basis.from_euler(Vector3(-0.1,0.4,0.2)),Vector3(-2,1,4)))
	quit(0)

func _verify_arena(parent_transform: Transform3D, arena_transform: Transform3D) -> void:
	var holder := Node3D.new()
	holder.transform = parent_transform
	root.add_child(holder)
	var arena := CapturedArena.new()
	arena.transform = arena_transform
	holder.add_child(arena)
	var batches: Dictionary = {}
	var surface_count := 0
	for child in arena.get_children():
		if not child is MeshInstance3D: continue
		assert(child.mesh is ArrayMesh, "Every static primitive should be batched")
		assert(child.transform == Transform3D.IDENTITY, "Batch must stay arena-local")
		assert(child.mesh.get_surface_count() == 1, "A batch must submit just one material surface")
		var material: Material = child.get_active_material(0)
		assert(not batches.has(material), "One batch per material, not per primitive")
		batches[material] = child
		surface_count += child.mesh.get_surface_count()
	assert(arena.original_surface_count >= 200, "Regression must cover the full authored arena")
	assert(batches.size() == arena.original_surfaces.size(), "Material groups were lost or added")
	assert(surface_count <= 35, "Static arena surface budget exceeded")
	assert(surface_count * 6 < arena.original_surface_count, "Expected over 83% fewer static submissions")
	var vertices := 0
	var triangles := 0
	for material in arena.original_surfaces:
		assert(batches.has(material), "Original material resource was replaced or lost")
		var batch: MeshInstance3D = batches[material]
		var counts := _verify_group(batch,arena.original_surfaces[material])
		vertices += counts.x
		triangles += counts.y
	assert(arena.other_nodes.size() == 2, "Expected the original world environment and sun")
	for other in arena.other_nodes:
		assert(other.get_parent() == arena, "Batching must preserve lighting/environment nodes")
	for source in arena.original_nodes:
		assert(source.get_ref() == null or source.get_ref().get_parent() == null, "Original geometry would render twice")
	await process_frame
	for source in arena.original_nodes:
		assert(source.get_ref() == null, "Original static instances must be freed")
	_verify_dynamic_effects(arena,batches)
	print("PASS arena batching: ",arena.original_surface_count," -> ",surface_count,
		" static surfaces; ",vertices," vertices / ",triangles,
		" triangles retain world positions, winding, normals, tangents, UVs and materials; dynamic effects remain independent")
	holder.queue_free()
	await process_frame

func _verify_group(batch: MeshInstance3D, sources: Array) -> Vector2i:
	var actual: Array = batch.mesh.surface_get_arrays(0)
	var actual_vertices: PackedVector3Array = actual[Mesh.ARRAY_VERTEX]
	var actual_normals: PackedVector3Array = actual[Mesh.ARRAY_NORMAL]
	var actual_tangents: PackedFloat32Array = actual[Mesh.ARRAY_TANGENT]
	var actual_uvs: PackedVector2Array = actual[Mesh.ARRAY_TEX_UV]
	var actual_indices: PackedInt32Array = actual[Mesh.ARRAY_INDEX]
	var vertex_offset := 0
	var index_offset := 0
	for source in sources:
		var expected: Array = source.arrays
		var source_vertices: PackedVector3Array = expected[Mesh.ARRAY_VERTEX]
		var source_normals: PackedVector3Array = expected[Mesh.ARRAY_NORMAL]
		var source_tangents: PackedFloat32Array = expected[Mesh.ARRAY_TANGENT]
		var source_uvs: PackedVector2Array = expected[Mesh.ARRAY_TEX_UV]
		var source_indices: PackedInt32Array = expected[Mesh.ARRAY_INDEX]
		var source_world: Transform3D = source.world
		var source_normal_matrix := source_world.basis.inverse().transposed()
		var batch_normal_matrix := batch.global_basis.inverse().transposed()
		assert(source_indices.size() > 0 and source_indices.size() % 3 == 0, "Authored surfaces must be indexed triangles")
		assert(actual_vertices.size() >= vertex_offset + source_vertices.size(), "Missing vertices")
		assert(actual_indices.size() >= index_offset + source_indices.size(), "Missing triangles")
		assert(actual_normals.size() == actual_vertices.size(), "Missing normals")
		assert(actual_tangents.size() == actual_vertices.size()*4, "Missing tangents")
		assert(actual_uvs.size() == actual_vertices.size(), "Missing UVs")
		for i in range(source_vertices.size()):
			var j := vertex_offset + i
			var world_expected: Vector3 = source_world * source_vertices[i]
			var world_actual: Vector3 = batch.global_transform * actual_vertices[j]
			assert(world_expected.distance_to(world_actual) <= POSITION_EPSILON, "World-space position changed")
			var normal_expected: Vector3 = (source_normal_matrix * source_normals[i]).normalized()
			var normal_actual: Vector3 = (batch_normal_matrix * actual_normals[j]).normalized()
			assert(normal_expected.distance_to(normal_actual) <= DIRECTION_EPSILON, "World-space normal changed")
			var tangent_expected := Vector3(source_tangents[i*4],source_tangents[i*4+1],source_tangents[i*4+2])
			var tangent_actual := Vector3(actual_tangents[j*4],actual_tangents[j*4+1],actual_tangents[j*4+2])
			tangent_expected = (source_world.basis * tangent_expected).normalized()
			tangent_actual = (batch.global_basis * tangent_actual).normalized()
			assert(tangent_expected.distance_to(tangent_actual) <= DIRECTION_EPSILON, "World-space tangent changed")
			assert(source_tangents[i*4+3] == actual_tangents[j*4+3], "Tangent handedness changed")
			assert(source_uvs[i].distance_to(actual_uvs[j]) <= UV_EPSILON, "UV changed")
		for i in range(source_indices.size()):
			assert(actual_indices[index_offset+i] == source_indices[i]+vertex_offset, "Triangle connectivity/order/winding changed")
		for property in source.material_state:
			assert(batch.get_active_material(0).get(property) == source.material_state[property], "Material property changed: %s" % property)
		for property in source.instance_state:
			assert(batch.get(property) == source.instance_state[property], "Render-instance property changed: %s" % property)
		vertex_offset += source_vertices.size()
		index_offset += source_indices.size()
	assert(actual_vertices.size() == vertex_offset, "Extra vertices")
	assert(actual_indices.size() == index_offset, "Extra triangles")
	return Vector2i(vertex_offset,index_offset/3)

func _verify_dynamic_effects(arena: CapturedArena, batches: Dictionary) -> void:
	# Reuse STATIC material keys so being unbatched cannot accidentally depend
	# on effects using new colors. These helpers are also used by the client.
	var ring := arena.ring(Vector3(1,0.25,2),0.38,0.045,"e6d8aa")
	var beam := arena.box(Vector3(-1,0.3,3),Vector3(0.25,0.02,16),"e0d4ab")
	var cylinder := arena.cylinder(Vector3(2,1,-3),0.1,0.4,"779775")
	var effects := [ring,beam,cylinder]
	assert(ring.mesh is TorusMesh and beam.mesh is BoxMesh and cylinder.mesh is CylinderMesh)
	var unchanged: Dictionary = {}
	for material in batches:
		var batch: MeshInstance3D = batches[material]
		unchanged[batch] = {"mesh":batch.mesh,"transform":batch.transform}
	# A repeated call must never absorb post-ready helpers into static batches.
	arena._batch_static_geometry()
	for effect in effects:
		assert(effect.get_parent() == arena and not effect.is_queued_for_deletion(), "Dynamic effect was batched")
		effect.position += Vector3(3,1,-2)
		effect.rotation.y = 0.8
		effect.scale = Vector3(1.2,1,0.7)
		effect.hide()
		assert(not effect.visible)
		effect.show()
		assert(effect.visible and effect.position.y > 1, "Dynamic effect is not independently movable")
		effect.queue_free()
	for batch in unchanged:
		assert(batch.mesh == unchanged[batch].mesh and batch.transform == unchanged[batch].transform, "Dynamic effects changed a static batch")
