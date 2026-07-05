import * as THREE from 'three';
import { COLORS } from '../game/constants';
import type { MapDefinition, MapMarker } from '../game/types';

// Phase 6A: placeholder 3D map built straight from MapDefinition.
//
// Coordinate mapping (the one rule of the 2.5D port): 2D (x, y) → 3D (x, 0, z)
// with z = y. Blue base ends up at large z (camera side), red base far away.
//
// Everything here is intentionally primitive (flat-shaded boxes/discs) — real
// low-poly structures land in Phase 6B. The wall boxes must stay exactly on
// the WallRect colliders so what you see is what blocks you.

const WALL_HEIGHT = 140;

export function buildMap(map: MapDefinition): THREE.Group {
  const group = new THREE.Group();
  group.add(buildGround(map));
  group.add(buildWalls(map));
  for (const marker of map.markers) {
    group.add(buildMarkerDisc(marker));
  }
  return group;
}

/** Checkered ground plane — cheap depth/motion cue until 6B terrain. */
function buildGround(map: MapDefinition): THREE.Mesh {
  const cell = 100; // world units per checker cell
  const cols = Math.round(map.width / cell);
  const rows = Math.round(map.height / cell);

  const geo = new THREE.PlaneGeometry(map.width, map.height, cols, rows).toNonIndexed();
  const pos = geo.getAttribute('position');
  const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3);

  const base = new THREE.Color(COLORS.ground);
  const alt = base.clone().multiplyScalar(1.14);
  const c = new THREE.Color();

  // PlaneGeometry is built in XY before rotation; derive the checker cell from
  // each triangle's centroid so all 3 vertices of a face share one color.
  for (let tri = 0; tri < pos.count; tri += 3) {
    const cx = (pos.getX(tri) + pos.getX(tri + 1) + pos.getX(tri + 2)) / 3;
    const cy = (pos.getY(tri) + pos.getY(tri + 1) + pos.getY(tri + 2)) / 3;
    const ix = Math.floor((cx + map.width / 2) / cell);
    const iy = Math.floor((cy + map.height / 2) / cell);
    c.copy((ix + iy) % 2 === 0 ? base : alt);
    for (let v = 0; v < 3; v++) {
      colorAttr.setXYZ(tri + v, c.r, c.g, c.b);
    }
  }
  geo.setAttribute('color', colorAttr);

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.rotation.x = -Math.PI / 2;
  // Plane is centered at origin; shift so 2D (0,0) = 3D (0,0) top-left.
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

/** Flat colored disc marking each objective location (verifies coordinates
 * against the 2D map; replaced by real structures in 6B). */
function buildMarkerDisc(marker: MapMarker): THREE.Mesh {
  const color =
    marker.type === 'core' ? COLORS.core :
    marker.type === 'gate' ? COLORS.gate :
    marker.team === 'blue' ? COLORS.blue :
    marker.team === 'red' ? COLORS.red :
    COLORS.neutral;

  const geo = new THREE.CylinderGeometry(marker.radius, marker.radius, 4, 28);
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.75 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(marker.x, 2, marker.y);
  return mesh;
}
