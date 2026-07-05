import * as THREE from 'three';
import { COLORS } from '../game/constants';
import type { MapDefinition } from '../game/types';
import { PALETTE } from './palette3d';
import { buildStructure, type Updatable } from './structures';

// Phase 6B: full placeholder battlefield built from MapDefinition + the route
// geometry in docs/map-layout-spec.md (same bands the 2D MapRenderer paints):
//
//   main route   x 1300–1700 · y 650–3600   packed-earth road
//   high ground  x  600–1050 · y 650–3600   stone flank (elevation is visual
//                                           flavor only — the sim plane stays
//                                           flat, matching 2D movement rules)
//   shadow route x 2070–2350 · y 650–3600   dark sewer flank
//
// Wall boxes sit exactly on WallRect colliders. Structures replace the 6A
// marker discs. Decorative props avoid routes, bases, walls, and marker
// radii so visuals never suggest fake collision.

const WALL_HEIGHT = 140;
const ROUTE_TOP = 650;
const ROUTE_BOTTOM = 3600;
const ROUTES = {
  main: { left: 1300, right: 1700 },
  high: { left: 600, right: 1050 },
  shadow: { left: 2070, right: 2350 },
} as const;
const BASE_X = { left: 900, right: 2100 } as const;
const BLUE_BASE_TOP = 3150;
const RED_BASE_BOTTOM = 850;
const NEUTRAL_PATCH = { left: 1100, right: 1900, top: 1500, bottom: 2700 } as const;

/** Junction hubs per docs/map-layout-spec.md §3.3 (MapRenderer parity). */
const ROAD_CROSSINGS = [
  { x: 1500, y: 3550 },
  { x: 1500, y: 2100 },
  { x: 1500, y: 650 },
] as const;

/** High-ground ramps / sewer mouths (visual hints, MapRenderer parity). */
const RAMPS = [{ x: 820, y: 3400 }, { x: 820, y: 2300 }, { x: 820, y: 1200 }] as const;
const SEWER_MOUTHS = [{ x: 2150, y: 3550 }, { x: 2150, y: 2300 }, { x: 2150, y: 1200 }] as const;

export interface MapView {
  group: THREE.Group;
  /** Advance animated structure bits (core crystals). */
  update(dt: number): void;
}

export function buildMap(map: MapDefinition): MapView {
  const group = new THREE.Group();
  const updatables: Updatable[] = [];

  group.add(buildGround(map));
  group.add(buildWalls(map));
  group.add(buildRouteExtras());
  group.add(buildProps(map));
  for (const marker of map.markers) {
    group.add(buildStructure(marker, updatables));
  }

  return {
    group,
    update(dt: number): void {
      for (const u of updatables) u(dt);
    },
  };
}

/** Which zone colors a ground cell. Priority mirrors 2D paint order
 * (routes over base floors over neutral patch over plain ground). */
function zoneColorAt(x: number, y: number): number {
  const onRouteSpan = y >= ROUTE_TOP && y <= ROUTE_BOTTOM;
  if (onRouteSpan) {
    if (x >= ROUTES.main.left && x <= ROUTES.main.right) return PALETTE.zoneMain;
    if (x >= ROUTES.high.left && x <= ROUTES.high.right) return PALETTE.zoneHigh;
    if (x >= ROUTES.shadow.left && x <= ROUTES.shadow.right) return PALETTE.zoneShadow;
  }
  if (x >= BASE_X.left && x <= BASE_X.right) {
    if (y >= BLUE_BASE_TOP) return PALETTE.zoneBlueBase;
    if (y <= RED_BASE_BOTTOM) return PALETTE.zoneRedBase;
  }
  if (
    x >= NEUTRAL_PATCH.left && x <= NEUTRAL_PATCH.right &&
    y >= NEUTRAL_PATCH.top && y <= NEUTRAL_PATCH.bottom
  ) {
    return PALETTE.zoneNeutral;
  }
  return COLORS.ground;
}

/** Vertex-colored plane: zone colors + a faint checker for motion cues. */
function buildGround(map: MapDefinition): THREE.Mesh {
  const cell = 50;
  const cols = Math.round(map.width / cell);
  const rows = Math.round(map.height / cell);

  const geo = new THREE.PlaneGeometry(map.width, map.height, cols, rows).toNonIndexed();
  const pos = geo.getAttribute('position');
  const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3);
  const c = new THREE.Color();

  for (let tri = 0; tri < pos.count; tri += 3) {
    const cx = (pos.getX(tri) + pos.getX(tri + 1) + pos.getX(tri + 2)) / 3;
    const cy = (pos.getY(tri) + pos.getY(tri + 1) + pos.getY(tri + 2)) / 3;
    // Plane XY is centered; convert to 2D world coords (y flips: plane +y is
    // rotated to world -z, and world z = 2D y).
    const wx = cx + map.width / 2;
    const wy = map.height / 2 - cy;
    const ix = Math.floor(wx / cell);
    const iy = Math.floor(wy / cell);
    c.set(zoneColorAt(wx, wy));
    c.multiplyScalar((ix + iy) % 2 === 0 ? 1 : 1.07);
    for (let v = 0; v < 3; v++) {
      colorAttr.setXYZ(tri + v, c.r, c.g, c.b);
    }
  }
  geo.setAttribute('color', colorAttr);

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(map.width / 2, 0, map.height / 2);
  return mesh;
}

function buildWalls(map: MapDefinition): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    flatShading: true,
    roughness: 0.9,
  });

  for (const wall of map.walls) {
    const geo = new THREE.BoxGeometry(wall.width, WALL_HEIGHT, wall.height);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(wall.x + wall.width / 2, WALL_HEIGHT / 2, wall.y + wall.height / 2);
    group.add(mesh);
  }
  return group;
}

/** Crossing plazas, high-ground ramp slats, sewer mouths. */
function buildRouteExtras(): THREE.Group {
  const group = new THREE.Group();

  const plazaMat = new THREE.MeshLambertMaterial({ color: PALETTE.zoneMainEdge });
  for (const cr of ROAD_CROSSINGS) {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(104, 104, 2, 20), plazaMat);
    plaza.position.set(cr.x, 1, cr.y);
    group.add(plaza);
  }

  const rampMat = new THREE.MeshStandardMaterial({ color: PALETTE.stone, flatShading: true, roughness: 0.9 });
  for (const r of RAMPS) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(120, 10, 74), rampMat);
    slat.position.set(r.x, 5, r.y);
    slat.rotation.z = 0.14; // slight tilt: reads as a ramp onto the stone flank
    group.add(slat);
  }

  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x14101f, flatShading: true, roughness: 1 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.purple,
    emissive: PALETTE.purple,
    emissiveIntensity: 0.25,
    flatShading: true,
  });
  for (const s of SEWER_MOUTHS) {
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(84, 46, 38), mouthMat);
    mouth.position.set(s.x, 23, s.y);
    group.add(mouth);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(84, 6, 42), trimMat);
    trim.position.set(s.x, 49, s.y);
    group.add(trim);
  }

  return group;
}

// --- decorative props (instanced, deterministic placement) -----------------

/** Deterministic RNG so the battlefield looks identical every load. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isOnAnyRoute(x: number, y: number, margin: number): boolean {
  if (y < ROUTE_TOP - margin || y > ROUTE_BOTTOM + margin) return false;
  for (const r of Object.values(ROUTES)) {
    if (x >= r.left - margin && x <= r.right + margin) return true;
  }
  return false;
}

function isPropSpotFree(map: MapDefinition, x: number, y: number, allowNeutral: boolean): boolean {
  if (x < 100 || x > map.width - 100 || y < 160 || y > map.height - 160) return false;
  if (isOnAnyRoute(x, y, 40)) return false;
  // Keep bases clean.
  if (x >= BASE_X.left - 40 && x <= BASE_X.right + 40 && (y >= BLUE_BASE_TOP - 40 || y <= RED_BASE_BOTTOM + 40)) {
    return false;
  }
  if (
    !allowNeutral &&
    x >= NEUTRAL_PATCH.left - 40 && x <= NEUTRAL_PATCH.right + 40 &&
    y >= NEUTRAL_PATCH.top - 40 && y <= NEUTRAL_PATCH.bottom + 40
  ) {
    return false;
  }
  for (const w of map.walls) {
    if (x >= w.x - 70 && x <= w.x + w.width + 70 && y >= w.y - 70 && y <= w.y + w.height + 70) return false;
  }
  for (const m of map.markers) {
    const dx = x - m.x;
    const dy = y - m.y;
    const keep = m.radius + 90;
    if (dx * dx + dy * dy < keep * keep) return false;
  }
  return true;
}

/** Instanced trees + rocks scattered on the grass strips between routes. */
function buildProps(map: MapDefinition): THREE.Group {
  const group = new THREE.Group();
  const rng = mulberry32(0x6b0b);

  const TREES = 70;
  const ROCKS = 46;

  const trunkGeo = new THREE.CylinderGeometry(7, 9, 34, 5);
  const foliageGeo = new THREE.ConeGeometry(27, 62, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.treeTrunk, flatShading: true, roughness: 1 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: PALETTE.treeFoliage, flatShading: true, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREES);
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, TREES);

  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  let placed = 0;
  let guard = 0;
  while (placed < TREES && guard < TREES * 60) {
    guard += 1;
    const x = 100 + rng() * (map.width - 200);
    const y = 160 + rng() * (map.height - 320);
    if (!isPropSpotFree(map, x, y, false)) continue;
    const s = 0.75 + rng() * 0.6;
    quat.setFromAxisAngle(up, rng() * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, 17 * s, y), quat, new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(placed, m4);
    m4.compose(new THREE.Vector3(x, (34 + 26) * s, y), quat, new THREE.Vector3(s, s, s));
    foliage.setMatrixAt(placed, m4);
    placed += 1;
  }
  trunks.count = placed;
  foliage.count = placed;
  group.add(trunks, foliage);

  const rockGeo = new THREE.IcosahedronGeometry(1);
  const rockMat = new THREE.MeshStandardMaterial({ color: PALETTE.stoneDark, flatShading: true, roughness: 1 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
  placed = 0;
  guard = 0;
  while (placed < ROCKS && guard < ROCKS * 60) {
    guard += 1;
    const x = 100 + rng() * (map.width - 200);
    const y = 160 + rng() * (map.height - 320);
    if (!isPropSpotFree(map, x, y, true)) continue;
    const s = 8 + rng() * 15;
    quat.setFromAxisAngle(up, rng() * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, s * 0.45, y), quat, new THREE.Vector3(s, s * 0.7, s));
    rocks.setMatrixAt(placed, m4);
    placed += 1;
  }
  rocks.count = placed;
  group.add(rocks);

  return group;
}
