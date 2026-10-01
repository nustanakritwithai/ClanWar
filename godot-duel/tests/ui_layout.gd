extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	for dimensions in [Vector2i(1280,800),Vector2i(960,540),Vector2i(800,1280)]:
		root.content_scale_size = dimensions
		root.size = dimensions
		await process_frame
		scene._resize()
		await process_frame
		var bounds := Rect2(Vector2.ZERO,scene.ui.size)
		for control in [scene.connect_panel,scene.connect_button,scene.skill_button,scene.dash_button,scene.attack_button,scene.status_label,scene.ready_button]:
			var rect: Rect2 = control.get_global_rect()
			if not bounds.encloses(rect):
				push_error("HUD outside viewport %s: %s %s" % [dimensions,control.name,rect])
				quit(1)
				return
		print("PASS layout ",dimensions)
	scene.queue_free()
	await process_frame
	await process_frame
	quit(0)
