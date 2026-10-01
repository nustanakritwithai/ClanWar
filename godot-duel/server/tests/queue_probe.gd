extends SceneTree
## Native WebSocketPeer packet-queue probe, not a browser/visual test.
## stability.py supplies a fresh isolated loopback server and validates the log.
## We keep poll() running for WebSocket control frames but deliberately do not
## call get_packet() for 14s (legacy) or 32s (negotiated snapshot ACK).
## Native WSLPeer stops reading when the queue is full. Web EMWSPeer does not;
## therefore this probes native queue saturation, not the Web overflow error.

const PACKET_LIMIT: int = 128
var peer: WebSocketPeer = WebSocketPeer.new()
var url: String = ""
var ack_mode: bool = false
var stage: String = "connecting"
var started: float = 0.0
var stall_started: float = 0.0
var recovery_started: float = 0.0
var initial_tick: int = -1
var queued_tick: int = -1
var queued_server_time: float = 0.0
var max_queued_packets: int = 0
var stall_seconds: float = 0.0
var welcomed: bool = false
var done: bool = false
var drained_snapshots: int = 0
var last_drained_tick: int = -1

func _initialize() -> void:
	Engine.max_fps = 120
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--url="):
			url = argument.trim_prefix("--url=")
		elif argument == "--ack":
			ack_mode = true
	if not url.begins_with("ws://127.0.0.1:"):
		_finish(false, "An explicit isolated loopback URL is required")
		return
	peer.max_queued_packets = PACKET_LIMIT
	# Make packet count, rather than byte count, the reproducing bound.
	peer.inbound_buffer_size = 1024 * 1024
	peer.outbound_buffer_size = 65536
	started = _now()
	var result: int = peer.connect_to_url(url)
	if result != OK:
		_finish(false, "connect_to_url failed: %d" % result)

func _process(_delta: float) -> bool:
	if done:
		return false
	if stage == "stall":
		max_queued_packets = maxi(max_queued_packets, peer.get_available_packet_count())
	peer.poll()
	if stage == "stall":
		max_queued_packets = maxi(max_queued_packets, peer.get_available_packet_count())
	var state: int = peer.get_ready_state()
	if state == WebSocketPeer.STATE_CLOSED:
		_finish(false, "Unexpected WebSocket closure during %s" % stage)
		return false
	if _now() - started > 40.0:
		_finish(false, "Native probe deadline exceeded")
		return false
	if state != WebSocketPeer.STATE_OPEN:
		return false
	if stage == "connecting":
		var hello: Dictionary = {"type": "hello", "name": "Native queue probe"}
		if ack_mode:
			hello.snapshot_ack = true
		peer.send_text(JSON.stringify(hello))
		stage = "warmup"
	if stage == "stall":
		var target: float = 32.0 if ack_mode else 14.0
		if _now() - stall_started < target:
			return false
		stall_seconds = _now() - stall_started
		if not ack_mode:
			if max_queued_packets != PACKET_LIMIT or peer.get_available_packet_count() != PACKET_LIMIT:
				_finish(false, "Legacy queue did not saturate at 128 packets")
				return false
			# The ping response is a stream barrier after all already-sent
			# snapshots, including those held below native WSLPeer's queue.
			peer.send_text(JSON.stringify({"type": "ping"}))
			recovery_started = _now()
			stage = "legacy_recovery"
		else:
			if max_queued_packets != 1 or peer.get_available_packet_count() != 1:
				_finish(false, "ACK transport queued %d packets instead of one" % max_queued_packets)
				return false
			var message: Dictionary = _packet()
			if String(message.get("type", "")) != "snapshot":
				_finish(false, "The sole queued packet was not a snapshot")
				return false
			queued_tick = int(message.tick)
			queued_server_time = float(message.server_time)
			if queued_tick <= initial_tick or queued_tick - initial_tick > 4:
				_finish(false, "In-flight snapshot was not the first post-ACK state")
				return false
			_ack(queued_tick)
			recovery_started = _now()
			stage = "recovery"
	while peer.get_available_packet_count() > 0 and not done:
		var message: Dictionary = _packet()
		var kind: String = String(message.get("type", ""))
		if kind == "welcome":
			welcomed = true
			if ack_mode and message.get("snapshot_ack", false) != true:
				_finish(false, "Server did not negotiate snapshot ACKs")
				return false
		elif kind == "snapshot" and stage == "warmup":
			if not welcomed:
				_finish(false, "Snapshot arrived before welcome")
				return false
			initial_tick = int(message.tick)
			if ack_mode:
				_ack(initial_tick)
			stall_started = _now()
			stage = "stall"
			return false
		elif kind == "snapshot" and stage == "recovery":
			var tick_jump: int = int(message.tick) - queued_tick
			var time_jump: float = float(message.server_time) - queued_server_time
			var latency: float = _now() - recovery_started
			var valid: bool = tick_jump >= 18.0 * stall_seconds and time_jump >= stall_seconds - 0.3 and latency < 1.0
			_finish(valid, "ACK queue remained bounded and resumed at current state" if valid else "ACK recovery was stale or too slow", {
				"recovery_tick_jump": tick_jump,
				"recovery_state_seconds": time_jump,
				"recovery_latency_seconds": latency,
			})
		elif kind == "snapshot" and stage == "legacy_recovery":
			var snapshot_tick: int = int(message.tick)
			if last_drained_tick >= 0 and snapshot_tick - last_drained_tick != 2:
				_finish(false, "Legacy backlog lost or reordered snapshot ticks")
				return false
			last_drained_tick = snapshot_tick
			drained_snapshots += 1
		elif kind == "pong" and stage == "legacy_recovery":
			var valid: bool = drained_snapshots > PACKET_LIMIT and drained_snapshots >= 9.0 * stall_seconds and drained_snapshots <= 11.0 * stall_seconds + 2.0
			_finish(valid, "Native queue saturated and replayed stale snapshots" if valid else "Legacy backlog count was unexpected", {
				"drained_snapshots": drained_snapshots,
				"native_overflow_error_reproduced": false,
				"connection_remained_open": true,
			})
	if stage in ["recovery", "legacy_recovery"] and _now() - recovery_started > 2.0:
		_finish(false, "ACK did not resume snapshots")
	return false

func _packet() -> Dictionary:
	var parsed: Variant = JSON.parse_string(peer.get_packet().get_string_from_utf8())
	return parsed if parsed is Dictionary else {}

func _ack(snapshot_tick: int) -> void:
	peer.send_text(JSON.stringify({"type": "snapshot_ack", "tick": snapshot_tick}))

func _now() -> float:
	return float(Time.get_ticks_msec()) / 1000.0

func _finish(passed: bool, reason: String, extra: Dictionary = {}) -> void:
	if done:
		return
	done = true
	var result: Dictionary = {
		"status": "passed" if passed else "failed",
		"mode": "ack" if ack_mode else "legacy",
		"reason": reason,
		"packet_limit": PACKET_LIMIT,
		"max_queued_packets": max_queued_packets,
		"stall_seconds": stall_seconds,
		"initial_tick": initial_tick,
		"queued_tick": queued_tick,
	}
	result.merge(extra)
	print("QUEUE_PROBE_RESULT " + JSON.stringify(result))
	if peer.get_ready_state() == WebSocketPeer.STATE_OPEN:
		peer.close()
	quit(0 if passed else 1)
