extends SceneTree
## Logic/geometry regression. Actual post-draw visibility is a separate Web gate.

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	scene.set_process(false)
	scene.sound_on = false
	scene.session_ready = true
	scene.critical_timeline_enabled = true
	scene.clock_synced = true
	scene.clock_upper_offset = 0.0
	scene.snap = {"tick":10,"round":{"phase":"playing","number":1},"players":[],"projectiles":[]}
	var now: float = scene._network_now()
	var cue := {"id":"t-test","owner":"p2","x":0.0,"z":0.0,"dx":1.0,"dz":0.0,"expires_at":now+0.4}
	var packet := {"type":"critical_timeline","seq":1,"tick":10,"server_time":now,"round_number":1,"phase":"playing","telegraphs":[cue],"dashes":[]}
	scene._packet(packet)
	scene._render_effects()
	assert(scene.effects.has("tt-test"),"Unexpired critical warning was not created")
	assert(scene.critical_sequence == 1 and scene._playing())
	print("PASS active critical warning is independent of ordinary snapshot content")

	var older := packet.duplicate(true)
	older.seq = 0
	older.phase = "finished"
	older.telegraphs = []
	scene._packet(older)
	assert(scene.critical_sequence == 1 and scene.critical_state.phase == "playing")
	print("PASS stale critical sequence cannot replace newer state")

	scene.clock_upper_offset = 1.0
	scene._render_effects()
	assert(not scene.effects.has("tt-test"),"Expired warning remained in the render set")
	var expired := packet.duplicate(true)
	expired.seq = 2
	scene._packet(expired)
	scene._render_effects()
	assert(not scene.effects.has("tt-test"),"Late packet replayed an expired warning")
	assert(scene.visual_evidence.expired_cues_skipped > 0)
	print("PASS expired and delayed warnings never replay")

	scene.clock_upper_offset = 0.0
	var resumed := packet.duplicate(true)
	resumed.seq = 3
	resumed.telegraphs[0].expires_at = scene._network_now()+0.4
	scene._packet(resumed)
	scene._render_effects()
	assert(scene.effects.has("tt-test"))
	var paused := resumed.duplicate(true)
	paused.seq = 4
	paused.phase = "paused"
	paused.telegraphs = []
	scene._packet(paused)
	scene._render_effects()
	assert(not scene.effects.has("tt-test") and not scene._playing())
	print("PASS pause clears warning geometry and combat input")

	var dash := {"owner":"p1","x":0.0,"z":0.0,"dx":1.0,"dz":0.0,"expires_at":scene._network_now()+0.18}
	var active := resumed.duplicate(true)
	active.seq = 5
	active.telegraphs = []
	active.dashes = [dash]
	scene._packet(active)
	assert(not scene._critical_dash("p1").is_empty())
	scene.clock_upper_offset = 1.0
	assert(scene._critical_dash("p1").is_empty(),"Expired dash was replayed")
	print("PASS dash presentation observes its authoritative expiry")

	var bad := active.duplicate(true)
	bad.seq = 6
	bad.dashes[0].expires_at = "invalid"
	scene._packet(bad)
	assert(scene.critical_sequence == 5,"Malformed critical payload changed state")
	var send_at: float = scene._network_now()-0.1
	scene._sync_clock({"server_time":50.0},send_at)
	assert(scene._server_time_upper() >= 50.15-0.001,"Clock estimate must conservatively include send-to-receive time and margin")
	print("PASS malformed cue rejection and conservative server clock bound")
	scene.queue_free()
	await process_frame
	await process_frame
	quit(0)
