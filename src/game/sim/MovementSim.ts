import type { WallRect } from '../types';

// Phase 6A: pure movement + collision on the 2D gameplay plane.
//
// This replaces Phaser Arcade physics for the 3D renderer path. Behavior must
// match the 2D game: a circular body slides along `WallRect` colliders and is
// clamped inside the world bounds. Movement is resolved one axis at a time
// (X then Y) so pressing diagonally into a wall slides along it exactly like
// an Arcade collider does.

export interface CircleBody {
  x: number;
  y: number;
  radius: number;
}

export interface WorldBounds {
  width: number;
  height: number;
}

/**
 * Advance a circular body by `dir * speed * dt`, resolving collisions against
 * walls and world bounds. Mutates `body` in place.
 *
 * `dirX/dirY` follow the 2D screen convention used by InputState: +x = right,
 * +y = down (toward the blue base).
 */
export function stepCircleMovement(
  body: CircleBody,
  dirX: number,
  dirY: number,
  speed: number,
  dt: number,
  walls: readonly WallRect[],
  bounds: WorldBounds,
): void {
  if (dirX !== 0) {
    body.x += dirX * speed * dt;
    resolveAxis(body, walls, 'x', dirX);
  }
  if (dirY !== 0) {
    body.y += dirY * speed * dt;
    resolveAxis(body, walls, 'y', dirY);
  }

  // World bounds (Arcade's collideWorldBounds equivalent).
  body.x = clamp(body.x, body.radius, bounds.width - body.radius);
  body.y = clamp(body.y, body.radius, bounds.height - body.radius);
}

/** Push the circle out of any overlapping wall along a single axis. */
function resolveAxis(body: CircleBody, walls: readonly WallRect[], axis: 'x' | 'y', moveSign: number): void {
  for (const wall of walls) {
    const right = wall.x + wall.width;
    const bottom = wall.y + wall.height;
    const closestX = clamp(body.x, wall.x, right);
    const closestY = clamp(body.y, wall.y, bottom);
    const dx = body.x - closestX;
    const dy = body.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= body.radius * body.radius) continue;

    if (axis === 'x') {
      if (dx > 0) {
        body.x = closestX + body.radius;
      } else if (dx < 0) {
        body.x = closestX - body.radius;
      } else {
        // Center is inside the rect's horizontal span (deep hit / corner);
        // back out opposite the movement direction.
        body.x = moveSign > 0 ? wall.x - body.radius : right + body.radius;
      }
    } else {
      if (dy > 0) {
        body.y = closestY + body.radius;
      } else if (dy < 0) {
        body.y = closestY - body.radius;
      } else {
        body.y = moveSign > 0 ? wall.y - body.radius : bottom + body.radius;
      }
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
