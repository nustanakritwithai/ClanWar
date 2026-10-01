extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	root.size = Vector2i(1280,800)
	var scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	# Resize the real root window; the client must choose its own design size.
	# Return to desktop at the end to cover orientation changes in both directions.
	for dimensions in [Vector2i(1280,800),Vector2i(960,540),Vector2i(800,1280),Vector2i(390,844),Vector2i(1280,800)]:
		root.size = dimensions
		await process_frame
		await process_frame
		await process_frame
		var bounds := Rect2(Vector2.ZERO,scene.ui.size)
		for control in [scene.connect_panel,scene.connect_button,scene.skill_button,scene.dash_button,scene.attack_button,scene.status_label,scene.ready_button,scene.labels.phase,scene.labels.hint,scene.notice,scene.ui.get_node("ServerButton"),scene.ui.get_node("SoundButton")]:
			var rect: Rect2 = control.get_global_rect()
			if not bounds.encloses(rect):
				push_error("HUD outside viewport %s: %s %s" % [dimensions,control.name,rect])
				quit(1)
				return
		var pixel_scale: float = float(dimensions.y)/scene.ui.size.y
		if dimensions == Vector2i(390,844):
			assert(root.content_scale_size == Vector2i(640,960),"Portrait must switch to a readable design size")
			assert(scene.connect_button.size.y*pixel_scale >= 32,"Portrait JOIN target is too small")
			assert(not scene.notice.get_global_rect().intersects(scene.labels.controls.get_global_rect()),"Portrait notice covers the controls hint")
			assert(not scene.notice.get_global_rect().intersects(scene.ready_button.get_global_rect()),"Portrait notice covers rematch")
			for button in [scene.attack_button,scene.skill_button,scene.dash_button]:
				assert(button.size.y*pixel_scale >= 40,"Portrait action target is too small")
			print("PASS portrait target heights JOIN=",scene.connect_button.size.y*pixel_scale," action=",scene.attack_button.size.y*pixel_scale)
		if dimensions == Vector2i(1280,800):
			assert(root.content_scale_size == Vector2i(1280,800),"Desktop design size must be restored")
			assert(scene.connect_button.get_global_rect().get_center().is_equal_approx(Vector2(640,471)),"Browser JOIN coordinates changed")
			assert(scene.ready_button.get_global_rect().get_center().is_equal_approx(Vector2(640,608)),"Browser rematch coordinates changed")
		print("PASS actual-window layout ",dimensions," logical ",scene.ui.size)
	scene.queue_free()
	await process_frame
	await process_frame
	quit(0)
