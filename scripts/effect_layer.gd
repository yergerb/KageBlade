extends Node2D

var particles: Array = []
var arcs: Array = []


func _process(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		var p: Dictionary = particles[i]
		p["pos"] += p["vel"] * delta
		p["vel"].y += 760.0 * delta
		p["life"] -= delta
		if p["life"] <= 0.0:
			particles.remove_at(i)

	for i in range(arcs.size() - 1, -1, -1):
		var arc: Dictionary = arcs[i]
		arc["life"] -= delta
		if arc["life"] <= 0.0:
			arcs.remove_at(i)

	queue_redraw()


func burst(pos: Vector2, color: Color, count: int = 18, power: float = 420.0) -> void:
	for i in range(count):
		var angle := randf_range(-PI, PI)
		var speed := randf_range(power * 0.22, power)
		particles.append({
			"pos": pos,
			"vel": Vector2(cos(angle), sin(angle)) * speed,
			"life": randf_range(0.18, 0.42),
			"max_life": 0.42,
			"size": randf_range(3.0, 9.0),
			"color": color.lerp(Color.WHITE, randf_range(0.0, 0.4))
		})


func slash_arc(pos: Vector2, facing: int, color_a: Color, color_b: Color, radius: float, vertical: bool = false) -> void:
	arcs.append({
		"pos": pos,
		"facing": facing,
		"color_a": color_a,
		"color_b": color_b,
		"radius": radius,
		"vertical": vertical,
		"life": 0.16,
		"max_life": 0.16
	})


func _draw() -> void:
	for arc_data in arcs:
		var arc: Dictionary = arc_data
		var t: float = clamp(arc["life"] / arc["max_life"], 0.0, 1.0)
		var alpha: float = t * 0.95
		var start: float = -0.8
		var end: float = 0.8
		if arc["vertical"]:
			start = -1.55
			end = 0.28
		var center: Vector2 = arc["pos"]
		var points := PackedVector2Array()
		for i in range(26):
			var a: float = lerp(start, end, float(i) / 25.0)
			var x: float = cos(a) * arc["radius"] * arc["facing"]
			var y: float = sin(a) * arc["radius"]
			if arc["vertical"]:
				x = cos(a) * arc["radius"] * 0.62 * arc["facing"]
				y = sin(a) * arc["radius"]
			points.append(center + Vector2(x, y))
		var color_a: Color = arc["color_a"]
		var color_b: Color = arc["color_b"]
		draw_polyline(points, Color(color_a.r, color_a.g, color_a.b, alpha), 18.0, true)
		draw_polyline(points, Color(color_b.r, color_b.g, color_b.b, alpha), 8.0, true)
		draw_polyline(points, Color(1.0, 1.0, 1.0, alpha * 0.76), 3.0, true)

	for p_data in particles:
		var p: Dictionary = p_data
		var t: float = clamp(p["life"] / p["max_life"], 0.0, 1.0)
		var c: Color = p["color"]
		c.a = t
		draw_circle(p["pos"], p["size"] * t, c)
