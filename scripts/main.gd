extends Node2D

const GROUND_Y := 610.0

var player: Node
var dummy: Node
var fighters: Array = []
var effect_layer: Node2D
var hud_layer: Control
var hit_stop := 0.0
var shake := 0.0
var camera_offset := Vector2.ZERO


func _ready() -> void:
	randomize()
	_setup_inputs()
	z_index = -100

	effect_layer = $EffectLayer
	player = $Player
	dummy = $Dummy

	player.call("configure", "Ren", Vector2(420, GROUND_Y), 1, true, false, Color(0.0, 0.9, 1.0), Color(1.0, 0.12, 0.76))
	dummy.call("configure", "Training Dummy", Vector2(830, GROUND_Y), -1, false, true, Color(1.0, 0.16, 0.72), Color(0.0, 0.9, 1.0))
	player.set("effect_layer", effect_layer)
	dummy.set("effect_layer", effect_layer)
	player.set("opponent", dummy)
	dummy.set("opponent", player)
	fighters = [player, dummy]

	hud_layer = $HUD
	hud_layer.set("fighters", fighters)
	player.connect("combat_event", Callable(self, "_on_combat_event"))
	dummy.connect("combat_event", Callable(self, "_on_combat_event"))


func _physics_process(delta: float) -> void:
	if Input.is_action_just_pressed("restart"):
		_reset_training_room()

	if hit_stop > 0.0:
		hit_stop -= delta
		_update_shake(delta)
		return

	player.call("step_player", delta)
	dummy.call("step_dummy", delta, player)

	for fighter_data in fighters:
		var fighter: Node = fighter_data as Node
		fighter.call("apply_physics", delta)

	player.call("resolve_attack", dummy)
	dummy.call("resolve_attack", player)
	player.call("face_target", dummy)
	dummy.call("face_target", player)

	_update_shake(delta)
	queue_redraw()


func _draw() -> void:
	var size := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.02, 0.015, 0.025))

	var sky_points := PackedVector2Array([
		Vector2(0, 0),
		Vector2(size.x, 0),
		Vector2(size.x, GROUND_Y + 80),
		Vector2(0, GROUND_Y + 80)
	])
	var sky_colors := PackedColorArray([
		Color(0.04, 0.03, 0.08),
		Color(0.10, 0.03, 0.10),
		Color(0.20, 0.04, 0.12),
		Color(0.02, 0.02, 0.03)
	])
	draw_polygon(sky_points, sky_colors)
	draw_circle(Vector2(size.x * 0.76, 108), 54, Color(0.95, 0.86, 0.62, 0.92))
	_draw_halftone(size)
	_draw_rooftops(size)
	_draw_floor(size)


func _on_combat_event(stop_time: float, shake_amount: float) -> void:
	hit_stop = max(hit_stop, stop_time)
	shake = max(shake, shake_amount)


func _setup_inputs() -> void:
	_add_key_action("move_left", [KEY_LEFT, KEY_A])
	_add_key_action("move_right", [KEY_RIGHT, KEY_D])
	_add_key_action("move_down", [KEY_DOWN, KEY_S])
	_add_key_action("jump", [KEY_SPACE, KEY_W, KEY_UP])
	_add_key_action("horizontal", [KEY_X, KEY_J])
	_add_key_action("vertical", [KEY_Y, KEY_I])
	_add_key_action("kick", [KEY_B, KEY_K])
	_add_key_action("block", [KEY_L])
	_add_key_action("grab", [KEY_R, KEY_O])
	_add_key_action("parry", [KEY_Q, KEY_U])
	_add_key_action("flip", [KEY_E, KEY_P])
	_add_key_action("restart", [KEY_ENTER])

	_add_joy_axis("move_left", JOY_AXIS_LEFT_X, -1.0)
	_add_joy_axis("move_right", JOY_AXIS_LEFT_X, 1.0)
	_add_joy_axis("move_down", JOY_AXIS_LEFT_Y, 1.0)
	_add_joy_axis("jump", JOY_AXIS_LEFT_Y, -1.0)
	_add_joy_button("move_left", JOY_BUTTON_DPAD_LEFT)
	_add_joy_button("move_right", JOY_BUTTON_DPAD_RIGHT)
	_add_joy_button("move_down", JOY_BUTTON_DPAD_DOWN)
	_add_joy_button("jump", JOY_BUTTON_DPAD_UP)
	_add_joy_button("jump", JOY_BUTTON_A)
	_add_joy_button("horizontal", JOY_BUTTON_X)
	_add_joy_button("vertical", JOY_BUTTON_Y)
	_add_joy_button("kick", JOY_BUTTON_B)
	_add_joy_axis("block", JOY_AXIS_TRIGGER_RIGHT, 1.0)
	_add_joy_button("grab", JOY_BUTTON_RIGHT_SHOULDER)
	_add_joy_axis("parry", JOY_AXIS_TRIGGER_LEFT, 1.0)
	_add_joy_button("flip", JOY_BUTTON_LEFT_SHOULDER)


func _add_key_action(action_name: StringName, keycodes: Array) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	for keycode_data in keycodes:
		var event := InputEventKey.new()
		event.keycode = int(keycode_data)
		InputMap.action_add_event(action_name, event)


func _add_joy_button(action_name: StringName, button_index: JoyButton) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var event := InputEventJoypadButton.new()
	event.button_index = button_index
	InputMap.action_add_event(action_name, event)


func _add_joy_axis(action_name: StringName, axis: JoyAxis, axis_value: float) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var event := InputEventJoypadMotion.new()
	event.axis = axis
	event.axis_value = axis_value
	InputMap.action_add_event(action_name, event)


func _update_shake(delta: float) -> void:
	shake = lerp(shake, 0.0, 9.0 * delta)
	camera_offset = Vector2(randf_range(-shake, shake), randf_range(-shake, shake))
	for fighter_data in fighters:
		var fighter: Node = fighter_data as Node
		fighter.call("apply_screen_offset", camera_offset)


func _reset_training_room() -> void:
	player.call("reset_fighter", Vector2(420, GROUND_Y), 1)
	dummy.call("reset_fighter", Vector2(830, GROUND_Y), -1)
	hit_stop = 0.0
	shake = 0.0
	camera_offset = Vector2.ZERO


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
