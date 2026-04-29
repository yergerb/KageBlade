extends Control

var fighters: Array = []


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if fighters.size() < 2:
		return

	_draw_bar(fighters[0], Vector2(48, 38), 420.0, true)
	_draw_bar(fighters[1], Vector2(get_viewport_rect().size.x - 468.0, 38), 420.0, false)
	_draw_combo(fighters[0])

	var center_x := get_viewport_rect().size.x * 0.5
	draw_string(_font(), Vector2(center_x - 92, 56), "KAGEBLADE", HORIZONTAL_ALIGNMENT_CENTER, 184, 28, Color.WHITE)
	draw_string(_font(), Vector2(center_x - 72, 82), "TRAINING SLICE 01", HORIZONTAL_ALIGNMENT_CENTER, 144, 13, Color(0.8, 0.76, 0.68, 0.9))


func _draw_bar(fighter: Variant, pos: Vector2, width: float, left_name: bool) -> void:
	var hp: float = clamp(float(fighter.health) / 100.0, 0.0, 1.0)
	var meter: float = clamp(float(fighter.meter) / 100.0, 0.0, 1.0)
	var name_pos := pos + Vector2(0, -9)
	if not left_name:
		name_pos.x += width - 128

	draw_rect(Rect2(pos, Vector2(width, 28)), Color(0.02, 0.018, 0.022, 0.82))
	draw_rect(Rect2(pos, Vector2(width, 28)), Color(0.0, 0.0, 0.0), false, 3)
	draw_rect(Rect2(pos + Vector2(4, 4), Vector2((width - 8.0) * hp, 20)), fighter.accent_a)
	draw_rect(Rect2(pos + Vector2(4, 4), Vector2((width - 8.0) * hp, 7)), Color(1, 1, 1, 0.24))

	draw_rect(Rect2(pos + Vector2(0, 42), Vector2(width * 0.56, 9)), Color(0.02, 0.018, 0.022, 0.82))
	draw_rect(Rect2(pos + Vector2(3, 45), Vector2((width * 0.56 - 6) * meter, 3)), fighter.accent_b)
	draw_string(_font(), name_pos, fighter.display_name, HORIZONTAL_ALIGNMENT_LEFT, 168, 22, Color.WHITE)


func _draw_combo(fighter: Variant) -> void:
	if int(fighter.combo_count) <= 1:
		return
	var center_x := get_viewport_rect().size.x * 0.5
	var combo_text := "%d HIT" % int(fighter.combo_count)
	var damage_text := "%.0f DMG" % float(fighter.combo_damage)
	draw_string(_font(), Vector2(center_x - 76, 132), combo_text, HORIZONTAL_ALIGNMENT_CENTER, 152, 30, fighter.accent_b)
	draw_string(_font(), Vector2(center_x - 54, 158), damage_text, HORIZONTAL_ALIGNMENT_CENTER, 108, 15, Color(1.0, 0.92, 0.72, 0.95))


func _font() -> Font:
	return ThemeDB.fallback_font
