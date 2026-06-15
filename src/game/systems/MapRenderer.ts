import Phaser from 'phaser';
import type { MapDefinition } from '../types';

/** Texture keys for map SVGs from public/assets/map (read-only asset lane). */
export const MAP_TEXTURES = {
  mainRouteTile: 'map_main_route_tile',
  highGroundTile: 'map_high_ground_tile',
  shadowRouteTile: 'map_shadow_route_tile',
  roadCrossing: 'map_road_crossing',
  laneMarkerBlue: 'map_lane_marker_blue',
  laneMarkerRed: 'map_lane_marker_red',
  laneMarkerNeutral: 'map_lane_marker_neutral',
  highGroundRampUp: 'map_high_ground_ramp_up',
  highGroundRampDown: 'map_high_ground_ramp_down',
  sewerEntrance: 'map_sewer_entrance',
  sewerExit: 'map_sewer_exit',
  battlefieldWallStone: 'map_battlefield_wall_stone',
  battlefieldWallBroken: 'map_battlefield_wall_broken',
  chokePointMarker: 'map_choke_point_marker',
  bridgeStone: 'map_bridge_stone',
  bridgeBroken: 'map_bridge_broken',
  spawnPlatformBlue: 'map_spawn_platform_blue',
  spawnPlatformRed: 'map_spawn_platform_red',
  baseFloorBlue: 'map_base_floor_blue',
  baseFloorRed: 'map_base_floor_red',
  neutralGroundPatch: 'map_neutral_ground_patch',
  dangerZoneMarker: 'map_danger_zone_marker',
  movementBlockerMarker: 'map_movement_blocker_marker',
  pathArrowBlue: 'map_path_arrow_blue',
  pathArrowRed: 'map_path_arrow_red',
  pathArrowNeutral: 'map_path_arrow_neutral',
} as const;

export const MAP_TEXTURE_KEYS = Object.values(MAP_TEXTURES);

/** Three-route junction hubs per docs/map-layout-spec.md §3.3 */
export const MAP_ROAD_CROSSINGS = [
  { id: 'blueFork', x: 1500, y: 3550 },
  { id: 'midCross', x: 1500, y: 2100 },
  { id: 'redFork', x: 1500, y: 650 },
] as const;

/** Route bands (px) — main wider/brighter; shadow inset narrower. */
const ROUTE_BANDS = {
  main: { left: 1300, width: 400, top: 650, height: 2950 },
  highGround: { left: 600, width: 450, top: 650, height: 2950 },
  shadow: { left: 2070, width: 280, top: 650, height: 2950 },
} as const;

/** Gate lines — cosmetic wall art flanks playable opening x 1140–1860. */
const GATE_LINES = {
  blue: { y: 3200, leftWallX: 560, rightWallX: 2440 },
  red: { y: 1000, leftWallX: 560, rightWallX: 2440 },
} as const;

const SVG_SOURCES: Array<{ key: string; path: string }> = [
  { key: MAP_TEXTURES.mainRouteTile, path: 'map/main_route_tile.svg' },
  { key: MAP_TEXTURES.highGroundTile, path: 'map/high_ground_tile.svg' },
  { key: MAP_TEXTURES.shadowRouteTile, path: 'map/shadow_route_tile.svg' },
  { key: MAP_TEXTURES.roadCrossing, path: 'map/road_crossing.svg' },
  { key: MAP_TEXTURES.laneMarkerBlue, path: 'map/lane_marker_blue.svg' },
  { key: MAP_TEXTURES.laneMarkerRed, path: 'map/lane_marker_red.svg' },
  { key: MAP_TEXTURES.laneMarkerNeutral, path: 'map/lane_marker_neutral.svg' },
  { key: MAP_TEXTURES.highGroundRampUp, path: 'map/high_ground_ramp_up.svg' },
  { key: MAP_TEXTURES.highGroundRampDown, path: 'map/high_ground_ramp_down.svg' },
  { key: MAP_TEXTURES.sewerEntrance, path: 'map/sewer_entrance.svg' },
  { key: MAP_TEXTURES.sewerExit, path: 'map/sewer_exit.svg' },
  { key: MAP_TEXTURES.battlefieldWallStone, path: 'map/battlefield_wall_stone.svg' },
  { key: MAP_TEXTURES.battlefieldWallBroken, path: 'map/battlefield_wall_broken.svg' },
  { key: MAP_TEXTURES.chokePointMarker, path: 'map/choke_point_marker.svg' },
  { key: MAP_TEXTURES.bridgeStone, path: 'map/bridge_stone.svg' },
  { key: MAP_TEXTURES.bridgeBroken, path: 'map/bridge_broken.svg' },
  { key: MAP_TEXTURES.spawnPlatformBlue, path: 'map/spawn_platform_blue.svg' },
  { key: MAP_TEXTURES.spawnPlatformRed, path: 'map/spawn_platform_red.svg' },
  { key: MAP_TEXTURES.baseFloorBlue, path: 'map/base_floor_blue.svg' },
  { key: MAP_TEXTURES.baseFloorRed, path: 'map/base_floor_red.svg' },
  { key: MAP_TEXTURES.neutralGroundPatch, path: 'map/neutral_ground_patch.svg' },
  { key: MAP_TEXTURES.dangerZoneMarker, path: 'map/danger_zone_marker.svg' },
  { key: MAP_TEXTURES.movementBlockerMarker, path: 'map/movement_blocker_marker.svg' },
  { key: MAP_TEXTURES.pathArrowBlue, path: 'map/path_arrow_blue.svg' },
  { key: MAP_TEXTURES.pathArrowRed, path: 'map/path_arrow_red.svg' },
  { key: MAP_TEXTURES.pathArrowNeutral, path: 'map/path_arrow_neutral.svg' },
];

type RegisterFn = (obj: Phaser.GameObjects.GameObject) => void;

/** Register all map SVG textures. Call from MatchScene preload. */
export function loadMapVisualAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, path } of SVG_SOURCES) {
    if (loader.scene.textures.exists(key)) continue;
    loader.svg(key, `assets/${path}`, { width: 256, height: 256 });
  }
}

/** World-space map art for the three-route battlefield (visual only). */
export class MapRenderer {
  private scene: Phaser.Scene;
  private register: RegisterFn;
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, register: RegisterFn) {
    this.scene = scene;
    this.register = register;
  }

  public build(map: MapDefinition): void {
    this.paintBaseFloors(map);
    this.paintRouteLanes(map);
    this.placeStructures(map);
    this.placeGuideMarkers(map);
  }

  public destroy(): void {
    for (const obj of this.objects) {
      obj.destroy();
    }
    this.objects = [];
  }

  public getObjectCount(): number {
    return this.objects.length;
  }

  public getRoadCrossingCount(): number {
    return MAP_ROAD_CROSSINGS.length;
  }

  public static countLoadedTextures(scene: Phaser.Scene): number {
    return MAP_TEXTURE_KEYS.filter((key) => scene.textures.exists(key)).length;
  }

  private placeImage(
    texture: string,
    x: number,
    y: number,
    displaySize: number,
    depth: number,
    rotation = 0,
    alpha = 1,
    displayHeight?: number,
  ): void {
    if (!this.scene.textures.exists(texture)) return;

    const img = this.scene.add.image(x, y, texture).setOrigin(0.5).setDepth(depth).setRotation(rotation).setAlpha(alpha);

    if (displayHeight !== undefined) {
      img.setDisplaySize(displaySize, displayHeight);
    } else {
      img.setDisplaySize(displaySize, displaySize);
    }

    this.register(img);
    this.objects.push(img);
  }

  private tileRect(
    texture: string,
    left: number,
    top: number,
    width: number,
    height: number,
    depth: number,
    tileSize = 128,
  ): void {
    for (let y = top + tileSize / 2; y < top + height; y += tileSize) {
      for (let x = left + tileSize / 2; x < left + width; x += tileSize) {
        this.placeImage(texture, x, y, tileSize, depth);
      }
    }
  }

  private paintBaseFloors(map: MapDefinition): void {
    const cx = map.width / 2;
    // Blue base below y ≈ 3350
    this.tileRect(MAP_TEXTURES.baseFloorBlue, cx - 600, map.height - 1050, 1200, 1050, -55);
    // Red base above y ≈ 850
    this.tileRect(MAP_TEXTURES.baseFloorRed, cx - 600, 0, 1200, 850, -55);
    // Sparse midfield neutral (not full blanket)
    this.tileRect(MAP_TEXTURES.neutralGroundPatch, cx - 400, 1500, 800, 1200, -54, 192);
  }

  private paintRouteLanes(_map: MapDefinition): void {
    const main = ROUTE_BANDS.main;
    const high = ROUTE_BANDS.highGround;
    const shadow = ROUTE_BANDS.shadow;

    // Main / Army — widest, brightest (400 px band)
    this.tileRect(MAP_TEXTURES.mainRouteTile, main.left, main.top, main.width, main.height, -45);

    // High Ground — left flank, elevated stone (450 px band)
    this.tileRect(MAP_TEXTURES.highGroundTile, high.left, high.top, high.width, high.height, -44);

    // Shadow / Sewer — right flank, inset narrower (~280 px)
    this.tileRect(MAP_TEXTURES.shadowRouteTile, shadow.left, shadow.top, shadow.width, shadow.height, -44);

    // Three junction hubs
    for (const crossing of MAP_ROAD_CROSSINGS) {
      this.placeImage(MAP_TEXTURES.roadCrossing, crossing.x, crossing.y, 208, -40);
    }
  }

  private placeStructures(_map: MapDefinition): void {
    const cx = 1500;

    this.placeImage(MAP_TEXTURES.spawnPlatformBlue, cx, 3900, 220, -35);
    this.placeImage(MAP_TEXTURES.spawnPlatformRed, cx, 300, 220, -35);

    // High ground ramps (left flank x ≈ 820)
    this.placeImage(MAP_TEXTURES.highGroundRampUp, 820, 3400, 112, -38);
    this.placeImage(MAP_TEXTURES.highGroundRampUp, 820, 2300, 112, -38);
    this.placeImage(MAP_TEXTURES.highGroundRampDown, 820, 1200, 112, -38);

    // Sewer IO (right flank x ≈ 2150)
    this.placeImage(MAP_TEXTURES.sewerEntrance, 2150, 3550, 112, -38);
    this.placeImage(MAP_TEXTURES.sewerEntrance, 2150, 2300, 112, -38);
    this.placeImage(MAP_TEXTURES.sewerExit, 2150, 1200, 112, -38);

    // Gate wall art — flanking collision segments, not in playable gap (1140–1860)
    for (const gate of [GATE_LINES.blue, GATE_LINES.red]) {
      this.placeImage(MAP_TEXTURES.battlefieldWallStone, gate.leftWallX, gate.y - 10, 200, -36, 0, 0.85, 72);
      this.placeImage(MAP_TEXTURES.battlefieldWallStone, gate.rightWallX, gate.y - 10, 200, -36, 0, 0.85, 72);
    }

    // Siege ruins rubble at mid cross
    this.placeImage(MAP_TEXTURES.battlefieldWallBroken, cx - 180, 2100, 120, -34, 0, 0.7);
    this.placeImage(MAP_TEXTURES.battlefieldWallBroken, cx + 180, 2100, 120, -34, 0, 0.7);
    this.placeImage(MAP_TEXTURES.chokePointMarker, 900, 2550, 120, -33, 0, 0.45);
    this.placeImage(MAP_TEXTURES.chokePointMarker, 2100, 2550, 120, -33, 0, 0.45);
  }

  private placeGuideMarkers(_map: MapDefinition): void {
    // Lane pennants at first fork + mid only (no red pennant — reduces noise)
    this.placeImage(MAP_TEXTURES.laneMarkerBlue, 1280, 3550, 72, -20, 0, 0.9);
    this.placeImage(MAP_TEXTURES.laneMarkerNeutral, 1500, 2100, 68, -20, 0, 0.85);

    // Main-route path hints only (3 arrows on center spine)
    const mainArrows: Array<{ y: number; alpha: number }> = [
      { y: 3750, alpha: 0.85 },
      { y: 3550, alpha: 0.75 },
      { y: 2800, alpha: 0.55 },
    ];
    for (const arrow of mainArrows) {
      this.placeImage(MAP_TEXTURES.pathArrowBlue, 1500, arrow.y, 56, -18, -Math.PI / 2, arrow.alpha);
    }
  }
}
