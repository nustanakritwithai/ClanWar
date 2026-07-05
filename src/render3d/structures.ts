import * as THREE from 'three';
import { COLORS } from '../game/constants';
import type { MapMarker, TeamId } from '../game/types';
import { PALETTE } from './palette3d';

// Phase 6B: low-poly placeholder structures for every MapDefinition marker.
// Assembled from flat-shaded primitives — real modeled assets are a 6F
// concern. Every group is positioned by the caller at (marker.x, 0, marker.y);
// all sizes here are relative to the player capsule (~86 tall, radius 22).

export type Updatable = (dt: number) => void;

/** Gate opening span from map-small-twin-fortress wall data (walls end at
 * x=1140 and resume at x=1860) — pillars must flank, never block, this gap. */
const GATE_OPENING = { left: 1140, right: 1860 } as const;

function teamColor(team: TeamId | 'neutral'): number {
  return team === 'blue' ? COLORS.blue : team === 'red' ? COLORS.red : COLORS.neutral;
}

function flat(color: number, extra?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export function buildStructure(marker: MapMarker, updatables: Updatable[]): THREE.Group {
  const group = (() => {
    switch (marker.type) {
      case 'spawn': return buildSpawn(marker);
      case 'core': return buildCore(marker, updatables);
      case 'gate': return buildGate(marker);
      case 'watchtower': return buildWatchtower();
      case 'siegeRuins': return buildSiegeRuins();
      case 'resource': return buildResourceCamp();
      case 'forwardCamp': return buildForwardCamp(marker);
    }
  })();

  // Subtle radius ring = the marker's gameplay radius (capture/interaction
  // readability, same role as the 2D radius circles).
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(marker.radius - 4, marker.radius, 40),
    new THREE.MeshBasicMaterial({
      color: teamColor(marker.team),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.2;
  group.add(ring);

  group.position.set(marker.x, 0, marker.y);
  return group;
}

/** Two-tier platform + three banner poles in team color. */
function buildSpawn(marker: MapMarker): THREE.Group {
  const g = new THREE.Group();
  const team = teamColor(marker.team);

  // Kept low so the spawning player doesn't sink into it (sim floor is y=0).
  g.add(mesh(new THREE.CylinderGeometry(marker.radius, marker.radius + 6, 5, 24), flat(PALETTE.stoneDark), 0, 2.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(marker.radius * 0.62, marker.radius * 0.68, 5, 20), flat(PALETTE.stone), 0, 7.5, 0));

  const poleMat = flat(PALETTE.wood);
  const flagMat = flat(team, { emissive: team, emissiveIntensity: 0.25 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const px = Math.cos(a) * (marker.radius - 8);
    const pz = Math.sin(a) * (marker.radius - 8);
    g.add(mesh(new THREE.CylinderGeometry(3, 3, 110, 6), poleMat, px, 55, pz));
    g.add(mesh(new THREE.BoxGeometry(26, 16, 2), flagMat, px + 13, 96, pz));
  }
  return g;
}

/** Pedestal + slowly spinning emissive crystal — the thing you protect. */
function buildCore(marker: MapMarker, updatables: Updatable[]): THREE.Group {
  const g = new THREE.Group();
  const team = teamColor(marker.team);

  // Flat dais steps (not a tall block): the marker has no collider in the 2D
  // sim, so the player can walk here — low steps read as floor, not a clip.
  g.add(mesh(new THREE.CylinderGeometry(64, 72, 8, 8), flat(PALETTE.stoneDark), 0, 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(44, 50, 8, 8), flat(PALETTE.gold, { roughness: 0.55 }), 0, 12, 0));
  g.add(mesh(new THREE.CylinderGeometry(10, 14, 60, 6), flat(PALETTE.stone), 0, 46, 0));

  const crystal = mesh(
    new THREE.OctahedronGeometry(42),
    flat(team, { emissive: team, emissiveIntensity: 0.55, roughness: 0.35 }),
    0, 105, 0,
  );
  g.add(crystal);

  let t = Math.random() * Math.PI * 2;
  updatables.push((dt) => {
    t += dt;
    crystal.rotation.y += dt * 0.8;
    crystal.position.y = 105 + Math.sin(t * 1.6) * 6;
  });

  void marker;
  return g;
}

/** Arch over the walkable opening: pillars outside the gap + lintel above
 * head height, so the visual never contradicts the collision map. */
function buildGate(marker: MapMarker): THREE.Group {
  const g = new THREE.Group();
  const team = teamColor(marker.team);
  const pillarMat = flat(PALETTE.stone);
  const half = (GATE_OPENING.right - GATE_OPENING.left) / 2; // 360

  for (const side of [-1, 1]) {
    const px = side * (half + 28); // pillar centers just outside the opening
    g.add(mesh(new THREE.BoxGeometry(64, 230, 56), pillarMat, px, 115, 0));
    g.add(mesh(new THREE.BoxGeometry(76, 18, 68), flat(PALETTE.gold, { roughness: 0.5 }), px, 239, 0));
    // Team banner hanging from each pillar face
    g.add(mesh(new THREE.BoxGeometry(30, 70, 4), flat(team, { emissive: team, emissiveIntensity: 0.2 }), px, 165, 34));
  }

  // Lintel beam spanning the opening, well above the player (~86 tall).
  g.add(mesh(new THREE.BoxGeometry(half * 2 + 120, 26, 44), flat(PALETTE.wood), 0, 210, 0));
  g.add(mesh(new THREE.BoxGeometry(half * 2 + 120, 8, 50), flat(PALETTE.gold, { roughness: 0.5 }), 0, 227, 0));

  void marker;
  return g;
}

/** Open-frame lookout tower: 4 legs + high platform. Open on purpose — the
 * marker sits ON the main route and has no collider in the 2D sim, so the
 * player must be able to read "walking under it" rather than clip a solid. */
function buildWatchtower(): THREE.Group {
  const g = new THREE.Group();
  const legMat = flat(PALETTE.wood);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = mesh(new THREE.BoxGeometry(13, 230, 13), legMat, sx * 40, 115, sz * 40);
      leg.rotation.y = 0.08 * sx * sz;
      g.add(leg);
    }
  }
  g.add(mesh(new THREE.BoxGeometry(112, 14, 112), flat(PALETTE.stone), 0, 237, 0));
  g.add(mesh(new THREE.BoxGeometry(96, 26, 96), flat(PALETTE.stoneDark), 0, 257, 0));
  g.add(mesh(new THREE.ConeGeometry(74, 54, 4), flat(PALETTE.stoneDark), 0, 297, 0));
  return g;
}

/** Broken columns + rubble at the mid-cross ruins. */
function buildSiegeRuins(): THREE.Group {
  const g = new THREE.Group();
  const colMat = flat(PALETTE.stone);
  const rubbleMat = flat(PALETTE.stoneDark);
  const columns: Array<[number, number, number, number]> = [
    // [x, z, height, tilt]
    [-52, -20, 84, 0.10],
    [48, -34, 46, -0.16],
    [22, 42, 64, 0.06],
    [-30, 38, 30, -0.05],
  ];
  for (const [x, z, h, tilt] of columns) {
    const col = mesh(new THREE.CylinderGeometry(13, 15, h, 7), colMat, x, h / 2, z);
    col.rotation.z = tilt;
    g.add(col);
  }
  for (const [x, z, s] of [[-8, -4, 26], [40, 22, 18], [-44, 24, 16]] as const) {
    const r = mesh(new THREE.BoxGeometry(s, s * 0.7, s), rubbleMat, x, (s * 0.7) / 2, z);
    r.rotation.y = x * 0.05;
    g.add(r);
  }
  return g;
}

/** Supply crates + gold ore chunks. */
function buildResourceCamp(): THREE.Group {
  const g = new THREE.Group();
  const crateMat = flat(PALETTE.wood);
  for (const [x, z, s, rot] of [[-22, -10, 30, 0.2], [14, -18, 24, -0.35], [-2, 22, 26, 0.55]] as const) {
    const c = mesh(new THREE.BoxGeometry(s, s, s), crateMat, x, s / 2, z);
    c.rotation.y = rot;
    g.add(c);
  }
  const oreMat = flat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.18, roughness: 0.4 });
  for (const [x, z, r] of [[30, 14, 12], [-34, 18, 9]] as const) {
    g.add(mesh(new THREE.IcosahedronGeometry(r), oreMat, x, r * 0.8, z));
  }
  return g;
}

/** Tent + flag pole + log pile. */
function buildForwardCamp(marker: MapMarker): THREE.Group {
  const g = new THREE.Group();
  const tent = mesh(new THREE.ConeGeometry(44, 58, 4), flat(PALETTE.tent), -6, 29, -6);
  tent.rotation.y = Math.PI / 4;
  g.add(tent);

  const team = teamColor(marker.team);
  g.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, 90, 6), flat(PALETTE.wood), 34, 45, 20));
  g.add(mesh(new THREE.BoxGeometry(22, 14, 2), flat(team), 45, 80, 20));

  const logMat = flat(PALETTE.treeTrunk);
  for (const [x, z, rot] of [[-30, 34, 0.3], [-38, 26, 1.2]] as const) {
    const log = mesh(new THREE.CylinderGeometry(6, 6, 34, 6), logMat, x, 6, z);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rot;
    g.add(log);
  }
  return g;
}
