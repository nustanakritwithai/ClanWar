/** Default frontal cone width (degrees) for melee skills without an explicit `arc`. */
export const DEFAULT_MELEE_ARC_DEGREES = 90;

export interface MeleeArcHitResult {
  hit: boolean;
  reason: 'hit' | 'out_of_range' | 'outside_arc';
}

/** Frontal arc/cone hit test — shared by basic attack and melee skills. */
export function testMeleeArc(
  casterX: number,
  casterY: number,
  facingAngle: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
  range: number,
  arcDegrees = DEFAULT_MELEE_ARC_DEGREES,
): MeleeArcHitResult {
  const dx = targetX - casterX;
  const dy = targetY - casterY;
  const dist = Math.hypot(dx, dy);
  if (dist > range + targetRadius) {
    return { hit: false, reason: 'out_of_range' };
  }

  const angleToTarget = Math.atan2(dy, dx);
  let diff = angleToTarget - facingAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const halfArc = ((arcDegrees * Math.PI) / 180) / 2;
  if (Math.abs(diff) > halfArc) {
    return { hit: false, reason: 'outside_arc' };
  }

  return { hit: true, reason: 'hit' };
}

export interface AoeCircleHitResult {
  hit: boolean;
  reason: 'hit' | 'outside_circle';
}

/** Instant circle hit test centered at a world point. */
export function testAoeCircle(
  centerX: number,
  centerY: number,
  radius: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
): AoeCircleHitResult {
  const dist = Math.hypot(targetX - centerX, targetY - centerY);
  if (dist > radius + targetRadius) {
    return { hit: false, reason: 'outside_circle' };
  }
  return { hit: true, reason: 'hit' };
}

/**
 * Swept segment vs circle — prevents fast projectiles from tunneling through
 * targets between frames.
 */
export function segmentHitsCircle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  circleX: number,
  circleY: number,
  circleRadius: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(circleX - x1, circleY - y1) <= circleRadius;
  }

  let t = ((circleX - x1) * dx + (circleY - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(circleX - closestX, circleY - closestY) <= circleRadius;
}
