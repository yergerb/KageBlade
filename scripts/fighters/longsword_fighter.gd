@tool
extends Node2D
class_name LongswordFighter

signal combat_event(hit_stop: float, shake_amount: float)
signal combo_changed(combo_count: int, damage: float)

const SHEET_PATH := "res://assets/sprites/longsword-sheet.png"
const FRAME_W := 362
const FRAME_H := 362
const SPRITE_SCALE := 0.58
const GRAVITY := 1700.0
const GROUND_Y := 610.0

const MOVES := {
	"light_1": {
		"duration": 0.22,
		"hit_start": 0.07,
		"hit_end": 0.14,
		"damage": 5.0,
		"push": 210.0,
		"lift": 0.0,
		"stun": 0.16,
		"box": Rect2(38, -150, 132, 72),
		"frames": [4, 5],
		"arc_radius": 92.0,
		"vertical_arc": false,
		"launch": false
	},
	"light_2": {
		"duration": 0.27,
		"hit_start": 0.08,
		"hit_end": 0.18,
		"damage": 7.0,
		"push": 260.0,
		"lift": -80.0,
		"stun": 0.18,
		"box": Rect2(42, -162, 154, 78),
		"frames": [5, 6],
		"arc_radius": 108.0,
		"vertical_arc": false,
		"launch": false
	},
	"light_3": {
		"duration": 0.38,
		"hit_start": 0.12,
		"hit_end": 0.25,
		"damage": 11.0,
		"push": 560.0,
		"lift": -260.0,
		"stun": 0.28,
		"box": Rect2(46, -172, 188, 96),
		"frames": [4, 5, 6],
		"arc_radius": 128.0,
		"vertical_arc": false,
		"launch": false
	},
	"launcher": {
		"duration": 0.50,
		"hit_start": 0.18,
		"hit_end": 0.32,
		"damage": 14.0,
		"push": 250.0,
		"lift": -720.0,
		"stun": 0.36,
		"box": Rect2(24, -250, 126, 226),
		"frames": [7, 8],
		"arc_radius": 150.0,
		"vertical_arc": true,
		"launch": true
	},
	"thrust": {
		"duration": 0.34,
		"hit_start": 0.10,
		"hit_end": 0.22,
		"damage": 10.0,
		"push": 470.0,
		"lift": -110.0,
		"stun": 0.20,
		"box": Rect2(70, -142, 210, 54),
		"frames": [2, 4, 6],
		"arc_radius": 78.0,
		"vertical_arc": false,
		"launch": false
	},
	"kick": {
		"duration": 0.32,
		"hit_start": 0.10,
		"hit_end": 0.21,
		"damage": 8.0,
		"push": 620.0,
		"lift": 0.0,
		"stun": 0.18,
		"box": Rect2(36, -96, 96, 54),
		"frames": [2, 3, 3],
		"arc_radius": 72.0,
		"vertical_arc": false,
		"launch": false
	},
	"grab": {
		"duration": 0.42,
		"hit_start": 0.14,
		"hit_end": 0.24,
		"damage": 12.0,
		"push": 780.0,
		"lift": -360.0,
		"stun": 0.32,
		"box": Rect2(28, -154, 72, 122),
		"frames": [4],
		"arc_radius": 52.0,
		"vertical_arc": false,
		"launch": false
	},
	"kunai": {
		"duration": 0.30,
		"hit_start": 0.09,
		"hit_end": 0.20,
		"damage": 5.0,
		"push": 160.0,
		"lift": 0.0,
		"stun": 0.14,
		"box": Rect2(86, -146, 360, 46),
		"frames": [4],
		"arc_radius": 42.0,
		"vertical_arc": false,
		"launch": false
	},
	"air_light": {
		"duration": 0.28,
		"hit_start": 0.08,
		"hit_end": 0.18,
		"damage": 7.0,
		"push": 280.0,
		"lift": -130.0,
		"stun": 0.18,
		"box": Rect2(34, -148, 142, 86),
		"frames": [5, 6],
		"arc_radius": 94.0,
		"vertical_arc": false,
		"launch": false
	},
	"air_heavy": {
		"duration": 0.40,
		"hit_start": 0.13,
		"hit_end": 0.27,
		"damage": 12.0,
		"push": 320.0,
		"lift": 520.0,
		"stun": 0.28,
		"box": Rect2(28, -168, 158, 138),
		"frames": [7, 8],
		"arc_radius": 132.0,
		"vertical_arc": true,
		"launch": false
	}
}

@export var display_name := "Ren"
@export var player_controlled := true
@export var training_dummy := false
@export var accent_a := Color(0.0, 0.9, 1.0)
@export var accent_b := Color(1.0, 0.12, 0.76)
@export var dummy_tint := Color(0.86, 0.68, 1.0, 0.95)
@export var debug_boxes := true

@onready var sprite: Sprite2D = $Sprite
@onready var hurtbox_shape: CollisionShape2D = $Hurtbox/CollisionShape2D
@onready var hitbox_shape: CollisionShape2D = $Hitbox/CollisionShape2D

var opponent: LongswordFighter
var effect_layer: Node
var velocity := Vector2.ZERO
var facing := 1
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
var combo_step := 0
var combo_timer := 0.0
var combo_count := 0
var combo_damage := 0.0
var combo_decay := 0.0
var chase_window := 0.0
var queued_action := ""
var ai_timer := 0.0
var bounds := Rect2(120, 0, 1040, 720)
var last_tap_dir := 0
var dash_tap_timer := 0.0
var dash_cooldown := 0.0
var dash_dir := 0
var jumps_used := 0


func _ready() -> void:
	_load_sprite_sheet()
	sprite.centered = true
	sprite.region_enabled = true
	sprite.scale = Vector2(SPRITE_SCALE, SPRITE_SCALE)
	if training_dummy:
		sprite.modulate = dummy_tint
	_update_sprite()
	_update_debug_shapes()


func configure(fighter_name: String, start_position: Vector2, start_facing: int, controlled_by_player: bool, is_dummy: bool, main_accent: Color, secondary_accent: Color) -> void:
	display_name = fighter_name
	position = start_position
	facing = start_facing
	player_controlled = controlled_by_player
	training_dummy = is_dummy
	accent_a = main_accent
	accent_b = secondary_accent
	name = fighter_name
	if is_inside_tree() and sprite != null:
		sprite.modulate = dummy_tint if training_dummy else Color.WHITE
		_update_sprite()


func _set_state(next_state: String, force_restart: bool = false) -> void:
	if force_restart or state != next_state:
		state = next_state
		state_time = 0.0


func reset_fighter(start_position: Vector2, start_facing: int) -> void:
	position = start_position
	facing = start_facing
	velocity = Vector2.ZERO
	health = 100.0
	meter = 28.0
	state = "idle"
	state_time = 0.0
	action = ""
	hit_done = false
	blocking = false
	parry_time = 0.0
	stun = 0.0
	invuln = 0.0
	combo_step = 0
	combo_timer = 0.0
	combo_count = 0
	combo_damage = 0.0
	combo_decay = 0.0
	chase_window = 0.0
	queued_action = ""
	last_tap_dir = 0
	dash_tap_timer = 0.0
	dash_cooldown = 0.0
	dash_dir = 0
	jumps_used = 0
	_update_sprite()
	_update_debug_shapes()


func step_player(delta: float) -> void:
	_tick_status(delta)
	if health <= 0.0:
		return
	if _is_committed() or stun > 0.0:
		_buffer_inputs()
		return

	var move := Input.get_axis("move_left", "move_right")
	var holding_down := Input.is_action_pressed("move_down")
	_check_dash_tap()
	blocking = Input.is_action_pressed("block") and _on_ground()
	if blocking:
		_set_state("block")
		velocity.x = move * 115.0
	else:
		if Input.is_action_just_pressed("jump"):
			_try_jump_or_chase()
		elif Input.is_action_just_pressed("parry"):
			_start_parry()
		elif Input.is_action_just_pressed("flip"):
			_start_flip(move)
		elif Input.is_action_just_pressed("grab"):
			_start_action("grab")
		elif Input.is_action_just_pressed("vertical"):
			_start_action("thrust" if _is_holding_forward() else "launcher")
		elif Input.is_action_just_pressed("kick"):
			_start_action("kick")
		elif Input.is_action_just_pressed("horizontal"):
			if holding_down:
				_start_action("kunai")
			elif _on_ground():
				_start_light_combo()
			else:
				_start_action("air_light")
		else:
			_move_ground(move)


func step_dummy(delta: float, target: LongswordFighter) -> void:
	_tick_status(delta)
	if health <= 0.0 or stun > 0.0 or _is_committed():
		return

	blocking = false
	_set_state("idle")
	velocity.x = lerp(velocity.x, 0.0, 0.28)
	if target != null:
		face_target(target)


func apply_physics(delta: float) -> void:
	var was_on_ground := _on_ground()
	if not _on_ground() or velocity.y < 0.0:
		velocity.y += GRAVITY * delta
	position += velocity * delta
	position.x = clamp(position.x, bounds.position.x, bounds.end.x)
	if position.y >= GROUND_Y:
		position.y = GROUND_Y
		velocity.y = 0.0
		if not was_on_ground:
			jumps_used = 0
		if state == "flip" or state == "dash_forward" or state == "dash_back":
			_set_state("idle")

	_update_sprite()
	_update_debug_shapes()
	queue_redraw()


func resolve_attack(target: LongswordFighter) -> void:
	if target == null:
		return
	if action == "" or hit_done or target.health <= 0.0 or target.invuln > 0.0:
		return

	var move: Dictionary = MOVES[action]
	if state_time < float(move["hit_start"]) or state_time > float(move["hit_end"]):
		return
	if not attack_box(move).intersects(target.hurt_box()):
		return

	hit_done = true
	if target.parry_time > 0.0 and _in_front_of(target):
		_parry_success(target)
		return
	if target.blocking and _in_front_of(target) and action != "grab":
		_block_success(target, move)
		return

	_land_hit(target, move)


func face_target(target: LongswordFighter) -> void:
	if _is_committed() or target == null:
		return
	facing = 1 if target.position.x > position.x else -1


func apply_screen_offset(offset: Vector2) -> void:
	sprite.offset = offset


func hurt_box() -> Rect2:
	return Rect2(Vector2(position.x - 45.0, position.y - 196.0), Vector2(90.0, 196.0))


func attack_box(move: Dictionary) -> Rect2:
	var box: Rect2 = move["box"]
	var x := position.x + (box.position.x if facing > 0 else -box.position.x - box.size.x)
	return Rect2(Vector2(x, position.y + box.position.y), box.size)


func _draw() -> void:
	if not debug_boxes:
		return
	var local_hurt := Rect2(Vector2(-45, -196), Vector2(90, 196))
	draw_rect(local_hurt, Color(0.0, 0.9, 1.0, 0.34), false, 2.0)

	if action != "":
		var move: Dictionary = MOVES[action]
		var active := state_time >= float(move["hit_start"]) and state_time <= float(move["hit_end"])
		var box: Rect2 = move["box"]
		var local_x := box.position.x if facing > 0 else -box.position.x - box.size.x
		var local_box := Rect2(Vector2(local_x, box.position.y), box.size)
		draw_rect(local_box, Color(1.0, 0.12, 0.76, 0.8 if active else 0.28), false, 3.0)


func _load_sprite_sheet() -> void:
	var imported_texture := load(SHEET_PATH) as Texture2D
	if imported_texture != null:
		sprite.texture = imported_texture
		return

	var image := Image.load_from_file(SHEET_PATH)
	if image == null:
		push_error("Could not load longsword sprite sheet.")
		return
	sprite.texture = ImageTexture.create_from_image(image)


func _tick_status(delta: float) -> void:
	state_time += delta
	dash_tap_timer = max(0.0, dash_tap_timer - delta)
	dash_cooldown = max(0.0, dash_cooldown - delta)
	combo_timer = max(0.0, combo_timer - delta)
	combo_decay = max(0.0, combo_decay - delta)
	chase_window = max(0.0, chase_window - delta)
	if combo_timer <= 0.0:
		combo_step = 0
	if combo_decay <= 0.0 and combo_count > 0:
		combo_count = 0
		combo_damage = 0.0
		combo_changed.emit(combo_count, combo_damage)

	if stun > 0.0:
		stun -= delta
		_set_state("hit")
	if parry_time > 0.0:
		parry_time -= delta
	if invuln > 0.0:
		invuln -= delta

	if state == "dash_forward" or state == "dash_back":
		var dash_duration := 0.17 if state == "dash_forward" else 0.19
		velocity.x = dash_dir * (760.0 if state == "dash_forward" else 640.0)
		if state_time >= dash_duration:
			dash_dir = 0
			velocity.x *= 0.35
			_set_state("idle")

	if action != "":
		var move: Dictionary = MOVES[action]
		if state_time >= float(move["duration"]):
			action = ""
			_set_state("idle")
			hit_done = false
			var next_action := queued_action
			queued_action = ""
			_apply_queued_action(next_action)


func _buffer_inputs() -> void:
	if Input.is_action_just_pressed("horizontal"):
		queued_action = "light"
	elif Input.is_action_just_pressed("vertical"):
		queued_action = "thrust" if _is_holding_forward() else "launcher"
	elif Input.is_action_just_pressed("kick"):
		queued_action = "kick"
	elif Input.is_action_just_pressed("grab"):
		queued_action = "grab"


func _apply_queued_action(next_action: String) -> void:
	if next_action == "":
		return
	match next_action:
		"light":
			if _on_ground():
				_start_light_combo()
			else:
				_start_action("air_light")
		"launcher":
			_start_action("launcher" if _on_ground() else "air_heavy")
		"thrust":
			_start_action("thrust")
		"kick":
			_start_action("kick")
		"grab":
			_start_action("grab")


func _move_ground(move: float) -> void:
	if abs(move) > 0.01:
		velocity.x = move * 380.0
		_set_state("walk_forward" if sign(move) == facing else "walk_back")
	else:
		velocity.x = lerp(velocity.x, 0.0, 0.23)
		_set_state("idle")


func _check_dash_tap() -> void:
	if dash_cooldown > 0.0:
		return
	if Input.is_action_just_pressed("move_left"):
		_register_direction_tap(-1)
	elif Input.is_action_just_pressed("move_right"):
		_register_direction_tap(1)


func _register_direction_tap(dir: int) -> void:
	if last_tap_dir == dir and dash_tap_timer > 0.0:
		_start_dash(dir)
		last_tap_dir = 0
		dash_tap_timer = 0.0
	else:
		last_tap_dir = dir
		dash_tap_timer = 0.24


func _start_dash(dir: int) -> void:
	dash_dir = dir
	dash_cooldown = 0.28
	blocking = false
	action = ""
	hit_done = false
	_set_state("dash_forward" if dir == facing else "dash_back", true)
	velocity.x = dir * (800.0 if dir == facing else 680.0)
	velocity.y = min(velocity.y, 0.0)
	if dir != facing:
		invuln = max(invuln, 0.12)
	if effect_layer != null:
		effect_layer.call("burst", position + Vector2(-dir * 24, -20), accent_b if dir == facing else accent_a, 8, 240.0)


func _is_holding_forward() -> bool:
	return Input.is_action_pressed("move_right") if facing > 0 else Input.is_action_pressed("move_left")


func _start_light_combo() -> void:
	combo_step = 1 if combo_timer <= 0.0 else wrapi(combo_step + 1, 1, 4)
	combo_timer = 0.62
	_start_action("light_%d" % combo_step)


func _start_action(action_name: String) -> void:
	action = action_name
	_set_state(action_name, true)
	hit_done = false
	blocking = false
	velocity.x *= 0.22
	if action_name == "light_2" or action_name == "light_3":
		velocity.x += facing * 105.0
	elif action_name == "kick":
		velocity.x += facing * 160.0
	elif action_name == "thrust":
		velocity.x += facing * 230.0
	elif action_name == "kunai":
		velocity.x -= facing * 35.0


func _start_parry() -> void:
	_set_state("block", true)
	parry_time = 0.18
	meter = max(0.0, meter - 4.0)
	if effect_layer != null:
		effect_layer.call("burst", position + Vector2(facing * 28, -138), accent_b, 10, 260.0)


func _start_flip(move: float) -> void:
	_set_state("flip", true)
	invuln = 0.34
	velocity.x = (move if abs(move) > 0.01 else -facing) * 680.0
	velocity.y = -560.0
	blocking = false


func _try_jump_or_chase() -> void:
	if chase_window > 0.0 and opponent != null:
		_set_state("flip", true)
		velocity.x = facing * 700.0
		velocity.y = -520.0
		chase_window = 0.0
		jumps_used = 1
	elif jumps_used < 2:
		velocity.y = -680.0 if jumps_used == 0 else -620.0
		jumps_used += 1
		if effect_layer != null and jumps_used == 2:
			effect_layer.call("burst", position + Vector2(0, -58), accent_b, 8, 220.0)


func _is_committed() -> bool:
	return action != "" or state == "flip" or state == "dash_forward" or state == "dash_back"


func _land_hit(target: LongswordFighter, move: Dictionary) -> void:
	target.health = max(0.0, target.health - float(move["damage"]))
	target.stun = float(move["stun"])
	target._set_state("hit", true)
	target.velocity.x = facing * float(move["push"])
	target.velocity.y = float(move["lift"])
	meter = min(100.0, meter + 9.0)

	combo_count += 1
	combo_damage += float(move["damage"])
	combo_decay = 1.15
	combo_changed.emit(combo_count, combo_damage)

	if bool(move["launch"]):
		chase_window = 0.75

	if effect_layer != null:
		var hit_pos := target.position + Vector2(-target.facing * 26, -132)
		effect_layer.call("burst", hit_pos, accent_a, 24, 520.0)
		effect_layer.call("slash_arc", position + Vector2(facing * 88, -134), facing, accent_b, accent_a, move["arc_radius"], move["vertical_arc"])

	combat_event.emit(0.055, 12.0)
	if target.health <= 0.0:
		target.velocity.y = -600.0
		target.stun = 1.4
		_set_state("victory", true)


func _block_success(target: LongswordFighter, move: Dictionary) -> void:
	target.health = max(0.0, target.health - 2.0)
	target.velocity.x = facing * float(move["push"]) * 0.24
	velocity.x *= 0.1
	target.meter = min(100.0, target.meter + 8.0)
	if effect_layer != null:
		effect_layer.call("burst", target.position + Vector2(-target.facing * 24, -132), Color(0.15, 0.78, 1.0), 12, 260.0)
	combat_event.emit(0.025, 4.0)


func _parry_success(defender: LongswordFighter) -> void:
	defender.meter = min(100.0, defender.meter + 18.0)
	stun = 0.52
	velocity.x = -facing * 520.0
	velocity.y = -180.0
	if effect_layer != null:
		effect_layer.call("burst", defender.position + Vector2(defender.facing * 28, -142), Color.WHITE, 34, 620.0)
	combat_event.emit(0.09, 16.0)


func _in_front_of(target: LongswordFighter) -> bool:
	return sign(position.x - target.position.x) == target.facing


func _on_ground() -> bool:
	return position.y >= GROUND_Y - 0.1


func _frame_for_state() -> int:
	if health <= 0.0:
		return 10
	match state:
		"idle":
			return 0 if int(state_time * 4.0) % 2 == 0 else 1
		"walk_forward":
			return 2 if int(state_time * 9.0) % 2 == 0 else 3
		"walk_back":
			return 3 if int(state_time * 7.0) % 2 == 0 else 2
		"dash_forward":
			return 3
		"dash_back":
			return 2
		"light_1", "light_2", "light_3", "air_light", "kunai", "grab", "kick", "thrust":
			return _move_frame(state)
		"launcher", "air_heavy":
			return _move_frame(state)
		"block":
			return 9
		"hit":
			return 10
		"victory":
			return 11
		"flip":
			return 2 if int(state_time * 12.0) % 2 == 0 else 3
	return 0


func _move_frame(move_name: String) -> int:
	var move: Dictionary = MOVES[move_name]
	var frames: Array = move["frames"]
	if frames.is_empty():
		return 0
	var duration: float = max(0.01, float(move["duration"]))
	var index: int = clamp(int(state_time / duration * frames.size()), 0, frames.size() - 1)
	return int(frames[index])


func _update_sprite() -> void:
	var frame := _frame_for_state()
	var col := frame % 4
	var row := int(frame / 4)
	sprite.region_rect = Rect2(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H)
	sprite.flip_h = facing < 0
	sprite.position = Vector2(0, -FRAME_H * SPRITE_SCALE * 0.5) + _visual_offset_for_state()
	sprite.rotation = state_time * TAU * -facing * 1.7 if state == "flip" else 0.0


func _visual_offset_for_state() -> Vector2:
	match state:
		"block":
			return Vector2(0, 28)
	return Vector2.ZERO


func _update_debug_shapes() -> void:
	hurtbox_shape.position = Vector2(0, -98)
	if action == "":
		hitbox_shape.disabled = true
		return

	var move: Dictionary = MOVES[action]
	var box: Rect2 = move["box"]
	var local_x := box.position.x if facing > 0 else -box.position.x - box.size.x
	hitbox_shape.disabled = false
	hitbox_shape.position = Vector2(local_x + box.size.x * 0.5, box.position.y + box.size.y * 0.5)
	var rect_shape := hitbox_shape.shape as RectangleShape2D
	if rect_shape != null:
		rect_shape.size = box.size
