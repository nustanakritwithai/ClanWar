extends Node3D
## Presentation + input only. All authoritative state comes from the WebSocket server.
const Arena = preload("res://scripts/arena.gd")
const HERO = preload("res://assets/duelist.svg")
var socket := WebSocketPeer.new()
var hello_sent := false
var self_id := ""
var token := ""
var endpoint := "wss://157.85.96.139/clanwar/ws"
var nickname := "Wanderer"
var active_connection := false
var reconnect_in := 0.0
var retry_delay := 1.0
var retrying := false
var time_since_snapshot := 0.0
var snap: Dictionary = {}
var avatars: Dictionary = {}
var effects: Dictionary = {}
var labels: Dictionary = {}
var health_bars: Array[ProgressBar] = []
var arena: Node3D
var camera: Camera3D
var ui: Control
var connect_panel: PanelContainer
var server_input: LineEdit
var name_input: LineEdit
var connect_button: Button
var skill_button: Button
var dash_button: Button
var attack_button: Button
var ready_button: Button
var status_label: Label
var notice: Label
var aim_mode := ""
var target_id := ""
var aim_point := Vector3.ZERO
var destination_marker: MeshInstance3D
var marker_time := 0.0
var walk_timer := 0.0
var autoattack_timer := 0.0
var clock_time := 0.0
var notice_timer := 0.0
var last_phase := ""
var qa_screenshot := ""
var qa_capture_in := 0.0
var debug_labels := false
var aim_guide: MeshInstance3D
var audio_players: Dictionary = {}
var sound_on := true

func _ready() -> void:
	arena = Arena.new()
	add_child(arena)
	camera = Camera3D.new()
	add_child(camera)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 26
	camera.position = Vector3(16,24,21)
	camera.look_at(Vector3(0,0,0))
	camera.current = true
	camera.far = 100
	destination_marker = arena.ring(Vector3(0,-5,0),0.38,0.045,"e7ddaf")
	destination_marker.visible = false
	aim_guide = arena.box(Vector3(0,-5,0),Vector3(.12,.03,10),"f1d89b")
	aim_guide.visible = false
	_parse_args()
	_build_ui()
	_build_audio()
	get_viewport().size_changed.connect(_resize)
	_resize()
	if OS.has_feature("web"):
		var js_server = JavaScriptBridge.eval("new URLSearchParams(location.search).get('server') || ''")
		var js_name = JavaScriptBridge.eval("new URLSearchParams(location.search).get('name') || ''")
		if js_server is String and not js_server.is_empty(): endpoint = js_server
		if js_name is String and not js_name.is_empty(): nickname = js_name.substr(0,18)
		server_input.text = endpoint
		name_input.text = nickname
	if "--autoconnect" in OS.get_cmdline_user_args(): _join()

func _parse_args() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--server="): endpoint = arg.trim_prefix("--server=")
		if arg.begins_with("--name="): nickname = arg.trim_prefix("--name=")
		if arg.begins_with("--screenshot="):
			qa_screenshot = arg.trim_prefix("--screenshot=")
			qa_capture_in = 8.0

func _build_audio() -> void:
	for sound in ["slash","bolt","hit","win","dash"]:
		var path: String = "res://assets/"+sound+".wav"
		if ResourceLoader.exists(path):
			var a := AudioStreamPlayer.new()
			a.stream = load(path)
			a.volume_db = -17
			add_child(a)
			audio_players[sound] = a

func _sound(key: String) -> void:
	if sound_on and audio_players.has(key): audio_players[key].play()

func _process(delta: float) -> void:
	clock_time += delta
	_poll_network(delta)
	_render_players(delta)
	_render_effects()
	_update_ui(delta)
	_update_inputs(delta)
	if marker_time > 0:
		marker_time -= delta
		destination_marker.visible = marker_time > 0
		destination_marker.scale = Vector3.ONE * (1.0+sin(clock_time*9)*.12)
	if notice_timer > 0:
		notice_timer -= delta
		notice.modulate.a = minf(notice_timer*2,1.0)
	if qa_capture_in > 0:
		qa_capture_in -= delta
		if qa_capture_in <= 0 and not qa_screenshot.is_empty():
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png(qa_screenshot)

func _poll_network(delta: float) -> void:
	if not active_connection: return
	time_since_snapshot += delta
	socket.poll()
	var state := socket.get_ready_state()
	if state == WebSocketPeer.STATE_OPEN:
		if not hello_sent:
			hello_sent = true
			_send({"type":"hello","name":nickname,"resume_token":token})
		while socket.get_available_packet_count() > 0:
			var packet = JSON.parse_string(socket.get_packet().get_string_from_utf8())
			if packet is Dictionary: _packet(packet)
		if time_since_snapshot > 5:
			status_label.text = "CONNECTION DELAYED"
	elif state == WebSocketPeer.STATE_CLOSED:
		if not retrying:
			retrying = true
			reconnect_in = retry_delay
			retry_delay = minf(retry_delay*1.7,8)
			target_id = ""
			_show_notice("Connection lost. Reconnecting to the arena…",3)
		reconnect_in -= delta
		if reconnect_in <= 0: _connect_socket()

func _connect_socket() -> void:
	socket = WebSocketPeer.new()
	socket.inbound_buffer_size = 1048576
	socket.outbound_buffer_size = 65536
	socket.max_queued_packets = 128
	var err := socket.connect_to_url(endpoint)
	hello_sent = false
	retrying = false
	time_since_snapshot = 0
	if err != OK:
		_show_notice("Cannot open that server address. Use ws:// or wss://",5)
		active_connection = false
		connect_panel.show()

func _join() -> void:
	var new_endpoint := server_input.text.strip_edges()
	if not (new_endpoint.begins_with("ws://") or new_endpoint.begins_with("wss://")):
		_show_notice("Server address must begin with ws:// or wss://",4)
		return
	if OS.has_feature("web") and bool(JavaScriptBridge.eval("location.protocol === 'https:'")) and not new_endpoint.begins_with("wss://"):
		_show_notice("This HTTPS page needs a secure wss:// game server",5)
		return
	if endpoint != new_endpoint: token = ""
	endpoint = new_endpoint
	nickname = name_input.text.strip_edges().substr(0,18)
	if nickname.is_empty(): nickname = "Wanderer"
	if socket.get_ready_state() == WebSocketPeer.STATE_OPEN: socket.close()
	active_connection = true
	retry_delay = 1
	connect_panel.hide()
	_connect_socket()
	_show_notice("Joining the duel server…",4)

func _send(packet: Dictionary) -> void:
	if socket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		socket.send_text(JSON.stringify(packet))

func _packet(packet: Dictionary) -> void:
	match str(packet.get("type","")):
		"welcome":
			self_id = str(packet.get("id",""))
			token = str(packet.get("token",""))
			retry_delay = 1
			_show_notice("Rejoined the duel" if packet.get("resumed",false) else "Connected. Waiting for your rival",3)
		"snapshot":
			snap = packet
			time_since_snapshot = 0
			var phase := str(snap.get("round",{}).get("phase","waiting"))
			if phase != last_phase:
				if phase != "playing":
					target_id = ""
					aim_mode = ""
				if phase == "playing": _show_notice("DUEL! Read the cast. Time your dash.",3)
				if phase == "finished":
					_sound("win")
					target_id = ""
				last_phase = phase
		"event":
			var kind := str(packet.get("kind",""))
			if kind not in ["move","attack","hit","damage"]:
				_show_notice(str(packet.get("text","")),2.5)
		"error":
			var reason := str(packet.get("reason",""))
			if reason not in ["cooldown","attack_cooldown","skill_cooldown","dash_cooldown","out_of_range","not_playing"]:
				_show_notice(reason.replace("_"," ").capitalize(),3)
			if reason in ["server_full","arena_full"]:
				active_connection = false
				connect_panel.show()
			if reason == "invalid_resume_token":
				token = ""
				if socket.get_ready_state() == WebSocketPeer.STATE_OPEN: socket.close()
				_show_notice("Session expired. Rejoining with a fresh duel slot…",3)

func _player(id: String) -> Dictionary:
	for p in snap.get("players",[]):
		if str(p.get("id","")) == id: return p
	return {}

func _opponent() -> Dictionary:
	for p in snap.get("players",[]):
		if str(p.get("id","")) != self_id: return p
	return {}

func _playing() -> bool:
	return str(snap.get("round",{}).get("phase","")) == "playing" and time_since_snapshot < 2 and not retrying

func _make_avatar(id: String, own: bool) -> Node3D:
	var root := Node3D.new()
	add_child(root)
	var color := Color("8bcfdd") if own else Color("eda988")
	var shadow := MeshInstance3D.new()
	var disc := CylinderMesh.new()
	disc.top_radius = .48
	disc.bottom_radius = .48
	disc.height = .015
	disc.radial_segments = 24
	shadow.mesh = disc
	var sm := StandardMaterial3D.new()
	sm.albedo_color = Color(0.08,.2,.21,.55)
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	shadow.material_override = sm
	root.add_child(shadow)
	shadow.position.y = .2
	var ring_node := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = .48
	torus.outer_radius = .53
	torus.rings = 32
	torus.ring_segments = 6
	ring_node.mesh = torus
	var rm := StandardMaterial3D.new()
	rm.albedo_color = color
	rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring_node.material_override = rm
	root.add_child(ring_node)
	ring_node.position.y = .22
	ring_node.name = "Ring"
	var sprite := Sprite3D.new()
	sprite.texture = HERO
	sprite.pixel_size = .021
	sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
	sprite.modulate = color
	sprite.position.y = 1.52
	sprite.no_depth_test = false
	sprite.name = "Sprite"
	root.add_child(sprite)
	var label := Label3D.new()
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.position.y = 3.75
	label.font_size = 28
	label.pixel_size = .016
	label.outline_size = 8
	label.modulate = color
	label.name = "Name"
	root.add_child(label)
	root.set_meta("hp",100)
	root.set_meta("attack_seq",0)
	root.set_meta("swing",0.0)
	root.set_meta("flash",0.0)
	root.set_meta("last_dash",false)
	return root

func _render_players(delta: float) -> void:
	var present: Array[String] = []
	for p in snap.get("players",[]):
		var id := str(p.get("id",""))
		present.append(id)
		if not avatars.has(id):
			avatars[id] = _make_avatar(id,id==self_id)
			avatars[id].position = Vector3(float(p.x),0,float(p.z))
		var a: Node3D = avatars[id]
		var target := Vector3(float(p.x),0,float(p.z))
		var moving := a.position.distance_to(target) > .04
		var speed := 25.0 if p.get("dashing",false) else 13.0
		a.position = a.position.lerp(target,1-exp(-speed*delta))
		var sprite: Sprite3D = a.get_node("Sprite")
		var label: Label3D = a.get_node("Name")
		label.text = str(p.get("name","Duelist")) + ("  • YOU" if id==self_id else "") + "\n" + str(int(p.get("hp",100)))+" / 100"
		if not p.get("connected",true): label.text += "  [AWAY]"
		var old_hp: int = a.get_meta("hp")
		var hp := int(p.get("hp",100))
		if hp < old_hp:
			_floating_number(a.position+Vector3(0,2.2,0),old_hp-hp,id==self_id)
			a.set_meta("flash",.22)
			_sound("hit")
		a.set_meta("hp",hp)
		if int(p.get("attack_seq",0)) != int(a.get_meta("attack_seq")):
			a.set_meta("swing",.25)
			a.set_meta("attack_seq",int(p.get("attack_seq",0)))
			_sound("slash")
			_slash(a.position)
		var dashing: bool = p.get("dashing",false)
		if dashing and not bool(a.get_meta("last_dash")): _sound("dash")
		a.set_meta("last_dash",dashing)
		var swing := maxf(0,float(a.get_meta("swing"))-delta)
		var flash := maxf(0,float(a.get_meta("flash"))-delta)
		a.set_meta("swing",swing)
		a.set_meta("flash",flash)
		sprite.position.y = 1.52 + (absf(sin(clock_time*13))*.09 if moving else sin(clock_time*2)*.018)
		sprite.modulate = Color("ffffff") if flash>0 else (Color("8bcfdd") if id==self_id else Color("eda988"))
		sprite.modulate.a = .5 if dashing else (1.0 if hp>0 else .42)
		sprite.rotation.z = sin(swing*18)*.1
		if absf(target.x-a.position.x)>.04: sprite.flip_h = target.x < a.position.x
		a.get_node("Ring").scale = Vector3.ONE*(1.25 if id==target_id else 1)
	for id in avatars.keys():
		if not present.has(id):
			avatars[id].queue_free()
			avatars.erase(id)

func _floating_number(pos: Vector3, amount: int, own: bool) -> void:
	var n := Label3D.new()
	n.text = "−"+str(amount)
	n.font_size = 60
	n.pixel_size = .011
	n.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	n.outline_size = 12
	n.modulate = Color("ffbb96") if own else Color("fff0b1")
	add_child(n)
	n.position = pos
	var t := create_tween().set_parallel(true)
	t.tween_property(n,"position:y",pos.y+1.3,.8)
	t.tween_property(n,"modulate:a",0.0,.8)
	t.chain().tween_callback(n.queue_free)

func _slash(pos: Vector3) -> void:
	var r: MeshInstance3D = arena.ring(pos+Vector3(0,.45,0),1.35,.07,"ffe8ab")
	var t := create_tween()
	t.tween_property(r,"scale",Vector3(.3,.3,.3),.22)
	t.tween_callback(r.queue_free)

func _render_effects() -> void:
	var present: Array[String] = []
	for tele in snap.get("telegraphs",[]):
		var id := "t"+str(tele.id)
		present.append(id)
		if not effects.has(id):
			var beam: MeshInstance3D = arena.box(Vector3.ZERO,Vector3(.25,.02,16),"faad77")
			effects[id] = beam
		var node: MeshInstance3D = effects[id]
		var d := Vector3(float(tele.dx),0,float(tele.dz))
		node.position = Vector3(float(tele.x),.27,float(tele.z))+d*8
		node.rotation.y = atan2(d.x,d.z)
		node.scale.x = .65+sin(clock_time*40)*.35
	for bolt in snap.get("projectiles",[]):
		var id := "b"+str(bolt.id)
		present.append(id)
		if not effects.has(id):
			var sphere := MeshInstance3D.new()
			var mesh := SphereMesh.new()
			mesh.radius = .26
			mesh.height = .52
			mesh.radial_segments = 12
			mesh.rings = 6
			sphere.mesh = mesh
			sphere.material_override = arena.mat("fff1b1" if str(bolt.owner)==self_id else "ff9d77",1.5)
			add_child(sphere)
			effects[id] = sphere
			_sound("bolt")
		var n: Node3D = effects[id]
		n.position = Vector3(float(bolt.x),.75,float(bolt.z))
		n.scale = Vector3(1,1,1.7)
		n.rotation.y = atan2(float(bolt.dx),float(bolt.dz))
	for id in effects.keys():
		if not present.has(id):
			effects[id].queue_free()
			effects.erase(id)

func _ground(screen: Vector2) -> Vector3:
	var plane := Plane(Vector3.UP,.2)
	var point = plane.intersects_ray(camera.project_ray_origin(screen),camera.project_ray_normal(screen))
	if point == null: return Vector3.ZERO
	return Vector3(clampf(point.x,-10,10),.2,clampf(point.z,-7,7))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F12 and not qa_screenshot.is_empty(): qa_capture_in = .05
		if event.keycode == KEY_ESCAPE:
			aim_mode = ""
			target_id = ""
			connect_panel.visible = not connect_panel.visible
		if connect_panel.visible: return
		if event.keycode == KEY_Q: _cast("skill",_ground(get_viewport().get_mouse_position()))
		if event.keycode == KEY_SPACE: _cast("dash",_ground(get_viewport().get_mouse_position()))
		if event.keycode == KEY_E: _attack_nearest()
	if connect_panel.visible or not _playing(): return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT: _tap(event.position)
		if event.button_index == MOUSE_BUTTON_RIGHT:
			aim_mode = ""
			target_id = ""
			_move_to(_ground(event.position))

func _tap(screen: Vector2) -> void:
	var point := _ground(screen)
	if not aim_mode.is_empty():
		_cast(aim_mode,point)
		aim_mode = ""
		return
	var enemy := _opponent()
	if not enemy.is_empty():
		var ep := Vector3(float(enemy.x),1.4,float(enemy.z))
		if camera.unproject_position(ep).distance_to(screen)<52 or point.distance_to(Vector3(float(enemy.x),.2,float(enemy.z)))<.8:
			target_id = str(enemy.id)
			_show_notice("Pursuing rival • tap the floor to disengage",2)
			return
	target_id = ""
	_move_to(point)

func _move_to(point: Vector3) -> void:
	if not _playing(): return
	_send({"type":"move","x":point.x,"z":point.z})
	destination_marker.position = point+Vector3(0,.05,0)
	destination_marker.visible = true
	marker_time = 1.2

func _cast(kind: String, point: Vector3) -> void:
	if not _playing(): return
	target_id = ""
	_send({"type":kind,"x":point.x,"z":point.z})

func _arm(kind: String) -> void:
	if not _playing(): return
	aim_mode = "" if aim_mode==kind else kind
	target_id = ""
	_show_notice("Tap a direction to " + ("cast Lumen Bolt" if kind=="skill" else "dash") + " • tap the button again to cancel",4)

func _attack_nearest() -> void:
	if not _playing(): return
	var p := _opponent()
	if not p.is_empty(): target_id = str(p.id)

func _update_inputs(delta: float) -> void:
	aim_guide.visible = false
	if connect_panel.visible or not _playing(): return
	var me := _player(self_id)
	if me.is_empty(): return
	walk_timer -= delta
	autoattack_timer -= delta
	var keyboard := Vector2(float(Input.is_physical_key_pressed(KEY_D))-float(Input.is_physical_key_pressed(KEY_A)),float(Input.is_physical_key_pressed(KEY_S))-float(Input.is_physical_key_pressed(KEY_W)))
	if keyboard.length_squared()>0 and walk_timer<=0:
		walk_timer = .1
		target_id = ""
		var right := camera.global_transform.basis.x
		var forward := Vector3(camera.global_transform.basis.z.x,0,camera.global_transform.basis.z.z).normalized()
		var dir := (right*keyboard.x+forward*keyboard.y).normalized()
		_send({"type":"move","x":float(me.x)+dir.x*1.1,"z":float(me.z)+dir.z*1.1})
	if not target_id.is_empty() and autoattack_timer <= 0:
		autoattack_timer = .16
		var rival := _player(target_id)
		if not rival.is_empty():
			var mp := Vector2(float(me.x),float(me.z))
			var ep := Vector2(float(rival.x),float(rival.z))
			if mp.distance_to(ep)>1.8:
				var dest := ep+(mp-ep).normalized()*1.55
				_send({"type":"move","x":dest.x,"z":dest.y})
			else: _send({"type":"attack","target":target_id})
	if not aim_mode.is_empty():
		var mp := Vector3(float(me.x),.28,float(me.z))
		var dest := _ground(get_viewport().get_mouse_position())
		var dir := (dest-mp).normalized()
		aim_guide.visible = true
		aim_guide.position = mp+dir*3
		aim_guide.rotation.y = atan2(dir.x,dir.z)
		aim_guide.scale.z = .6

func _style(bg: String, border: String, radius: int = 12) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(bg)
	s.border_color = Color(border)
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.content_margin_left = 18
	s.content_margin_right = 18
	s.content_margin_top = 12
	s.content_margin_bottom = 12
	return s

func _label(text: String, font_size: int, color: String = "eee6ce") -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size",font_size)
	l.add_theme_color_override("font_color",Color(color))
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func _button(text: String, minsize: Vector2 = Vector2(140,56)) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = minsize
	b.add_theme_font_size_override("font_size",18)
	b.add_theme_color_override("font_color",Color("fff0cf"))
	b.add_theme_stylebox_override("normal",_style("214c59","76938b"))
	b.add_theme_stylebox_override("hover",_style("32616a","c8c99e"))
	b.add_theme_stylebox_override("pressed",_style("3a7476","f0d399"))
	b.add_theme_stylebox_override("disabled",_style("263e48","476068"))
	return b

func _build_ui() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)
	ui = Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(ui)
	var title := _label("LANTERN VALE",25,"f1d7a0")
	ui.add_child(title)
	title.position = Vector2(28,22)
	var sub := _label("D U E L   /   1 v 1",12,"a0c1bd")
	ui.add_child(sub)
	sub.position = Vector2(30,56)
	status_label = _label("OFFLINE  •  CONNECT TO PLAY",13,"9ec7c4")
	ui.add_child(status_label)
	status_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	status_label.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	status_label.position = Vector2(-355,26)
	status_label.size = Vector2(325,24)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	var settings := _button("Server",Vector2(92,38))
	settings.name = "ServerButton"
	ui.add_child(settings)
	settings.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	settings.position = Vector2(-124,58)
	settings.size = Vector2(94,38)
	settings.pressed.connect(func(): connect_panel.visible = not connect_panel.visible)
	var mute := _button("Sound on",Vector2(104,38))
	mute.name = "SoundButton"
	ui.add_child(mute)
	mute.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	mute.position = Vector2(-238,58)
	mute.size = Vector2(106,38)
	mute.pressed.connect(func(): sound_on = not sound_on; mute.text = "Sound on" if sound_on else "Sound off")
	var score := HBoxContainer.new()
	score.name = "Score"
	ui.add_child(score)
	score.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	score.position = Vector2(-283,26)
	score.add_theme_constant_override("separation",24)
	for i in range(2):
		var col := VBoxContainer.new()
		col.custom_minimum_size = Vector2(235,0)
		score.add_child(col)
		var head := _label("YOU" if i==0 else "RIVAL",15,"96dbdd" if i==0 else "f3b18c")
		col.add_child(head)
		labels["name"+str(i)] = head
		var bar := ProgressBar.new()
		bar.custom_minimum_size = Vector2(235,11)
		bar.show_percentage = false
		bar.value = 100
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.add_theme_stylebox_override("background",_style("132d39","385461",4))
		bar.add_theme_stylebox_override("fill",_style("73c5c8" if i==0 else "dda080","aac4af",4))
		col.add_child(bar)
		health_bars.append(bar)
		var hp := _label("100 / 100   •   0 WINS",12,"b7cbc3")
		col.add_child(hp)
		labels["hp"+str(i)] = hp
	var phase := _label("THE SKY SHRINE",23,"f8e7bc")
	phase.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui.add_child(phase)
	phase.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	phase.position = Vector2(-250,113)
	phase.size = Vector2(500,36)
	labels.phase = phase
	var hint := _label("Equal stats. One arena. Make every cast count.",14,"a8c4bd")
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui.add_child(hint)
	hint.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	hint.position = Vector2(-350,148)
	hint.size = Vector2(700,28)
	labels.hint = hint
	var actions := HBoxContainer.new()
	actions.name = "Actions"
	ui.add_child(actions)
	actions.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	actions.position = Vector2(-518,-104)
	actions.add_theme_constant_override("separation",10)
	attack_button = _button("STRIKE  [E]\n14 dmg · 0.65s",Vector2(154,76))
	skill_button = _button("LUMEN  [Q]\n24 dmg · 3s",Vector2(154,76))
	dash_button = _button("DASH  [Space]\nEvade · 4s",Vector2(154,76))
	actions.add_child(attack_button)
	actions.add_child(skill_button)
	actions.add_child(dash_button)
	attack_button.pressed.connect(_attack_nearest)
	skill_button.pressed.connect(func(): _arm("skill"))
	dash_button.pressed.connect(func(): _arm("dash"))
	var controls := _label("Tap floor to move · Tap rival to strike\nWASD move · Q cast toward cursor · Space dash",14,"c6d2c5")
	ui.add_child(controls)
	controls.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	controls.position = Vector2(30,-81)
	labels.controls = controls
	notice = _label("",17,"ffdfa6")
	notice.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui.add_child(notice)
	notice.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	notice.position = Vector2(-500,-152)
	notice.size = Vector2(1000,35)
	ready_button = _button("READY FOR REMATCH",Vector2(260,56))
	ui.add_child(ready_button)
	ready_button.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	ready_button.position = Vector2(-130,-220)
	ready_button.hide()
	ready_button.pressed.connect(func(): _send({"type":"ready"}))
	_build_connect_panel()

func _build_connect_panel() -> void:
	connect_panel = PanelContainer.new()
	connect_panel.add_theme_stylebox_override("panel",_style("173b48ee","849c85",18))
	ui.add_child(connect_panel)
	connect_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	connect_panel.position = Vector2(-238,-192)
	connect_panel.custom_minimum_size = Vector2(476,370)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation",12)
	connect_panel.add_child(col)
	col.add_child(_label("STEP INTO THE SHRINE",24,"f4d9a4"))
	col.add_child(_label("An original, server-authoritative 1v1 duel",14,"a8c8c3"))
	name_input = LineEdit.new()
	name_input.text = nickname
	name_input.placeholder_text = "Duelist name"
	name_input.max_length = 18
	name_input.custom_minimum_size.y = 48
	name_input.add_theme_font_size_override("font_size",18)
	col.add_child(name_input)
	col.add_child(_label("GAME SERVER",12,"91b9b6"))
	server_input = LineEdit.new()
	server_input.text = endpoint
	server_input.placeholder_text = "wss://your-game-server.example/ws"
	server_input.custom_minimum_size.y = 44
	server_input.add_theme_font_size_override("font_size",16)
	col.add_child(server_input)
	connect_button = _button("JOIN DUEL",Vector2(420,56))
	col.add_child(connect_button)
	connect_button.pressed.connect(_join)
	var info := _label("Two players join the same server. No account needed.\nLocal proof: ws://127.0.0.1:9080\nHTTPS web play requires a hosted WSS server.",13,"afc4be")
	col.add_child(info)

func _resize() -> void:
	var s := get_viewport().get_visible_rect().size
	# CanvasLayer has no parent Control rect. Place the HUD in canvas coordinates.
	ui.position = Vector2.ZERO
	ui.size = s
	var narrow := s.x/s.y < 1.35
	camera.size = 31 if narrow else 25
	status_label.position = Vector2(s.x-355,26)
	ui.get_node("ServerButton").position = Vector2(s.x-124,58)
	ui.get_node("SoundButton").position = Vector2(s.x-238,58)
	ui.get_node("Score").position = Vector2(s.x/2-247,116 if narrow else 26)
	labels.phase.position = Vector2(s.x/2-250,212 if narrow else 113)
	labels.hint.position = Vector2(s.x/2-350,247 if narrow else 148)
	labels.controls.text = "Tap floor to move · Tap rival to strike\nSkill / Dash → tap a direction" if narrow else "Tap floor to move · Tap rival to strike\nWASD move · Q cast toward cursor · Space dash"
	labels.controls.position = Vector2(30,s.y-(154 if narrow else 81))
	notice.position = Vector2(s.x/2-500,s.y-152)
	ready_button.position = Vector2(s.x/2-130,s.y-220)
	connect_panel.position = Vector2(s.x/2-238,s.y/2-192)
	ui.get_node("Actions").position = Vector2(s.x/2-241,s.y-104) if narrow else Vector2(s.x-518,s.y-104)

func _update_ui(_delta: float) -> void:
	var me := _player(self_id)
	var rival := _opponent()
	for i in range(2):
		var p: Dictionary = me if i==0 else rival
		labels["name"+str(i)].text = (str(p.get("name","YOU" if i==0 else "WAITING FOR RIVAL"))).to_upper()
		var hp := int(p.get("hp",100))
		health_bars[i].value = hp
		labels["hp"+str(i)].text = "%d / 100   •   %d WINS" % [hp,int(p.get("wins",0))]
	if active_connection:
		var connected := socket.get_ready_state()==WebSocketPeer.STATE_OPEN and time_since_snapshot<2
		status_label.text = ("LIVE  •  %d/2 DUELISTS  •  20 Hz" % int(snap.get("players",[]).size())) if connected else "RECONNECTING…  •  SERVER"
	else:
		status_label.text = "OFFLINE  •  CONNECT TO PLAY"
	var r: Dictionary = snap.get("round",{})
	var phase := str(r.get("phase","offline"))
	match phase:
		"waiting":
			labels.phase.text = "WAITING FOR A RIVAL"
			labels.hint.text = "Open a second client and join the same game server"
		"countdown":
			labels.phase.text = "DUEL STARTS IN  " + str(maxi(1,int(ceil(float(r.get("countdown",0))))))
			labels.hint.text = "Equal stats • 100 HP • Read the bolt, time your dash"
		"playing":
			labels.phase.text = "ROUND %02d" % int(r.get("number",1))
			labels.hint.text = "Lumen Bolt has a 0.4s warning. Dash through danger."
		"paused":
			labels.phase.text = "RIVAL DISCONNECTED"
			labels.hint.text = "Round paused • Reconnect grace period before forfeit"
		"finished":
			labels.phase.text = "VICTORY" if str(r.get("winner",""))==self_id else "ROUND LOST"
			labels.hint.text = "Both duelists must ready up for a fair rematch"
	ready_button.visible = phase=="finished" and not connect_panel.visible
	ready_button.text = "READY • WAITING FOR RIVAL" if me.get("ready",false) else "READY FOR REMATCH"
	attack_button.disabled = not _playing()
	skill_button.disabled = not _playing() or float(me.get("skill_cd",0))>.05
	dash_button.disabled = not _playing() or float(me.get("dash_cd",0))>.05
	var sc := float(me.get("skill_cd",0))
	var dc := float(me.get("dash_cd",0))
	skill_button.text = "LUMEN  %.1fs\nRecharging" % sc if sc>.05 else ("TAP A DIRECTION\nCancel aim" if aim_mode=="skill" else "LUMEN  [Q]\n24 dmg · 3s")
	dash_button.text = "DASH  %.1fs\nRecharging" % dc if dc>.05 else ("TAP A DIRECTION\nCancel aim" if aim_mode=="dash" else "DASH  [Space]\nEvade · 4s")

func _show_notice(text: String, duration: float) -> void:
	if notice == null: return
	notice.text = text
	notice.modulate.a = 1
	notice_timer = duration
