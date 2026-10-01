extends SceneTree
## Lantern Vale: server-authoritative local PvP arena.
## Run: godot --headless --path . --script scripts/server.gd -- --port=9080 --bind=127.0.0.1

const STEP: float = 0.05
const SPEED: float = 4.5
const MAX_HP: int = 100
const MELEE_RANGE: float = 2.0
const MELEE_COOLDOWN: float = 0.65
const MELEE_DAMAGE: int = 14
const SKILL_COOLDOWN: float = 3.0
const TELEGRAPH_DURATION: float = 0.4
const PROJECTILE_SPEED: float = 9.0
const PROJECTILE_RADIUS: float = 0.8
const PROJECTILE_DAMAGE: int = 24
const DASH_COOLDOWN: float = 4.0
const DASH_DURATION: float = 0.18
const DASH_DISTANCE: float = 3.0
const RECONNECT_GRACE: float = 6.0
const SESSION_TTL: float = 60.0
const MAX_MESSAGE_BYTES: int = 1024
const MAX_CONNECTIONS: int = 16
const MAX_PLAYERS: int = 2

var listener: TCPServer = TCPServer.new()
var connections: Dictionary = {}
var players: Dictionary = {}
var projectiles: Dictionary = {}
var telegraphs: Dictionary = {}
var next_connection: int = 1
var next_player: int = 1
var next_effect: int = 1
var accumulator: float = 0.0
var tick: int = 0
var game_time: float = 0.0
var phase: String = "waiting"
var paused_phase: String = "playing"
var pause_started: float = 0.0
var countdown: float = 0.0
var round_number: int = 0
var winner: String = ""
var finish_reason: String = ""
var bind_address: String = "127.0.0.1"
var port: int = 9080

func _initialize() -> void:
	Engine.max_fps = 120
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--port="):
			port = int(arg.trim_prefix("--port="))
		elif arg.begins_with("--bind="):
			bind_address = arg.trim_prefix("--bind=")
	# This prototype intentionally does not expose a public unauthenticated server.
	if bind_address not in ["127.0.0.1", "localhost", "::1"]:
		push_error("Only loopback binding is supported by this local prototype.")
		quit(2)
		return
	if port < 1024 or port > 65535:
		push_error("Port must be between 1024 and 65535.")
		quit(2)
		return
	var result: int = listener.listen(port, bind_address)
	if result != OK:
		push_error("Could not listen on %s:%d (error %d)" % [bind_address, port, result])
		quit(2)
		return
	print("LANTERN_ARENA_READY ws://%s:%d | simulation 20Hz | snapshots 10Hz" % [bind_address, port])

func _process(delta: float) -> bool:
	_accept_connections()
	_poll_connections()
	accumulator += minf(delta, 0.25)
	while accumulator >= STEP:
		accumulator -= STEP
		_simulate(STEP)
		tick += 1
		if tick % 2 == 0:
			_broadcast(_snapshot())
	return false

func _accept_connections() -> void:
	while listener.is_connection_available():
		var stream: StreamPeerTCP = listener.take_connection()
		if connections.size() >= MAX_CONNECTIONS:
			stream.disconnect_from_host()
			continue
		var peer: WebSocketPeer = WebSocketPeer.new()
		peer.inbound_buffer_size = 8192
		peer.outbound_buffer_size = 65536
		peer.max_queued_packets = 64
		peer.heartbeat_interval = 5.0
		if peer.accept_stream(stream) != OK:
			stream.disconnect_from_host()
			continue
		peer.set_no_delay(true)
		connections[next_connection] = {"peer": peer, "player_id": "", "created": _now(), "rate_time": _now(), "budget": 64.0, "closing": false}
		next_connection += 1

func _poll_connections() -> void:
	var now: float = _now()
	for cid in connections.keys():
		var connection: Dictionary = connections[cid]
		var peer: WebSocketPeer = connection.peer
		peer.poll()
		var state: int = peer.get_ready_state()
		if state == WebSocketPeer.STATE_CLOSED:
			_disconnect(cid)
			continue
		if state != WebSocketPeer.STATE_OPEN:
			if now - float(connection.created) > 10.0:
				peer.close(-1)
				_disconnect(cid)
			continue
		if bool(connection.closing):
			continue
		if String(connection.player_id).is_empty() and now - float(connection.created) > 10.0:
			_close(connection, "hello_timeout", 1008)
			continue
		connection.budget = minf(64.0, float(connection.budget) + (now - float(connection.rate_time)) * 40.0)
		connection.rate_time = now
		var processed: int = 0
		while peer.get_available_packet_count() > 0 and processed < 64 and not bool(connection.closing):
			processed += 1
			var packet: PackedByteArray = peer.get_packet()
			connection.budget = float(connection.budget) - 1.0
			if float(connection.budget) < 0.0:
				_close(connection, "rate_limit", 1008)
				break
			if packet.size() > MAX_MESSAGE_BYTES:
				_close(connection, "packet_too_large", 1009)
				break
			if not peer.was_string_packet():
				_error(connection, "text_required")
				continue
			var parser: JSON = JSON.new()
			if parser.parse(packet.get_string_from_utf8()) != OK or not parser.data is Dictionary:
				_error(connection, "invalid_json")
				continue
			_handle(connection, parser.data)

func _handle(connection: Dictionary, message: Dictionary) -> void:
	if not message.get("type") is String:
		_error(connection, "invalid_type")
		return
	var action: String = message.type
	if action == "hello":
		_hello(connection, message)
		return
	var pid: String = connection.player_id
	if pid.is_empty() or not players.has(pid):
		_error(connection, "hello_required")
		return
	if action == "ping":
		_send(connection, {"type": "pong", "tick": tick, "server_time": _now()})
		return
	if action == "ready":
		if phase != "finished" and phase != "waiting":
			_error(connection, "round_not_finished")
			return
		players[pid].ready = true
		if _both_connected_and_ready():
			_start_round()
		return
	if action not in ["move", "attack", "skill", "dash"]:
		_error(connection, "unknown_type")
		return
	if phase != "playing":
		_error(connection, "round_not_playing")
		return
	var player: Dictionary = players[pid]
	if action == "move":
		if not _valid_point(message):
			_error(connection, "invalid_coordinates")
			return
		player.target = _clamp_point(Vector2(float(message.x), float(message.z)))
	elif action == "attack":
		_attack(connection, player, message)
	elif action == "skill":
		_cast_skill(connection, player, message)
	elif action == "dash":
		_dash(connection, player, message)

func _hello(connection: Dictionary, message: Dictionary) -> void:
	if not String(connection.player_id).is_empty():
		_error(connection, "already_joined")
		return
	if not message.get("name", "") is String or not message.get("resume_token", "") is String:
		_error(connection, "invalid_hello")
		return
	var resume_token: String = message.get("resume_token", "")
	var resumed: bool = false
	var pid: String = ""
	if not resume_token.is_empty():
		for key in players:
			if String(players[key].token) == resume_token:
				if bool(players[key].connected):
					_error(connection, "token_in_use")
					return
				if _now() - float(players[key].disconnected_at) <= SESSION_TTL:
					pid = key
					resumed = true
				break
		if pid.is_empty():
			_error(connection, "invalid_resume_token")
			return
	else:
		_purge_expired_sessions()
		if players.size() >= MAX_PLAYERS:
			_close(connection, "arena_full", 1008)
			return
		pid = "p%d" % next_player
		next_player += 1
		var name_text: String = _clean_name(String(message.get("name", "Duelist")))
		var crypto: Crypto = Crypto.new()
		var spawn: Vector2 = Vector2(-6.0 if players.is_empty() else 6.0, 0.0)
		players[pid] = {"id": pid, "name": name_text, "pos": spawn, "target": spawn,
			"hp": MAX_HP, "max_hp": MAX_HP, "wins": 0, "attack_seq": 0,
			"skill_until": 0.0, "dash_until": 0.0, "attack_until": 0.0,
			"dash_remaining": 0.0, "dash_dir": Vector2.ZERO,
			"connected": true, "ready": true, "token": crypto.generate_random_bytes(24).hex_encode(), "disconnected_at": 0.0}
	connection.player_id = pid
	players[pid].connected = true
	players[pid].disconnected_at = 0.0
	_send(connection, {"type": "welcome", "id": pid, "token": players[pid].token, "resumed": resumed, "tick_rate": 20, "snapshot_rate": 10})
	if phase == "paused" and _all_connected():
		phase = paused_phase
		_event("resume", "Both duelists are back. The round resumes.")
	elif phase == "waiting" and _both_connected_and_ready():
		_start_round()
	_event("join", "%s %s" % [players[pid].name, "reconnected." if resumed else "entered the arena."], {"player": pid})
	_send(connection, _snapshot())

func _attack(connection: Dictionary, player: Dictionary, message: Dictionary) -> void:
	if not message.get("target") is String:
		_error(connection, "invalid_target")
		return
	var target_id: String = message.target
	if target_id == String(player.id) or not players.has(target_id) or not bool(players[target_id].connected):
		_error(connection, "invalid_target")
		return
	if game_time + 0.000001 < float(player.attack_until):
		_error(connection, "attack_cooldown")
		return
	var target: Dictionary = players[target_id]
	if Vector2(player.pos).distance_to(Vector2(target.pos)) > MELEE_RANGE:
		_error(connection, "out_of_range")
		return
	player.attack_until = game_time + MELEE_COOLDOWN
	player.attack_seq = int(player.attack_seq) + 1
	_event("attack", "%s strikes!" % player.name, {"player": player.id, "target": target_id})
	if float(target.dash_remaining) > 0.0:
		_event("dodge", "%s evades the strike." % target.name, {"player": target_id})
	else:
		_damage(String(player.id), target_id, MELEE_DAMAGE, "melee")

func _cast_skill(connection: Dictionary, player: Dictionary, message: Dictionary) -> void:
	if not _valid_point(message):
		_error(connection, "invalid_coordinates")
		return
	if game_time + 0.000001 < float(player.skill_until):
		_error(connection, "skill_cooldown")
		return
	var direction: Vector2 = Vector2(float(message.x), float(message.z)) - Vector2(player.pos)
	if direction.length_squared() < 0.0001:
		_error(connection, "invalid_direction")
		return
	direction = direction.normalized()
	player.skill_until = game_time + SKILL_COOLDOWN
	var eid: String = "t%d" % next_effect
	next_effect += 1
	telegraphs[eid] = {"id": eid, "owner": player.id, "pos": player.pos, "dir": direction, "remaining": TELEGRAPH_DURATION}
	_event("cast", "%s channels an aether bolt." % player.name, {"player": player.id})

func _dash(connection: Dictionary, player: Dictionary, message: Dictionary) -> void:
	if not _valid_point(message):
		_error(connection, "invalid_coordinates")
		return
	if game_time + 0.000001 < float(player.dash_until):
		_error(connection, "dash_cooldown")
		return
	var direction: Vector2 = Vector2(float(message.x), float(message.z)) - Vector2(player.pos)
	if direction.length_squared() < 0.0001:
		_error(connection, "invalid_direction")
		return
	player.dash_dir = direction.normalized()
	player.dash_remaining = DASH_DURATION
	player.dash_until = game_time + DASH_COOLDOWN
	player.target = _clamp_point(Vector2(player.pos) + Vector2(player.dash_dir) * DASH_DISTANCE)
	_event("dash", "%s dashes." % player.name, {"player": player.id})

func _simulate(dt: float) -> void:
	_purge_expired_sessions()
	if phase == "paused":
		if _now() - pause_started >= RECONNECT_GRACE:
			var survivor: String = ""
			for pid in players:
				if bool(players[pid].connected):
					survivor = pid
			_finish_round(survivor, "disconnect" if not survivor.is_empty() else "abandoned")
		return
	if phase == "countdown":
		countdown = maxf(0.0, countdown - dt)
		if countdown <= 0.00001:
			phase = "playing"
			_event("round_start", "Duel! Hold the arena and read your rival.")
		return
	if phase != "playing":
		return
	game_time += dt
	for pid in players:
		var player: Dictionary = players[pid]
		if not bool(player.connected):
			continue
		if float(player.dash_remaining) > 0.0:
			var dash_step: float = minf(dt, float(player.dash_remaining))
			player.pos = _clamp_point(Vector2(player.pos) + Vector2(player.dash_dir) * (DASH_DISTANCE / DASH_DURATION) * dash_step)
			player.dash_remaining = maxf(0.0, float(player.dash_remaining) - dt)
		else:
			player.pos = Vector2(player.pos).move_toward(Vector2(player.target), SPEED * dt)
	for eid in telegraphs.keys():
		var effect: Dictionary = telegraphs[eid]
		effect.remaining = float(effect.remaining) - dt
		if float(effect.remaining) <= 0.00001:
			var projectile_id: String = "b%d" % next_effect
			next_effect += 1
			projectiles[projectile_id] = {"id": projectile_id, "owner": effect.owner, "pos": effect.pos, "dir": effect.dir, "life": 3.5}
			telegraphs.erase(eid)
	for eid in projectiles.keys():
		if not projectiles.has(eid) or phase != "playing":
			break
		var bolt: Dictionary = projectiles[eid]
		var previous: Vector2 = bolt.pos
		bolt.pos = previous + Vector2(bolt.dir) * PROJECTILE_SPEED * dt
		bolt.life = float(bolt.life) - dt
		var hit: bool = false
		for pid in players:
			var target: Dictionary = players[pid]
			if pid == bolt.owner or not bool(target.connected) or float(target.dash_remaining) > 0.0:
				continue
			if _segment_distance(Vector2(target.pos), previous, Vector2(bolt.pos)) <= PROJECTILE_RADIUS:
				hit = true
				_damage(String(bolt.owner), String(pid), PROJECTILE_DAMAGE, "bolt")
				break
		if hit or float(bolt.life) <= 0.0 or absf(Vector2(bolt.pos).x) > 11.0 or absf(Vector2(bolt.pos).y) > 8.0:
			projectiles.erase(eid)

func _damage(attacker: String, target_id: String, amount: int, source: String) -> void:
	if phase != "playing" or not players.has(target_id):
		return
	players[target_id].hp = maxi(0, int(players[target_id].hp) - amount)
	_event("hit", "%s hits %s for %d." % [players[attacker].name, players[target_id].name, amount], {"player": attacker, "target": target_id, "amount": amount, "source": source})
	if int(players[target_id].hp) == 0:
		_finish_round(attacker, "knockout")

func _start_round() -> void:
	round_number += 1
	phase = "countdown"
	countdown = 3.0
	game_time = 0.0
	winner = ""
	finish_reason = ""
	projectiles.clear()
	telegraphs.clear()
	var slot: int = 0
	for pid in players:
		var player: Dictionary = players[pid]
		# Swap ends each round to avoid a persistent side advantage.
		var left_side: bool = (slot + round_number) % 2 == 1
		var spawn: Vector2 = Vector2(-6.0 if left_side else 6.0, 0.0)
		player.pos = spawn
		player.target = spawn
		player.hp = MAX_HP
		player.attack_until = 0.0
		player.skill_until = 0.0
		player.dash_until = 0.0
		player.dash_remaining = 0.0
		player.ready = false
		slot += 1
	_event("countdown", "Round %d begins in 3 seconds." % round_number)

func _finish_round(winner_id: String, reason: String) -> void:
	if phase == "finished":
		return
	phase = "finished"
	winner = winner_id
	finish_reason = reason
	countdown = 0.0
	projectiles.clear()
	telegraphs.clear()
	for pid in players:
		players[pid].target = players[pid].pos
		players[pid].dash_remaining = 0.0
		players[pid].ready = false
	if players.has(winner_id):
		players[winner_id].wins = int(players[winner_id].wins) + 1
		_event("round_end", "%s wins! Both players can ready up for a rematch." % players[winner_id].name, {"winner": winner_id, "reason": reason})
	else:
		_event("round_end", "Round abandoned. Both players can ready up for a rematch.", {"winner": "", "reason": reason})

func _disconnect(cid: int) -> void:
	if not connections.has(cid):
		return
	var connection: Dictionary = connections[cid]
	var pid: String = connection.player_id
	connections.erase(cid)
	if pid.is_empty() or not players.has(pid):
		return
	players[pid].connected = false
	players[pid].disconnected_at = _now()
	players[pid].target = players[pid].pos
	if phase in ["playing", "countdown"]:
		paused_phase = phase
		phase = "paused"
		pause_started = _now()
		_event("pause", "Connection interrupted. Waiting up to 6 seconds for reconnection.", {"player": pid})

func _purge_expired_sessions() -> void:
	var removed: bool = false
	for pid in players.keys():
		if not bool(players[pid].connected) and _now() - float(players[pid].disconnected_at) > SESSION_TTL:
			players.erase(pid)
			removed = true
	if removed and players.size() < 2:
		phase = "waiting"
		winner = ""
		finish_reason = ""
		countdown = 0.0
		projectiles.clear()
		telegraphs.clear()
		for pid in players:
			players[pid].ready = true

func _snapshot() -> Dictionary:
	var public_players: Array = []
	for pid in players:
		var player: Dictionary = players[pid]
		public_players.append({"id": player.id, "name": player.name, "x": Vector2(player.pos).x, "z": Vector2(player.pos).y,
			"hp": player.hp, "max_hp": player.max_hp, "wins": player.wins, "attack_seq": player.attack_seq,
			"skill_cd": maxf(0.0, float(player.skill_until) - game_time), "dash_cd": maxf(0.0, float(player.dash_until) - game_time),
			"attack_cd": maxf(0.0, float(player.attack_until) - game_time), "dashing": float(player.dash_remaining) > 0.0,
			"connected": player.connected, "ready": player.ready})
	var public_bolts: Array = []
	for eid in projectiles:
		var bolt: Dictionary = projectiles[eid]
		public_bolts.append({"id": bolt.id, "owner": bolt.owner, "x": Vector2(bolt.pos).x, "z": Vector2(bolt.pos).y, "dx": Vector2(bolt.dir).x, "dz": Vector2(bolt.dir).y})
	var public_telegraphs: Array = []
	for eid in telegraphs:
		var effect: Dictionary = telegraphs[eid]
		public_telegraphs.append({"id": effect.id, "owner": effect.owner, "x": Vector2(effect.pos).x, "z": Vector2(effect.pos).y,
			"dx": Vector2(effect.dir).x, "dz": Vector2(effect.dir).y, "remaining": maxf(0.0, float(effect.remaining))})
	return {"type": "snapshot", "tick": tick, "server_time": _now(), "players": public_players, "projectiles": public_bolts, "telegraphs": public_telegraphs,
		"round": {"phase": phase, "winner": winner, "number": round_number, "countdown": countdown, "reason": finish_reason},
		"world": {"bounds": {"min_x": -10, "max_x": 10, "min_z": -7, "max_z": 7}}}

func _both_connected_and_ready() -> bool:
	if players.size() != 2:
		return false
	for pid in players:
		if not bool(players[pid].connected) or not bool(players[pid].ready):
			return false
	return true

func _all_connected() -> bool:
	if players.size() != 2:
		return false
	for pid in players:
		if not bool(players[pid].connected):
			return false
	return true

func _valid_point(message: Dictionary) -> bool:
	for axis in ["x", "z"]:
		var value: Variant = message.get(axis)
		if not (value is int or value is float) or not is_finite(float(value)) or absf(float(value)) > 1000000.0:
			return false
	return true

func _clamp_point(point: Vector2) -> Vector2:
	return Vector2(clampf(point.x, -10.0, 10.0), clampf(point.y, -7.0, 7.0))

func _segment_distance(point: Vector2, start: Vector2, end: Vector2) -> float:
	var segment: Vector2 = end - start
	if segment.length_squared() < 0.000001:
		return point.distance_to(start)
	var fraction: float = clampf((point - start).dot(segment) / segment.length_squared(), 0.0, 1.0)
	return point.distance_to(start + fraction * segment)

func _clean_name(value: String) -> String:
	var clean: String = ""
	for character in value.strip_edges().substr(0, 24):
		if character.unicode_at(0) >= 32 and character.unicode_at(0) != 127:
			clean += character
	return "Duelist" if clean.is_empty() else clean

func _event(kind: String, text: String, details: Dictionary = {}) -> void:
	var message: Dictionary = {"type": "event", "kind": kind, "text": text, "tick": tick}
	message.merge(details)
	_broadcast(message)

func _broadcast(message: Dictionary) -> void:
	for cid in connections:
		var connection: Dictionary = connections[cid]
		if not String(connection.player_id).is_empty():
			_send(connection, message)

func _send(connection: Dictionary, message: Dictionary) -> void:
	var peer: WebSocketPeer = connection.peer
	if peer.get_ready_state() != WebSocketPeer.STATE_OPEN or bool(connection.closing):
		return
	if peer.get_current_outbound_buffered_amount() > 49152:
		_close(connection, "slow_consumer", 1008)
		return
	peer.send_text(JSON.stringify(message))

func _error(connection: Dictionary, reason: String) -> void:
	_send(connection, {"type": "error", "reason": reason})

func _close(connection: Dictionary, reason: String, code: int) -> void:
	var peer: WebSocketPeer = connection.peer
	# Do not recurse through _send if the outgoing buffer is already full.
	if peer.get_ready_state() == WebSocketPeer.STATE_OPEN and peer.get_current_outbound_buffered_amount() < 49152:
		peer.send_text(JSON.stringify({"type": "error", "reason": reason}))
	connection.closing = true
	peer.close(code, reason)

func _now() -> float:
	return float(Time.get_ticks_msec()) / 1000.0

func _finalize() -> void:
	listener.stop()
	for cid in connections:
		var peer: WebSocketPeer = connections[cid].peer
		peer.close(-1)
