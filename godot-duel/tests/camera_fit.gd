extends SceneTree
## Real Camera3D projection and touch-routing regression at actual window sizes.

const WINDOWS := [Vector2i(390,844), Vector2i(360,640), Vector2i(800,1280), Vector2i(1280,800), Vector2i(844,390), Vector2i(390,844), Vector2i(1280,800)]
const PLAYERS := [{"id":"p1","name":"YOU","hp":100,"x":-3,"z":0}, {"id":"p2","name":"RIVAL","hp":100,"x":3,"z":0}]
var scene: Node3D

func _initialize() -> void:
	call_deferred("_run")

func _settle() -> void:
	for i in range(4):
		await process_frame

func _touch(logical_position: Vector2) -> void:
	# Feed physical screen coordinates through Godot's actual touch-to-mouse
	# emulation, canvas transform and GUI dispatch instead of calling handlers.
	for pressed in [true,false]:
		var event := InputEventScreenTouch.new()
		event.position = root.get_final_transform() * logical_position
		event.pressed = pressed
		Input.parse_input_event(event)
		await process_frame

func _run() -> void:
	root.size = Vector2i(1280,800)
	scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	scene.sound_on = false
	scene._packet({"type":"welcome","id":"p1","token":"camera-test"})
	scene.connect_button.pressed.connect(func(): scene.connect_button.set_meta("touched",true))
	scene.ready_button.pressed.connect(func(): scene.ready_button.set_meta("touched",true))
	await _settle()
	for dimensions in WINDOWS:
		root.size = dimensions
		await _settle()
		scene.connect_panel.hide()
		scene._packet({"type":"snapshot","players":PLAYERS,"round":{"phase":"playing"}})
		await _settle()
		var top: float = scene.labels.hint.get_global_rect().end.y + 12
		var bottom: float = scene.ready_button.get_global_rect().position.y - 12
		var safe := Rect2(Vector2(16,top), Vector2(scene.ui.size.x-32,bottom-top))
		assert(safe.size.y > 0,"HUD leaves no safe playfield at %s" % dimensions)
		var view_bounds := Rect2(Vector2.ZERO,scene.ui.size)
		var hud: Array = [scene.status_label,scene.labels.phase,scene.labels.hint,scene.labels.controls,scene.notice,scene.ready_button,scene.ui.get_node("Score"),scene.ui.get_node("Actions"),scene.ui.get_node("ServerButton"),scene.ui.get_node("SoundButton")]
		for control in hud + [scene.connect_panel,scene.connect_button]:
			assert(view_bounds.encloses(control.get_global_rect()),"HUD clipped at %s: %s %s" % [dimensions,control.name,control.get_global_rect()])
		for control in hud:
			assert(not safe.intersects(control.get_global_rect()),"HUD overlaps safe playfield at %s: %s" % [dimensions,control.name])
		# Check the real projection independently of the fit helper. Ground and
		# head corners catch both width clipping and the isometric Y/Z extrema.
		for x in [-10.0,10.0]:
			for z in [-7.0,7.0]:
				for y in [0.2,4.5]:
					var point := Vector3(x,y,z)
					assert(not scene.camera.is_position_behind(point),"Arena corner is behind the camera")
					var screen: Vector2 = scene.camera.unproject_position(point)
					assert(safe.grow(0.01).has_point(screen),"Arena/head clipped at %s: %s -> %s outside %s" % [dimensions,point,screen,safe])
				# Sprite3D is billboarded: its extent lies in the camera plane,
				# not in a world-aligned box. Include its highest walking bob.
				for sx in [-1.0,1.0]:
					for sy in [-1.0,1.0]:
						var edge: Vector3 = Vector3(x,1.61,z) + scene.camera.global_basis.x * (sx*1.008) + scene.camera.global_basis.y * (sy*1.344)
						assert(safe.grow(0.01).has_point(scene.camera.unproject_position(edge)),"Billboard sprite clipped at %s" % dimensions)
		# Repeated resize must not drift camera position or rotation.
		var before: Transform3D = scene.camera.global_transform
		var before_size: float = scene.camera.size
		for i in range(5): scene._resize()
		assert(scene.camera.global_transform.is_equal_approx(before),"Repeated fit drifts the camera")
		assert(is_equal_approx(scene.camera.size,before_size),"Repeated fit changes zoom")
		var pixel_scale: float = root.get_final_transform().y.length()
		for button in [scene.attack_button,scene.skill_button,scene.dash_button,scene.connect_button,scene.ready_button]:
			assert(button.size.y*pixel_scale >= 44-0.01,"Touch target below 44 physical pixels at %s: %s" % [dimensions,button.text])
		assert(not scene.notice.get_global_rect().intersects(scene.ready_button.get_global_rect()),"Notice overlaps rematch")
		assert(not scene.notice.get_global_rect().intersects(scene.labels.controls.get_global_rect()),"Notice overlaps controls")
		assert(not scene.notice.get_global_rect().intersects(scene.ui.get_node("Actions").get_global_rect()),"Notice overlaps actions")
		await _touch(scene.attack_button.get_global_rect().get_center())
		assert(scene.target_id == "p2","STRIKE touch did not select the rival at %s" % dimensions)
		for ability in [[scene.skill_button,"skill"],[scene.dash_button,"dash"]]:
			await _touch(ability[0].get_global_rect().get_center())
			assert(scene.aim_mode == ability[1],"Ability touch did not arm at %s" % dimensions)
			await _settle()
			for button in [scene.attack_button,scene.skill_button,scene.dash_button]:
				assert(view_bounds.encloses(button.get_global_rect()),"Armed ability pushes touch button offscreen at %s: %s %s" % [dimensions,button.text,button.get_global_rect()])
			await _touch(ability[0].get_global_rect().get_center())
			assert(scene.aim_mode.is_empty(),"Repeated ability touch did not cancel at %s" % dimensions)
			await _touch(ability[0].get_global_rect().get_center())
			assert(scene.aim_mode == ability[1],"Ability could not be armed again")
			await _touch(scene.camera.unproject_position(Vector3(8,0.2,5)))
			assert(scene.aim_mode.is_empty(),"Aimed floor touch did not consume the ability at %s" % dimensions)
		# A floor tap at every playable corner must survive HUD hit testing and
		# project back to the same authoritative arena coordinate.
		for x in [-10.0,10.0]:
			for z in [-7.0,7.0]:
				var point := Vector3(x,0.2,z)
				var screen: Vector2 = scene.camera.unproject_position(point)
				# Integer expanded viewport dimensions can round the inverse ray
				# by a fraction of a pixel (about 0.002 world units on 360x640).
				assert(scene._ground(screen).distance_to(point) < 0.02,"Ground ray mapping changed at %s: %s -> %s" % [dimensions,point,scene._ground(screen)])
				scene.marker_time = 0
				await _touch(screen)
				assert(scene.marker_time > 0,"Playable edge touch was intercepted by HUD at %s" % dimensions)
				assert(scene.destination_marker.position.distance_to(point+Vector3(0,0.05,0)) < 0.02,"Floor touch targeted the wrong position")
		scene._packet({"type":"snapshot","players":PLAYERS,"round":{"phase":"finished","winner":"p1"}})
		await _settle()
		assert(scene.ready_button.visible,"Rematch button must be available at round end")
		scene.ready_button.set_meta("touched",false)
		await _touch(scene.ready_button.get_global_rect().get_center())
		assert(scene.ready_button.get_meta("touched"),"Rematch touch did not reach its button at %s" % dimensions)
		scene.connect_panel.show()
		# Invalid input exercises the real JOIN button without opening a network
		# connection or consuming a player slot on any server.
		scene.server_input.text = "invalid-test-address"
		scene.connect_button.set_meta("touched",false)
		await _settle()
		await _touch(scene.connect_button.get_global_rect().get_center())
		assert(scene.connect_button.get_meta("touched"),"JOIN touch did not reach its button at %s" % dimensions)
		assert(not scene.active_connection,"Invalid test address must never connect")
		assert(scene.notice.text.begins_with("Server address must"),"JOIN touch did not invoke validation")
		print("PASS camera + HUD + touch ",dimensions," logical ",scene.ui.size," ortho_size=",snappedf(scene.camera.size,0.001))
	scene.queue_free()
	await _settle()
	quit(0)
