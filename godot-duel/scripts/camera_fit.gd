extends RefCounted
## Fit the complete playable volume into a HUD-free rectangle. All screen
## measurements use the viewport's logical canvas coordinates, not window pixels.

# The server permits x = +/-10 and z = +/-7. Include the head/name height and
# camera-facing sprite half-width so a duelist at an edge is still fully visible.
const PLAYABLE_BOUNDS := AABB(Vector3(-10, 0.2, -7), Vector3(20, 4.3, 14))
const SPRITE_MARGIN := Vector2(1.1, 0.35)

static func fit(camera: Camera3D, viewport_size: Vector2, safe_rect: Rect2) -> void:
	if viewport_size.x <= 0 or viewport_size.y <= 0 or safe_rect.size.x <= 0 or safe_rect.size.y <= 0:
		return
	var right := camera.global_basis.x.normalized()
	var up := camera.global_basis.y.normalized()
	var projected := Rect2()
	for i in range(8):
		var corner := PLAYABLE_BOUNDS.get_endpoint(i)
		var point := Vector2(corner.dot(right), corner.dot(up))
		projected = Rect2(point, Vector2.ZERO) if i == 0 else projected.expand(point)
	projected = projected.grow_individual(SPRITE_MARGIN.x, SPRITE_MARGIN.y, SPRITE_MARGIN.x, SPRITE_MARGIN.y)
	var world_per_pixel := maxf(projected.size.x / safe_rect.size.x, projected.size.y / safe_rect.size.y)
	# KEEP_HEIGHT makes size the vertical world span in both orientations.
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	camera.size = world_per_pixel * viewport_size.y
	var center := projected.get_center()
	var screen_offset := safe_rect.get_center() - viewport_size * 0.5
	var desired := center + Vector2(-screen_offset.x, screen_offset.y) * world_per_pixel
	var position := camera.global_position
	camera.global_position = position + right * (desired.x - position.dot(right)) + up * (desired.y - position.dot(up))
