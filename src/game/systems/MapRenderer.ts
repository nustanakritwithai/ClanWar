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
  ): void {
    if (!this.scene.textures.exists(texture)) return;

    const img = this.scene.add
      .image(x, y, texture)
      .setDisplaySize(displaySize, displaySize)
      .setOrigin(0.5)
      .setDepth(depth)
      .setRotation(rotation)
      .setAlpha(alpha);

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
    // Blue base (bottom)
    this.tileRect(MAP_TEXTURES.baseFloorBlue, cx - 600, map.height - 1200, 1200, 1200, -55);
    // Red base (top)
    this.tileRect(MAP_TEXTURES.baseFloorRed, cx - 600, 0, 1200, 1200, -55);
    // Midfield neutral patches
    this.tileRect(MAP_TEXTURES.neutralGroundPatch, cx - 500, 1200, 1000, 1800, -54, 160);
  }

  private paintRouteLanes(map: MapDefinition): void {
    const cx = map.width / 2;

    // Main / Army route — center column
    this.tileRect(MAP_TEXTURES.mainRouteTile, cx - 120, 900, 240, 2400, -45);

    // High Ground route — left flank
    this.tileRect(MAP_TEXTURES.highGroundTile, cx - 520, 900, 200, 2400, -44);

    // Shadow / Sewer route — right flank
    this.tileRect(MAP_TEXTURES.shadowRouteTile, cx + 320, 900, 200, 2400, -44);

    // Three-route junction at siege ruins
    this.placeImage(MAP_TEXTURES.roadCrossing, cx, 2100, 224, -40);
  }

  private placeStructures(map: MapDefinition): void {
    const cx = map.width / 2;

    // Spawn platforms
    this.placeImage(MAP_TEXTURES.spawnPlatformBlue, cx, 3900, 220, -35);
    this.placeImage(MAP_TEXTURES.spawnPlatformRed, cx, 300, 220, -35);

    // High ground ramps (left route)
    this.placeImage(MAP_TEXTURES.highGroundRampUp, cx - 420, 2800, 112, -38);
    this.placeImage(MAP_TEXTURES.highGroundRampDown, cx - 420, 1400, 112, -38);

    // Sewer entrance / exit (right route)
    this.placeImage(MAP_TEXTURES.sewerEntrance, cx + 420, 3000, 112, -38);
    this.placeImage(MAP_TEXTURES.sewerExit, cx + 420, 1200, 112, -38);

    // Gate-line walls (visual only — physics walls unchanged)
    this.placeImage(MAP_TEXTURES.battlefieldWallStone, cx - 500, 3200, 180, -36);
    this.placeImage(MAP_TEXTURES.battlefieldWallStone, cx + 500, 3200, 180, -36);
    this.placeImage(MAP_TEXTURES.battlefieldWallStone, cx - 500, 1000, 180, -36);
    this.placeImage(MAP_TEXTURES.battlefieldWallStone, cx + 500, 1000, 180, -36);

    // Siege ruins rubble + choke
    this.placeImage(MAP_TEXTURES.battlefieldWallBroken, cx - 200, 2100, 140, -34);
    this.placeImage(MAP_TEXTURES.battlefieldWallBroken, cx + 200, 2100, 140, -34);
    this.placeImage(MAP_TEXTURES.chokePointMarker, cx, 2550, 160, -33, 0, 0.75);

    // Bridges linking routes
    this.placeImage(MAP_TEXTURES.bridgeStone, cx - 280, 1700, 192, -34, Math.PI / 2);
    this.placeImage(MAP_TEXTURES.bridgeStone, cx + 280, 1700, 192, -34, Math.PI / 2);
    this.placeImage(MAP_TEXTURES.bridgeBroken, cx + 420, 2100, 160, -33, Math.PI / 2, 0.85);
  }

  private placeGuideMarkers(map: MapDefinition): void {
    const cx = map.width / 2;

    // Lane pennants at route branches
    this.placeImage(MAP_TEXTURES.laneMarkerBlue, cx - 280, 3500, 80, -20);
    this.placeImage(MAP_TEXTURES.laneMarkerRed, cx - 280, 700, 80, -20);
    this.placeImage(MAP_TEXTURES.laneMarkerNeutral, cx, 2100, 72, -20);

    // Path guide arrows (visual only — not pathfinding)
    this.placeImage(MAP_TEXTURES.pathArrowBlue, cx, 3600, 64, -18, -Math.PI / 2);
    this.placeImage(MAP_TEXTURES.pathArrowRed, cx, 500, 64, -18, Math.PI / 2);
    this.placeImage(MAP_TEXTURES.pathArrowBlue, cx - 420, 2400, 56, -18, -Math.PI / 2, 0.8);
    this.placeImage(MAP_TEXTURES.pathArrowRed, cx - 420, 800, 56, -18, Math.PI / 2, 0.8);
    this.placeImage(MAP_TEXTURES.pathArrowNeutral, cx + 420, 2400, 56, -18, -Math.PI / 2, 0.75);
    this.placeImage(MAP_TEXTURES.pathArrowNeutral, cx + 420, 800, 56, -18, Math.PI / 2, 0.75);
  }
}
