extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	# Logic-only test: avoid audio mixing during immediate headless teardown.
	scene.sound_on = false
	scene.self_id = "p1"
	var players := [{"id":"p1","hp":100,"x":0,"z":0},{"id":"p2","hp":100,"x":1,"z":0}]
	scene._packet({"type":"snapshot","players":players,"round":{"phase":"finished"}})
	scene._attack_nearest()
	scene._arm("skill")
	assert(scene.target_id.is_empty() and scene.aim_mode.is_empty(),"Finished round must not queue combat input")
	print("PASS finished round rejects keyboard targeting and aim")
	scene._packet({"type":"snapshot","players":players,"round":{"phase":"playing"}})
	scene._attack_nearest()
	assert(scene.target_id == "p2")
	scene._arm("skill")
	assert(scene.aim_mode == "skill")
	scene._packet({"type":"snapshot","players":players,"round":{"phase":"countdown"}})
	assert(scene.target_id.is_empty() and scene.aim_mode.is_empty(),"New round must clear old targeting")
	print("PASS rematch clears prior combat intent")
	scene.token = "expired-test-token"
	scene._packet({"type":"error","reason":"invalid_resume_token"})
	assert(scene.token.is_empty(),"Expired token must be cleared for reconnect")
	print("PASS stale resume token recovery")
	scene.queue_free()
	await process_frame
	await process_frame
	quit(0)
