extends SceneTree
func _initialize():
	call_deferred("run")
func run():
	var scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	var b = scene.ui.get_node("ServerButton")
	b.pressed.connect(func(): b.set_meta("clicked",true))
	print("root ",root.size," view ",root.get_visible_rect()," button ",b.get_global_rect()," ui ",scene.ui.get_global_rect())
	var p = b.get_global_rect().get_center()
	var move = InputEventMouseMotion.new()
	move.position = p
	move.global_position = p
	root.push_input(move,true)
	for pressed in [true,false]:
		var e = InputEventMouseButton.new()
		e.position = p
		e.global_position = p
		e.button_index = MOUSE_BUTTON_LEFT
		e.pressed = pressed
		root.push_input(e,true)
		await process_frame
	print("CLICKED ", b.get_meta("clicked",false)," hover ",root.gui_get_hovered_control())
	quit(0 if b.get_meta("clicked",false) else 1)
