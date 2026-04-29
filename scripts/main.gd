extends Node2D

class Fighter:
	var name := ""
	var sprite: Sprite2D
	var pos := Vector2.ZERO
	var vel := Vector2.ZERO
	var facing := 1
	var playable := false
	var health := 100.0
	var meter := 28.0
	var state := "idle"
	var state_time := 0.0
	var action := ""
	var hit_done := false
	var blocking := false
	var parry_time := 0.0
	var stun := 0.0
	var invuln := 0.0
	var accent_a := Color.CYAN
	var accent_b := Color.MAGENTA
	var ai_timer := 0.0


const EFFECT_LAYER_SCRIPT: Script = preload("res://scripts/effect_layer.gd")
const HUD_LAYER_SCRIPT: Script = preload("res://scripts/hud_layer.gd")

const FRAME_W := 362
const FRAME_H := 362
const SPRITE_SCALE := 0.58
const GROUND_Y := 610.0
const GRAVITY := 1700.0

const ACTIONS := {
	"horizontal": {
		"duration": 0.42,
		"hit_start": 0.15,
		"hit_end": 0.27,
		"damage": 13.0,
		"push": 560.0,
		"lift": 0.0,
		"box": Rect2(34, -154, 172, 94),
		"arc_radius": 124.0,
		"vertical_arc": false
	},
	"vertical": {
		"duration": 0.58,
		"hit_start": 0.23,
		"hit_end": 0.38,
		"damage": 20.0,
		"push": 360.0,
		"lift": -520.0,
		"box": Rect2(22, -250, 120, 224),
		"arc_radius": 150.0,
		"vertical_arc": true
	},
	"kick": {
		"duration": 0.28,
		"hit_start": 0.09,
		"hit_end": 0.18,
		"damage": 8.0,
		"push": 700.0,
		"lift": 0.0,
		"box": Rect2(36, -96, 96, 54),
		"arc_radius": 76.0,
		"vertical_arc": false
	},
	"grab": {
		"duration": 0.46,
		"hit_start": 0.16,
		"hit_end": 0.25,
		"damage": 12.0,
		"push": 820.0,
		"lift": -420.0,
		"box": Rect2(28, -154, 70, 120),
		"arc_radius": 52.0,
		"vertical_arc": false
	}
}

var fighters: Array = []
var player: Fighter
var dummy: Fighter
var effect_layer: Node2D
var hud_layer: Control
var hit_stop := 0.0
var shake := 0.0
var camera_offset := Vector2.ZERO
var sprite_sheet: Texture2D


func _ready() -> void:
	randomize()
	_setup_inputs()
	_load_sprite_sheet()
	z_index = -100

	effect_layer = Node2D.new()
	effect_layer.set_script(EFFECT_LAYER_SCRIPT)
	effect_layer.z_index = 50
	add_child(effect_layer)

	player = _make_fighter("Ren", Vector2(430, GROUND_Y), 1, true, Color(0.0, 0.9, 1.0), Color(1.0, 0.12, 0.76))
	dummy = _make_fighter("Kaida Test", Vector2(820, GROUND_Y), -1, false, Color(1.0, 0.16, 0.72), Color(0.0, 0.9, 1.0))
	fighters = [player, dummy]

	hud_layer = Control.new()
	hud_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_layer.set_script(HUD_LAYER_SCRIPT)
	hud_layer.fighters = fighters
	add_child(hud_layer)

	_update_all_sprites()


func _physics_process(delta: float) -> void:
	if Input.is_action_just_pressed("restart"):
		_reset_round()

	if hit_stop > 0.0:
		hit_stop -= delta
		_update_shake(delta)
		return

	_update_player(player, delta)
	_update_dummy(dummy, delta)
	_apply_physics(player, delta)
	_apply_physics(dummy, delta)
	_resolve_attack(player, dummy)
	_resolve_attack(dummy, player)
	_face_each_other()
	_update_all_sprites()
	_update_shake(delta)
	queue_redraw()


func _draw() -> void:
	var size := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.02, 0.015, 0.025))

	var points := PackedVector2Array([
		Vector2(0, 0),
		Vector2(size.x, 0),
		Vector2(size.x, GROUND_Y + 80),
		Vector2(0, GROUND_Y + 80)
	])
	var colors := PackedColorArray([
		Color(0.04, 0.03, 0.08),
		Color(0.10, 0.03, 0.10),
		Color(0.20, 0.04, 0.12),
		Color(0.02, 0.02, 0.03)
	])
	draw_polygon(points, colors)
	draw_circle(Vector2(size.x * 0.76, 108), 54, Color(0.95, 0.86, 0.62, 0.92))
	_draw_halftone(size)
	_draw_rooftops(size)
	_draw_floor(size)


func _setup_inputs() -> void:
	_add_key_action("move_left", [KEY_LEFT, KEY_A])
	_add_key_action("move_right", [KEY_RIGHT, KEY_D])
	_add_key_action("jump", [KEY_SPACE, KEY_W, KEY_UP])
	_add_key_action("horizontal", [KEY_X, KEY_J])
	_add_key_action("vertical", [KEY_Y, KEY_I])
	_add_key_action("kick", [KEY_B, KEY_K])
	_add_key_action("block", [KEY_L])
	_add_key_action("grab", [KEY_R, KEY_O])
	_add_key_action("parry", [KEY_Q, KEY_U])
	_add_key_action("flip", [KEY_E, KEY_P])
	_add_key_action("restart", [KEY_ENTER])

	_add_joy_button("horizontal", 2)
	_add_joy_button("vertical", 3)
	_add_joy_button("kick", 1)
	_add_joy_button("block", 0)
	_add_joy_button("block", 7)
	_add_joy_button("grab", 5)
	_add_joy_button("parry", 6)
	_add_joy_button("flip", 4)


func _load_sprite_sheet() -> void:
	var image := Image.load_from_file("res://assets/sprites/longsword-sheet.png")
	if image == null:
		push_error("Could not load longsword sprite sheet.")
		return
	sprite_sheet = ImageTexture.create_from_image(image)


func _add_key_action(action_name: StringName, keycodes: Array) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	for keycode in keycodes:
		var event := InputEventKey.new()
		event.keycode = keycode
		InputMap.action_add_event(action_name, event)


func _add_joy_button(action_name: StringName, button_index: int) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var event := InputEventJoypadButton.new()
	event.button_index = button_index
	InputMap.action_add_event(action_name, event)


func _make_fighter(fighter_name: String, start_pos: Vector2, facing: int, playable: bool, accent_a: Color, accent_b: Color) -> Fighter:
	var sprite := Sprite2D.new()
	sprite.texture = sprite_sheet
	sprite.region_enabled = true
	sprite.centered = true
	sprite.scale = Vector2(SPRITE_SCALE, SPRITE_SCALE)
	sprite.z_index = 10
	if not playable:
		sprite.modulate = Color(0.86, 0.68, 1.0, 0.95)
	add_child(sprite)

	var f := Fighter.new()
	f.name = fighter_name
	f.sprite = sprite
	f.pos = start_pos
	f.facing = facing
	f.playable = playable
	f.accent_a = accent_a
	f.accent_b = accent_b
	return f


func _update_player(f: Fighter, delta: float) -> void:
	_tick_status(f, delta)
	if f.health <= 0.0 or f.stun > 0.0 or _is_committed(f):
		return

	var move := Input.get_axis("move_left", "move_right")
	f.blocking = Input.is_action_pressed("block") and _on_ground(f)
	if f.blocking:
		f.state = "block"
		f.vel.x = move * 115.0
	else:
		if Input.is_action_just_pressed("parry"):
			_start_parry(f)
		elif Input.is_action_just_pressed("flip"):
			_start_flip(f, move)
		elif Input.is_action_just_pressed("grab"):
			_start_action(f, "grab")
		elif Input.is_action_just_pressed("vertical"):
			_start_action(f, "vertical")
		elif Input.is_action_just_pressed("horizontal"):
			_start_action(f, "horizontal")
		elif Input.is_action_just_pressed("kick"):
			_start_action(f, "kick")
		else:
			_move_ground(f, move)

	if Input.is_action_just_pressed("jump") and _on_ground(f) and not f.blocking:
		f.vel.y = -680.0


func _update_dummy(f: Fighter, delta: float) -> void:
	_tick_status(f, delta)
	if f.health <= 0.0 or f.stun > 0.0 or _is_committed(f):
		return

	f.ai_timer -= delta
	var dist := player.pos.x - f.pos.x
	var abs_dist: float = abs(dist)
	var move := 0.0
	f.blocking = false

	if abs_dist > 190.0:
		move = sign(dist)
	elif f.ai_timer <= 0.0:
		f.ai_timer = randf_range(0.28, 0.68)
		var roll := randf()
		if roll < 0.42:
			_start_action(f, "horizontal")
		elif roll < 0.68:
			_start_action(f, "kick")
		elif roll < 0.86:
			_start_action(f, "vertical")
		else:
			f.blocking = true
			f.state = "block"

	if not f.blocking:
		_move_ground(f, move)


func _tick_status(f: Fighter, delta: float) -> void:
	f.state_time += delta
	if f.stun > 0.0:
		f.stun -= delta
		f.state = "hit"
	if f.parry_time > 0.0:
		f.parry_time -= delta
	if f.invuln > 0.0:
		f.invuln -= delta

	if f.action != "":
		var move: Dictionary = ACTIONS[f.action]
		if f.state_time >= move["duration"]:
			f.action = ""
			f.state = "idle"
			f.hit_done = false


func _move_ground(f: Fighter, move: float) -> void:
	if abs(move) > 0.01:
		f.vel.x = move * 330.0
		f.state = "walk"
	else:
		f.vel.x = lerp(f.vel.x, 0.0, 0.23)
		f.state = "idle"


func _start_action(f: Fighter, action_name: String) -> void:
	f.action = action_name
	f.state = action_name
	f.state_time = 0.0
	f.hit_done = false
	f.blocking = false
	f.vel.x *= 0.24
	if action_name == "horizontal":
		f.vel.x += f.facing * 75.0
	elif action_name == "kick":
		f.vel.x += f.facing * 145.0


func _start_parry(f: Fighter) -> void:
	f.state = "block"
	f.state_time = 0.0
	f.parry_time = 0.18
	f.meter = max(0.0, f.meter - 4.0)
	effect_layer.call("burst", f.pos + Vector2(f.facing * 28, -138), f.accent_b, 10, 260.0)


func _start_flip(f: Fighter, move: float) -> void:
	f.state = "flip"
	f.state_time = 0.0
	f.invuln = 0.34
	f.vel.x = (move if abs(move) > 0.01 else -f.facing) * 620.0
	f.vel.y = -560.0
	f.blocking = false


func _is_committed(f: Fighter) -> bool:
	return f.action != "" or f.state == "flip"


func _apply_physics(f: Fighter, delta: float) -> void:
	if not _on_ground(f) or f.vel.y < 0.0:
		f.vel.y += GRAVITY * delta
	f.pos += f.vel * delta
	f.pos.x = clamp(f.pos.x, 120.0, get_viewport_rect().size.x - 120.0)
	if f.pos.y >= GROUND_Y:
		f.pos.y = GROUND_Y
		f.vel.y = 0.0
		if f.state == "flip":
			f.state = "idle"


func _resolve_attack(attacker: Fighter, target: Fighter) -> void:
	if attacker.action == "" or attacker.hit_done or target.health <= 0.0 or target.invuln > 0.0:
		return

	var move: Dictionary = ACTIONS[attacker.action]
	if attacker.state_time < move["hit_start"] or attacker.state_time > move["hit_end"]:
		return

	if not _attack_box(attacker, move).intersects(_hurt_box(target)):
		return

	attacker.hit_done = true
	if target.parry_time > 0.0 and _in_front(attacker, target):
		_parry_success(attacker, target)
		return

	if target.blocking and _in_front(attacker, target) and attacker.action != "grab":
		_block_success(attacker, target, move)
		return

	_land_hit(attacker, target, move)


func _land_hit(attacker: Fighter, target: Fighter, move: Dictionary) -> void:
	target.health = max(0.0, target.health - float(move["damage"]))
	target.stun = 0.24
	target.state = "hit"
	target.vel.x = attacker.facing * float(move["push"])
	target.vel.y = float(move["lift"])
	attacker.meter = min(100.0, attacker.meter + 9.0)
	hit_stop = 0.055
	shake = max(shake, 12.0)
	var hit_pos := target.pos + Vector2(-target.facing * 26, -132)
	effect_layer.call("burst", hit_pos, attacker.accent_a, 24, 520.0)
	effect_layer.call("slash_arc", attacker.pos + Vector2(attacker.facing * 88, -134), attacker.facing, attacker.accent_b, attacker.accent_a, move["arc_radius"], move["vertical_arc"])
	if target.health <= 0.0:
		target.vel.y = -600.0
		target.stun = 1.4
		attacker.state = "victory"


func _block_success(attacker: Fighter, target: Fighter, move: Dictionary) -> void:
	target.health = max(0.0, target.health - 2.0)
	target.vel.x = attacker.facing * float(move["push"]) * 0.24
	attacker.vel.x *= 0.1
	target.meter = min(100.0, target.meter + 8.0)
	hit_stop = 0.025
	shake = max(shake, 4.0)
	effect_layer.call("burst", target.pos + Vector2(-target.facing * 24, -132), Color(0.15, 0.78, 1.0), 12, 260.0)


func _parry_success(attacker: Fighter, defender: Fighter) -> void:
	defender.meter = min(100.0, defender.meter + 18.0)
	attacker.stun = 0.52
	attacker.vel.x = -attacker.facing * 520.0
	attacker.vel.y = -180.0
	hit_stop = 0.09
	shake = max(shake, 16.0)
	effect_layer.call("burst", defender.pos + Vector2(defender.facing * 28, -142), Color.WHITE, 34, 620.0)


func _attack_box(f: Fighter, move: Dictionary) -> Rect2:
	var box: Rect2 = move["box"]
	var x := f.pos.x + (box.position.x if f.facing > 0 else -box.position.x - box.size.x)
	return Rect2(Vector2(x, f.pos.y + box.position.y), box.size)


func _hurt_box(f: Fighter) -> Rect2:
	return Rect2(Vector2(f.pos.x - 45.0, f.pos.y - 196.0), Vector2(90.0, 196.0))


func _in_front(attacker: Fighter, target: Fighter) -> bool:
	return sign(attacker.pos.x - target.pos.x) == target.facing


func _face_each_other() -> void:
	if not _is_committed(player):
		player.facing = 1 if dummy.pos.x > player.pos.x else -1
	if not _is_committed(dummy):
		dummy.facing = 1 if player.pos.x > dummy.pos.x else -1


func _update_all_sprites() -> void:
	for f in fighters:
		_update_sprite(f)


func _update_sprite(f: Fighter) -> void:
	var frame := _frame_for_state(f)
	var col := frame % 4
	var row := int(frame / 4)
	f.sprite.region_rect = Rect2(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H)
	f.sprite.flip_h = f.facing < 0
	f.sprite.position = f.pos + Vector2(0, -FRAME_H * SPRITE_SCALE * 0.5)
	f.sprite.rotation = f.state_time * TAU * -f.facing * 1.7 if f.state == "flip" else 0.0


func _frame_for_state(f: Fighter) -> int:
	if f.health <= 0.0:
		return 10
	match f.state:
		"idle":
			return 0 if int(f.state_time * 5.0) % 2 == 0 else 1
		"walk":
			return 2 if int(f.state_time * 8.0) % 2 == 0 else 3
		"horizontal":
			return [4, 5, 6][clamp(int(f.state_time / 0.42 * 3.0), 0, 2)]
		"vertical":
			return 7 if f.state_time < 0.28 else 8
		"kick":
			return 3
		"grab":
			return 4
		"block":
			return 9
		"hit":
			return 10
		"victory":
			return 11
		"flip":
			return 2 if int(f.state_time * 12.0) % 2 == 0 else 3
	return 0


func _on_ground(f: Fighter) -> bool:
	return f.pos.y >= GROUND_Y - 0.1


func _update_shake(delta: float) -> void:
	shake = lerp(shake, 0.0, 9.0 * delta)
	camera_offset = Vector2(randf_range(-shake, shake), randf_range(-shake, shake))
	for f in fighters:
		f.sprite.offset = camera_offset


func _reset_round() -> void:
	player.pos = Vector2(430, GROUND_Y)
	dummy.pos = Vector2(820, GROUND_Y)
	for f in fighters:
		f.vel = Vector2.ZERO
		f.health = 100.0
		f.meter = 28.0
		f.state = "idle"
		f.state_time = 0.0
		f.action = ""
		f.stun = 0.0
		f.blocking = false
		f.parry_time = 0.0


func _draw_halftone(size: Vector2) -> void:
	for y in range(28, int(GROUND_Y - 120), 18):
		for x in range(0, int(size.x), 18):
			var radius := 1.3 + float(y) / 230.0
			draw_circle(Vector2(x + (9 if y % 36 == 0 else 0), y), radius, Color(0, 0, 0, 0.16))


func _draw_rooftops(size: Vector2) -> void:
	var mountain := PackedVector2Array([
		Vector2(0, GROUND_Y - 160),
		Vector2(180, GROUND_Y - 270),
		Vector2(330, GROUND_Y - 146),
		Vector2(510, GROUND_Y - 248),
		Vector2(670, GROUND_Y - 134),
		Vector2(870, GROUND_Y - 292),
		Vector2(1030, GROUND_Y - 140),
		Vector2(1190, GROUND_Y - 248),
		Vector2(size.x, GROUND_Y - 164),
		Vector2(size.x, GROUND_Y),
		Vector2(0, GROUND_Y)
	])
	draw_colored_polygon(mountain, Color(0.05, 0.08, 0.12, 0.9))
	for x in [110, 970]:
		draw_rect(Rect2(Vector2(x, GROUND_Y - 214), Vector2(118, 18)), Color(0.04, 0.02, 0.04))
		draw_rect(Rect2(Vector2(x + 16, GROUND_Y - 196), Vector2(18, 154)), Color(0.05, 0.02, 0.03))
		draw_rect(Rect2(Vector2(x + 86, GROUND_Y - 196), Vector2(18, 154)), Color(0.05, 0.02, 0.03))


func _draw_floor(size: Vector2) -> void:
	draw_rect(Rect2(Vector2(0, GROUND_Y - 14), Vector2(size.x, size.y - GROUND_Y + 14)), Color(0.045, 0.038, 0.035))
	draw_line(Vector2(0, GROUND_Y - 14), Vector2(size.x, GROUND_Y - 14), Color(0.95, 0.22, 0.55, 0.26), 3)
	for x in range(0, int(size.x), 88):
		draw_line(Vector2(x, GROUND_Y + 24 + sin(x) * 5), Vector2(x + 64, GROUND_Y + 18 + cos(x) * 4), Color(1.0, 1.0, 1.0, 0.16), 2)
