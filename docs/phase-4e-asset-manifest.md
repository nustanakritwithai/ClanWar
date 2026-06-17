# Phase 4E Asset Manifest — Theme 1: Castle Siege Field

> Readable table form of `public/assets/phase-4e/theme1/manifest.json`.
> Machine-readable JSON is authoritative; this doc mirrors it for review.

**Total assets:** 49 (+ `manifest.json` itself)

All `runtime_status` values in this pack are `not wired` (or, for the two
documentation mockups, `documentation only - not a runtime asset`). No asset
in this manifest is registered with any Phaser loader or scene by this PR.

## A. UI / HUD

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_ui_hud_panel.svg` | Generic top HUD strip background panel | `phase4e_ui_hud_panel` | Zone A - top HUD strip | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_timer_score_chip.svg` | Timer and Objective Score chip | `phase4e_ui_timer_score_chip` | Zone A - top HUD strip | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_objective_plaque.svg` | Objective prompt plaque/frame | `phase4e_ui_objective_plaque` | Zone B - objective prompt band | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_joystick_frame.svg` | Joystick base ring frame | `phase4e_ui_joystick_frame` | Zone C - joystick area | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_attack_button_frame.svg` | Attack button frame | `phase4e_ui_attack_button_frame` | Zone D - attack/skill cluster | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_skill_button_frame.svg` | Skill button frame | `phase4e_ui_skill_button_frame` | Zone D - attack/skill cluster | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_capture_hud_panel.svg` | Capture HUD panel (progress arc) | `phase4e_ui_capture_hud_panel` | Zone I - capture point HUD | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_siege_buff_badge.svg` | Siege Buff badge icon | `phase4e_ui_siege_buff_badge` | Zone G - siege buff badge | Agent C visual spec Section H / Agent D UX spec Section 5 | — |
| `phase4e_ui_result_panel.svg` | Result screen frame (victory/defeat/draw) | `phase4e_ui_result_panel` | Zone F - result screen | Agent C visual spec Section H / Agent D UX spec Section 5 | — |

## B1. Structure — Gate

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_obj_gate_idle.svg` | Gate idle/intact state | `phase4e_obj_gate_idle` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_gate_hit.svg` | Gate hit feedback state (4D hit tier) | `phase4e_obj_gate_hit` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_gate_damaged.svg` | Gate damaged/cracked state | `phase4e_obj_gate_damaged` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_gate_breached.svg` | Gate breached state | `phase4e_obj_gate_breached` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_gate_destroyed.svg` | Gate destroyed/rubble state | `phase4e_obj_gate_destroyed` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |

## B2. Structure — Core

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_obj_core_protected.svg` | Core protected state (shield ring active) | `phase4e_obj_core_protected` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_core_vulnerable.svg` | Core vulnerable state (post gate-breach) | `phase4e_obj_core_vulnerable` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_core_hit.svg` | Core hit feedback state (4D hit tier) | `phase4e_obj_core_hit` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_core_low.svg` | Core low-HP warning state | `phase4e_obj_core_low` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |
| `phase4e_obj_core_destroyed.svg` | Core destroyed state (match end) | `phase4e_obj_core_destroyed` | Zone H - Gate/Core world visual | Agent C visual spec Section F | — |

## B3. Structure — Capture Point

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_obj_capture_neutral.svg` | Capture point neutral state | `phase4e_obj_capture_neutral` | Zone I - capture point zone | Agent C visual spec Section F | — |
| `phase4e_obj_capture_player.svg` | Capture point captured-by-player state | `phase4e_obj_capture_player` | Zone I - capture point zone | Agent C visual spec Section F | — |
| `phase4e_obj_capture_enemy.svg` | Capture point captured-by-enemy state | `phase4e_obj_capture_enemy` | Zone I - capture point zone | Agent C visual spec Section F | — |
| `phase4e_obj_capture_contested.svg` | Capture point contested state | `phase4e_obj_capture_contested` | Zone I - capture point zone | Agent C visual spec Section F | — |

## C. Character class concepts

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_char_guardian_idle.svg` | Guardian (tank) idle concept sprite | `phase4e_char_guardian_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Team color applied via runtime tint overlay, not baked into asset. |
| `phase4e_char_warrior_idle.svg` | Warrior (berserker) idle concept sprite | `phase4e_char_warrior_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Team color applied via runtime tint overlay, not baked into asset. |
| `phase4e_char_ranger_idle.svg` | Ranger (archer) idle concept sprite | `phase4e_char_ranger_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Team color applied via runtime tint overlay, not baked into asset. |
| `phase4e_char_mage_idle.svg` | Mage (arcanist) idle concept sprite | `phase4e_char_mage_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Team color applied via runtime tint overlay, not baked into asset. |
| `phase4e_char_priest_idle.svg` | Priest (cleric) idle concept sprite | `phase4e_char_priest_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Team color applied via runtime tint overlay, not baked into asset. |
| `phase4e_char_rogue_idle.svg` | Rogue idle concept sprite (optional, future-art-only, not added to runtime class roster) | `phase4e_char_rogue_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Optional concept asset; class not implemented in runtime in Phase 4E. |
| `phase4e_char_summoner_idle.svg` | Summoner idle concept sprite (optional, future-art-only, not added to runtime class roster) | `phase4e_char_summoner_idle` | Zone E - center combat readable zone | Agent C visual spec Section E | Optional concept asset; class not implemented in runtime in Phase 4E. |

## D. VFX mocks

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_vfx_normal_hit_spark.svg` | Normal hit spark (smallest tier, L1) | `phase4e_vfx_normal_hit_spark` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |
| `phase4e_vfx_gate_hit_spark.svg` | Gate hit spark (medium tier, L3) | `phase4e_vfx_gate_hit_spark` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |
| `phase4e_vfx_core_hit_pulse.svg` | Core hit pulse (strongest contained tier, L4) | `phase4e_vfx_core_hit_pulse` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |
| `phase4e_vfx_skill_cast_flash.svg` | Skill cast flash (short, local, at caster feet) | `phase4e_vfx_skill_cast_flash` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |
| `phase4e_vfx_impact_ring.svg` | Impact ring (gate/core destroy, short readable ring) | `phase4e_vfx_impact_ring` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |
| `phase4e_vfx_denied_flash.svg` | Denied/blocked action flash | `phase4e_vfx_denied_flash` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |
| `phase4e_vfx_capture_pulse.svg` | Capture feedback pulse (team-color ground arc) | `phase4e_vfx_capture_pulse` | Zone E - center combat readable zone (short-lived only) | Agent C visual spec Section I / Phase 4D intensity ladder | — |

## E. Environment / tiles (Theme 1: Castle Siege Field)

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_tile_ground_grass.svg` | Ground tile - grass (32x32 seamless) | `phase4e_tile_ground_grass` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_tile_ground_dirt.svg` | Ground tile - dirt (32x32 seamless) | `phase4e_tile_ground_dirt` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_tile_stone_path.svg` | Ground tile - stone path (32x32 seamless) | `phase4e_tile_stone_path` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_tile_broken_wall.svg` | Broken wall tile/prop (no collision) | `phase4e_tile_broken_wall` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_prop_banner_blue.svg` | Decorative blue team banner prop | `phase4e_prop_banner_blue` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_prop_banner_red.svg` | Decorative red team banner prop | `phase4e_prop_banner_red` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_prop_crystal_small.svg` | Small decorative crystal prop (distinct from Core) | `phase4e_prop_crystal_small` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_prop_ruin_stone.svg` | Decorative ruin/rubble prop (no collision) | `phase4e_prop_ruin_stone` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_bg_castle_parallax.svg` | Castle Siege Field parallax background layer | `phase4e_bg_castle_parallax` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |
| `phase4e_bg_siege_smoke_parallax.svg` | Siege smoke parallax overlay layer (low opacity) | `phase4e_bg_siege_smoke_parallax` | Zone 9 (environment/parallax, lowest HUD priority, must not reduce contrast) | Agent C visual spec Section G (Theme 1: Castle Siege Field) | — |

## F. Annotated mockups

| Filename | Intended use | Candidate key | Safe zone | Source | Notes |
|---|---|---|---|---|---|
| `phase4e_mockup_915x412.svg` | Annotated safe-zone mockup, 915x412 landscape | `phase4e_mockup_915x412` | All zones (documentation overlay) | Agent D UX spec Sections 3-4 | Annotation labels permitted (documentation asset, not in-game player-facing UI). |
| `phase4e_mockup_800x360.svg` | Annotated safe-zone mockup, 800x360 compact | `phase4e_mockup_800x360` | All zones (documentation overlay) | Agent D UX spec Sections 3-4 | Annotation labels permitted (documentation asset, not in-game player-facing UI). |

## Manifest fields

| Field | Meaning |
|---|---|
| `filename` | Asset file name, always prefixed `phase4e_` |
| `category` | Asset group (ui, structure-gate/core/capture, character, vfx, environment, mockup) |
| `intended_use` | What the asset is meant to depict |
| `candidate_key` | Proposed future runtime texture key — **not registered by this PR** |
| `runtime_status` | Always `not wired` in this PR; never claims integration |
| `safe_zone` | Agent D safe-zone / z-depth layer the asset is intended for |
| `source` | Governing spec section (Agent C visual spec / Agent D UX spec) |
| `notes` | Caveats — e.g. optional/future-art-only classes, team-color method |

## Out of scope (confirmed absent from this manifest)

bot AI, economy, EXP, Gold, shop, ranking, reward currency, minimap, route
arrows, lane tracker, edge indicators, respawn, vision/fog, multiplayer,
login, clan, payment, tutorial overhaul, new objective type, Agent A runtime
wiring, Phase 5A assets.
