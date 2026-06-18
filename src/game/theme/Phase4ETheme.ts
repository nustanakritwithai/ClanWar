import Phaser from 'phaser';

/**
 * Phase 4E Theme 1 (Castle Siege Field) runtime reskin wiring.
 *
 * Source assets: public/assets/phase-4e/theme1/** (Agent B, PR #51 — read-only).
 * Source specs: docs/phase-4e-visual-design-spec.md (Agent C),
 * docs/phase-4e-mobile-hud-ux-spec.md (Agent D), docs/phase-4e-asset-pack.md (Agent B).
 *
 * This module is visual-only: it maps mock SVGs to namespaced texture keys and
 * loads them. It does not implement any gameplay rule, state machine, or
 * scoring logic — those stay owned by ObjectiveSystem / CaptureSystem /
 * SiegeBuffSystem / MatchTimerSystem / CombatSystem, unchanged.
 *
 * Toggle: flip PHASE4E_THEME1_ENABLED to false to fully restore the pre-4E
 * legacy visuals (every call site falls back to its original texture/behavior).
 */
export const PHASE4E_THEME1_ENABLED = true;

const ASSET_DIR = 'phase-4e/theme1';

/** Namespaced Phaser texture keys for Theme 1 (avoids colliding with any existing runtime key). */
export const PHASE4E_THEME1_TEXTURES = {
  // UI / HUD
  uiHudPanel: 'phase4e_theme1_ui_hud_panel',
  uiTimerScoreChip: 'phase4e_theme1_ui_timer_score_chip',
  uiObjectivePlaque: 'phase4e_theme1_ui_objective_plaque',
  uiJoystickFrame: 'phase4e_theme1_ui_joystick_frame',
  uiAttackButtonFrame: 'phase4e_theme1_ui_attack_button_frame',
  uiSkillButtonFrame: 'phase4e_theme1_ui_skill_button_frame',
  uiCaptureHudPanel: 'phase4e_theme1_ui_capture_hud_panel',
  uiSiegeBuffBadge: 'phase4e_theme1_ui_siege_buff_badge',
  uiResultPanel: 'phase4e_theme1_ui_result_panel',
  // Structures — Gate
  objGateIdle: 'phase4e_theme1_obj_gate_idle',
  objGateHit: 'phase4e_theme1_obj_gate_hit',
  objGateDamaged: 'phase4e_theme1_obj_gate_damaged',
  objGateBreached: 'phase4e_theme1_obj_gate_breached',
  objGateDestroyed: 'phase4e_theme1_obj_gate_destroyed',
  // Structures — Core
  objCoreProtected: 'phase4e_theme1_obj_core_protected',
  objCoreVulnerable: 'phase4e_theme1_obj_core_vulnerable',
  objCoreHit: 'phase4e_theme1_obj_core_hit',
  objCoreLow: 'phase4e_theme1_obj_core_low',
  objCoreDestroyed: 'phase4e_theme1_obj_core_destroyed',
  // Structures — Capture Point
  objCaptureNeutral: 'phase4e_theme1_obj_capture_neutral',
  objCapturePlayer: 'phase4e_theme1_obj_capture_player',
  objCaptureEnemy: 'phase4e_theme1_obj_capture_enemy',
  objCaptureContested: 'phase4e_theme1_obj_capture_contested',
  // Characters (existing 5-class roster only — rogue/summoner are locked/future-art previews)
  charGuardianIdle: 'phase4e_theme1_char_guardian_idle',
  charWarriorIdle: 'phase4e_theme1_char_warrior_idle',
  charRangerIdle: 'phase4e_theme1_char_ranger_idle',
  charMageIdle: 'phase4e_theme1_char_mage_idle',
  charPriestIdle: 'phase4e_theme1_char_priest_idle',
  charRogueIdle: 'phase4e_theme1_char_rogue_idle',
  charSummonerIdle: 'phase4e_theme1_char_summoner_idle',
  // VFX
  vfxNormalHitSpark: 'phase4e_theme1_vfx_normal_hit_spark',
  vfxGateHitSpark: 'phase4e_theme1_vfx_gate_hit_spark',
  vfxCoreHitPulse: 'phase4e_theme1_vfx_core_hit_pulse',
  vfxSkillCastFlash: 'phase4e_theme1_vfx_skill_cast_flash',
  vfxImpactRing: 'phase4e_theme1_vfx_impact_ring',
  vfxDeniedFlash: 'phase4e_theme1_vfx_denied_flash',
  vfxCapturePulse: 'phase4e_theme1_vfx_capture_pulse',
  // Environment
  bgCastleParallax: 'phase4e_theme1_bg_castle_parallax',
  bgSiegeSmokeParallax: 'phase4e_theme1_bg_siege_smoke_parallax',
  tileGroundGrass: 'phase4e_theme1_tile_ground_grass',
  tileGroundDirt: 'phase4e_theme1_tile_ground_dirt',
  tileStonePath: 'phase4e_theme1_tile_stone_path',
  tileBrokenWall: 'phase4e_theme1_tile_broken_wall',
  propBannerBlue: 'phase4e_theme1_prop_banner_blue',
  propBannerRed: 'phase4e_theme1_prop_banner_red',
  propCrystalSmall: 'phase4e_theme1_prop_crystal_small',
  propRuinStone: 'phase4e_theme1_prop_ruin_stone',
} as const;

interface SvgSource {
  key: string;
  file: string;
  width: number;
  height: number;
}

// Dimensions match the authored SVG viewBox in public/assets/phase-4e/theme1/
// (see docs/phase-4e-asset-manifest.md). Mockups (915x412 / 800x360) and the
// manifest.json self-entry are documentation-only and intentionally excluded
// from runtime loading.
const SVG_SOURCES: SvgSource[] = [
  { key: PHASE4E_THEME1_TEXTURES.uiHudPanel, file: 'phase4e_ui_hud_panel.svg', width: 320, height: 56 },
  { key: PHASE4E_THEME1_TEXTURES.uiTimerScoreChip, file: 'phase4e_ui_timer_score_chip.svg', width: 160, height: 40 },
  { key: PHASE4E_THEME1_TEXTURES.uiObjectivePlaque, file: 'phase4e_ui_objective_plaque.svg', width: 300, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.uiJoystickFrame, file: 'phase4e_ui_joystick_frame.svg', width: 96, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.uiAttackButtonFrame, file: 'phase4e_ui_attack_button_frame.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.uiSkillButtonFrame, file: 'phase4e_ui_skill_button_frame.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.uiCaptureHudPanel, file: 'phase4e_ui_capture_hud_panel.svg', width: 180, height: 56 },
  { key: PHASE4E_THEME1_TEXTURES.uiSiegeBuffBadge, file: 'phase4e_ui_siege_buff_badge.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.uiResultPanel, file: 'phase4e_ui_result_panel.svg', width: 280, height: 160 },

  { key: PHASE4E_THEME1_TEXTURES.objGateIdle, file: 'phase4e_obj_gate_idle.svg', width: 128, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objGateHit, file: 'phase4e_obj_gate_hit.svg', width: 128, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objGateDamaged, file: 'phase4e_obj_gate_damaged.svg', width: 128, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objGateBreached, file: 'phase4e_obj_gate_breached.svg', width: 128, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objGateDestroyed, file: 'phase4e_obj_gate_destroyed.svg', width: 128, height: 96 },

  { key: PHASE4E_THEME1_TEXTURES.objCoreProtected, file: 'phase4e_obj_core_protected.svg', width: 96, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objCoreVulnerable, file: 'phase4e_obj_core_vulnerable.svg', width: 96, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objCoreHit, file: 'phase4e_obj_core_hit.svg', width: 96, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objCoreLow, file: 'phase4e_obj_core_low.svg', width: 96, height: 96 },
  { key: PHASE4E_THEME1_TEXTURES.objCoreDestroyed, file: 'phase4e_obj_core_destroyed.svg', width: 96, height: 96 },

  { key: PHASE4E_THEME1_TEXTURES.objCaptureNeutral, file: 'phase4e_obj_capture_neutral.svg', width: 80, height: 80 },
  { key: PHASE4E_THEME1_TEXTURES.objCapturePlayer, file: 'phase4e_obj_capture_player.svg', width: 80, height: 80 },
  { key: PHASE4E_THEME1_TEXTURES.objCaptureEnemy, file: 'phase4e_obj_capture_enemy.svg', width: 80, height: 80 },
  { key: PHASE4E_THEME1_TEXTURES.objCaptureContested, file: 'phase4e_obj_capture_contested.svg', width: 80, height: 80 },

  { key: PHASE4E_THEME1_TEXTURES.charGuardianIdle, file: 'phase4e_char_guardian_idle.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.charWarriorIdle, file: 'phase4e_char_warrior_idle.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.charRangerIdle, file: 'phase4e_char_ranger_idle.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.charMageIdle, file: 'phase4e_char_mage_idle.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.charPriestIdle, file: 'phase4e_char_priest_idle.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.charRogueIdle, file: 'phase4e_char_rogue_idle.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.charSummonerIdle, file: 'phase4e_char_summoner_idle.svg', width: 48, height: 48 },

  { key: PHASE4E_THEME1_TEXTURES.vfxNormalHitSpark, file: 'phase4e_vfx_normal_hit_spark.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.vfxGateHitSpark, file: 'phase4e_vfx_gate_hit_spark.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.vfxCoreHitPulse, file: 'phase4e_vfx_core_hit_pulse.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.vfxSkillCastFlash, file: 'phase4e_vfx_skill_cast_flash.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.vfxImpactRing, file: 'phase4e_vfx_impact_ring.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.vfxDeniedFlash, file: 'phase4e_vfx_denied_flash.svg', width: 64, height: 64 },
  { key: PHASE4E_THEME1_TEXTURES.vfxCapturePulse, file: 'phase4e_vfx_capture_pulse.svg', width: 64, height: 64 },

  { key: PHASE4E_THEME1_TEXTURES.bgCastleParallax, file: 'phase4e_bg_castle_parallax.svg', width: 480, height: 270 },
  { key: PHASE4E_THEME1_TEXTURES.bgSiegeSmokeParallax, file: 'phase4e_bg_siege_smoke_parallax.svg', width: 480, height: 270 },
  { key: PHASE4E_THEME1_TEXTURES.tileGroundGrass, file: 'phase4e_tile_ground_grass.svg', width: 32, height: 32 },
  { key: PHASE4E_THEME1_TEXTURES.tileGroundDirt, file: 'phase4e_tile_ground_dirt.svg', width: 32, height: 32 },
  { key: PHASE4E_THEME1_TEXTURES.tileStonePath, file: 'phase4e_tile_stone_path.svg', width: 32, height: 32 },
  { key: PHASE4E_THEME1_TEXTURES.tileBrokenWall, file: 'phase4e_tile_broken_wall.svg', width: 48, height: 48 },
  { key: PHASE4E_THEME1_TEXTURES.propBannerBlue, file: 'phase4e_prop_banner_blue.svg', width: 32, height: 56 },
  { key: PHASE4E_THEME1_TEXTURES.propBannerRed, file: 'phase4e_prop_banner_red.svg', width: 32, height: 56 },
  { key: PHASE4E_THEME1_TEXTURES.propCrystalSmall, file: 'phase4e_prop_crystal_small.svg', width: 24, height: 24 },
  { key: PHASE4E_THEME1_TEXTURES.propRuinStone, file: 'phase4e_prop_ruin_stone.svg', width: 40, height: 32 },
];

/** Register Theme 1 SVG textures. Call once from MatchScene.preload(). */
export function loadPhase4eTheme1Assets(loader: Phaser.Loader.LoaderPlugin): void {
  if (!PHASE4E_THEME1_ENABLED) return;
  for (const { key, file, width, height } of SVG_SOURCES) {
    if (loader.scene.textures.exists(key)) continue;
    loader.svg(key, `assets/${ASSET_DIR}/${file}`, { width, height });
  }
}

/** True when a themed texture is loaded and safe to use; lets callers fall back cleanly. */
export function hasPhase4eTexture(scene: Phaser.Scene, key: string): boolean {
  return PHASE4E_THEME1_ENABLED && scene.textures.exists(key);
}

/**
 * Resolve a legacy VFX texture key to its Phase 4E equivalent when available,
 * else return the legacy key unchanged. Used only at the 5 combat-feel VFX
 * call sites named in the Phase 4E runtime work order — all other VFX
 * (heal, slash, AoE, projectiles, legacy hit spark) are intentionally left
 * untouched.
 */
const VFX_THEME_MAP: Record<string, string> = {
  vfx_hit_spark: PHASE4E_THEME1_TEXTURES.vfxNormalHitSpark,
  vfx_gate_hit_spark: PHASE4E_THEME1_TEXTURES.vfxGateHitSpark,
  vfx_core_hit_pulse: PHASE4E_THEME1_TEXTURES.vfxCoreHitPulse,
  vfx_skill_cast_flash: PHASE4E_THEME1_TEXTURES.vfxSkillCastFlash,
  vfx_impact_ring: PHASE4E_THEME1_TEXTURES.vfxImpactRing,
};

export function resolvePhase4eVfxTexture(scene: Phaser.Scene, legacyKey: string): string {
  const themed = VFX_THEME_MAP[legacyKey];
  if (themed && hasPhase4eTexture(scene, themed)) return themed;
  return legacyKey;
}

/** Character texture key for an existing roster class, or undefined if not (yet) themed. */
const CHARACTER_THEME_MAP: Partial<Record<string, string>> = {
  guardian: PHASE4E_THEME1_TEXTURES.charGuardianIdle,
  warrior: PHASE4E_THEME1_TEXTURES.charWarriorIdle,
  ranger: PHASE4E_THEME1_TEXTURES.charRangerIdle,
  mage: PHASE4E_THEME1_TEXTURES.charMageIdle,
  priest: PHASE4E_THEME1_TEXTURES.charPriestIdle,
};

export function resolvePhase4eCharacterTexture(scene: Phaser.Scene, heroClass: string): string | undefined {
  const themed = CHARACTER_THEME_MAP[heroClass];
  if (themed && hasPhase4eTexture(scene, themed)) return themed;
  return undefined;
}
