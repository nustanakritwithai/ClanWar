# Agent A — Phase 4E Runtime Reskin Integration Report

> **Repo:** [nustanakritwithai/ClanWar](https://github.com/nustanakritwithai/ClanWar)
> **Date:** 2026-06-17
> **Mode:** Runtime reskin only. Draft PR. Not Ready. Not merged. No gameplay rule changes. Phase 5A not started.

## 1. Branch name

`cursor/phase-4e-runtime-reskin-theme1`

## 2. Draft PR URL

https://github.com/nustanakritwithai/ClanWar/pull/52 — **Draft**, titled "Agent A: Phase 4E Runtime Reskin Integration — Theme 1 Siege Field", base `claude/game-file-analysis-a20xup`.

## 3. Base SHA used

`be02369e76678f204db8a5a1aac54ccecbf963ae` (matches the expected base SHA in the work order — merge commit of PR #51, Agent B's Theme 1 asset mock pack).

## 4. Files changed

**New:**
- `src/game/theme/Phase4ETheme.ts` — theme config / loader / resolver module
- `scripts/phase-4e-visual-reskin-regression.mjs` — required regression script
- `docs/phase-4e-runtime-reskin-report.md` — this report

**Modified:**
- `src/game/entities/Objective.ts`
- `src/game/scenes/ClassSelectScene.ts`
- `src/game/scenes/MatchScene.ts`
- `src/game/scenes/ResultScene.ts`
- `src/game/systems/ObjectiveSystem.ts`
- `src/game/systems/CaptureSystem.ts`
- `src/game/systems/SiegeBuffSystem.ts`
- `src/game/ui/CombatVfx.ts`
- `src/game/ui/SkillButtons.ts`
- `src/game/ui/VirtualJoystick.ts`
- `scripts/phase-4d-combat-feel-regression.mjs` — test migration patch (theme-aware VFX key checks + R6 flake fix; see §19)
- `docs/project-status.md`
- `docs/open-pr-dashboard.md`
- `docs/agent-worklog.md`

No edits to `package.json`, `package-lock.json`, README, deploy/render config, or any asset outside `public/assets/phase-4e/theme1/**` (read-only).

## 5. Theme config / loader summary

`src/game/theme/Phase4ETheme.ts`:
- `PHASE4E_THEME1_ENABLED` — single boolean toggle; flipping to `false` fully restores pre-4E legacy visuals at every call site (all call sites check this transitively via `hasPhase4eTexture`/`resolvePhase4e*`).
- `PHASE4E_THEME1_TEXTURES` — 47 namespaced texture keys (`phase4e_theme1_*`), grouped UI / Gate / Core / Capture / Character / VFX / Environment.
- `loadPhase4eTheme1Assets(loader)` — loads all 47 as SVG textures from `public/assets/phase-4e/theme1/**`, guarded by `textures.exists` (idempotent across repeated scene preloads). Excludes the 2 documentation-only safe-zone mockups (`phase4e_mockup_915x412.svg`, `phase4e_mockup_800x360.svg`) and the manifest.json self-entry.
- `hasPhase4eTexture(scene, key)` — load-state guard used everywhere before swapping a texture.
- `resolvePhase4eVfxTexture(scene, legacyKey)` — legacy→themed VFX key lookup with fallback, used by the 5 combat-feel VFX call sites.
- `resolvePhase4eCharacterTexture(scene, heroClass)` — existing-roster-only (5 classes) character key lookup, returns `undefined` (no preview) for any class not in the map.
- This module owns no gameplay state, timers, or scoring — it is a pure texture-key resolver, not a new system.

## 6. Structure assets wired

| State | Wired? | Where |
|---|---|---|
| Gate idle | Yes — `objGateIdle`, team-tinted | `ObjectiveSystem.baseTextureFor()` / `applyThemeTint()` |
| Gate hit (under attack) | Yes — `objGateHit` overlay | `Objective.ts` `overlayTextureFor()` |
| Gate destroyed | Yes — `objGateDestroyed` | `ObjectiveSystem.textureForState()` |
| Gate damaged / breached (intermediate) | **Not wired** — idle texture persists until the destroyed swap | Deferred — see §11 |
| Core protected / vulnerable (base) | **Not wired** — base stays the original team-colored texture | Deliberate — preserves Core team-color hard requirement |
| Core hit (under attack) | Yes — `objCoreHit` overlay (base remains visible/team-colored underneath) | `Objective.ts` `overlayTextureFor()` |
| Core destroyed | Yes — `objCoreDestroyed` | `ObjectiveSystem.textureForState()` |
| Core low (HP threshold) | **Not wired** | Deferred — see §11 |
| Capture Point neutral | Yes — `objCaptureNeutral` | `CaptureSystem.themedTextureForOwner()` |
| Capture Point player-owned | Yes — `objCapturePlayer` (owner `blue`) | `CaptureSystem.themedTextureForOwner()` |
| Capture Point enemy-owned | Yes — `objCaptureEnemy` (owner `red`) | `CaptureSystem.themedTextureForOwner()` |
| Capture Point contested | **Not wired** — contest is a flag, not a distinct `owner` value; no state-keyed hook without restructuring `CaptureSystem`'s owner-keyed texture lookup | Deferred — see §11 |

Minimum acceptable bar (Gate idle/hit/destroyed, Core protected/vulnerable/hit/destroyed, Capture neutral/player/enemy/contested all visible) is met for Gate and Capture-Point owner states; Core protected/vulnerable intentionally keep the legacy team-colored texture (no themed swap) rather than risk losing the team-color readability requirement, and Core hit/destroyed are themed. Contested and Core-low are the two states left on legacy visuals.

No position, collision, state-machine, or protected-Core logic was touched — every change above is a `setTexture`/sprite-construction texture argument substitution.

## 7. UI assets wired

- Attack button frame (`uiAttackButtonFrame`) — `SkillButtons.ts`, decorative backdrop behind the existing interactive circle, same hitbox/position
- Skill button frame (`uiSkillButtonFrame`) — same pattern for skill1/skill2/skill3/ultimate
- Joystick frame (`uiJoystickFrame`) — `VirtualJoystick.ts`, decorative backdrop behind base/knob circles
- Siege Buff badge icon (`uiSiegeBuffBadge`) — `SiegeBuffSystem.createBadge()`, initial icon texture only
- Result panel backdrop (`uiResultPanel`) — `ResultScene.ts`, drawn before title/reason/back-link text, does not move or resize any text

**Not wired:** `uiHudPanel`, `uiTimerScoreChip`, `uiObjectivePlaque`, `uiCaptureHudPanel` — loaded but no backdrop placed behind the existing top-HUD/Objective/Capture labels in this pass, to avoid any readability regression risk on the existing flat-UI text without a dedicated pass to verify contrast at both mobile breakpoints. `warAction` and the two item slots remain plain circles (no themed frame asset shipped for them — documented gap from the asset pack itself, not introduced here).

No control hitbox, position, or text value was changed anywhere in the UI layer.

## 8. Character assets wired

`ClassSelectScene.makeHeroCard()` — guardian, warrior, ranger, mage, priest all get a themed preview image (`resolvePhase4eCharacterTexture`), tinted `COLORS.blue` (the only relevant team pre-match), placed at the card's left edge; title/stats text shift right by the preview's width to avoid overlap. Card background, interactivity, and selection behavior unchanged.

Rogue and summoner texture keys are loaded but **not wired**: there is no existing non-gameplay locked/future-art preview slot in `ClassSelectScene` (the hero roster is exactly 5 classes), and creating one was judged out of scope for a texture-wiring-only pass. No new playable class was created.

This satisfies the "class-select/menu preview reskin" minimum-acceptable option; no in-match player sprite reskin was attempted in this pass.

## 9. VFX assets wired

All 5 in-scope combat-feel VFX call sites in `CombatVfx.ts`, via `resolvePhase4eVfxTexture()`:
- Normal hit spark → `vfxNormalHitSpark`
- Gate hit spark → `vfxGateHitSpark`
- Core hit pulse → `vfxCoreHitPulse`
- Skill cast flash → `vfxSkillCastFlash`
- Impact ring → `vfxImpactRing`

Display size, depth, tween duration, and easing for every one of these calls are byte-for-byte unchanged — only the texture key argument was swapped. No other VFX function (heal, slash trail, AoE ring, projectile trail, screen shake) was touched.

**Not wired:** `vfxDeniedFlash`, `vfxCapturePulse` — no existing safe hook (denied-action feedback and capture-complete feedback are not currently routed through `CombatVfx`'s `spawnOrFallback` pattern), and adding one would mean touching a gameplay-feedback trigger path, which was avoided per the freeze.

## 10. Environment assets wired or deferred

**Wired:** a single `bgCastleParallax` background image, added in `MatchScene.drawPhase4eEnvironmentLayer()`, called immediately after `drawGround()`. Depth `-99` (behind all gameplay), alpha `0.32` (subtle, does not compete with foreground readability), stretched to cover the full map. No geometry, collision, pathing, or coordinate change.

**Deferred (loaded, not placed):** `bgSiegeSmokeParallax`, all 4 tile textures (`tileGroundGrass/Dirt`, `tileStonePath`, `tileBrokenWall`), and all 4 prop textures (`propBannerBlue/Red`, `propCrystalSmall`, `propRuinStone`). Tile/prop placement would require either a per-tile reskin of `MapRenderer`'s existing ground-drawing logic or new prop-placement calls — judged as the higher-risk path the work order explicitly allows deferring ("if risky: only load assets + theme config, do not force map reskin, document as future work"). Documented here as future work, not attempted.

## 11. Assets intentionally not wired

- `vfxDeniedFlash`, `vfxCapturePulse` (§9)
- `objGateDamaged`, `objGateBreached`, `objCoreProtected`, `objCoreVulnerable`, `objCoreLow`, `objCaptureContested` (§6)
- `charRogueIdle`, `charSummonerIdle` (§8)
- `uiHudPanel`, `uiTimerScoreChip`, `uiObjectivePlaque`, `uiCaptureHudPanel` (§7)
- `bgSiegeSmokeParallax`, `tileGroundGrass`, `tileGroundDirt`, `tileStonePath`, `tileBrokenWall`, `propBannerBlue`, `propBannerRed`, `propCrystalSmall`, `propRuinStone` (§10)

All of the above are loaded into the texture cache by `loadPhase4eTheme1Assets()` (verified present by regression T2) but have no call site swapping them in. This is the documented "smallest safe subset" outcome per the work order's instruction to skip states cleanly rather than force risky architecture changes.

## 12. Mobile 915×412 result

PASS. Verified by `phase-4e-visual-reskin-regression.mjs` T13: joystick/controls present, no oversized (full-viewport-scale) VFX node spawned. Also re-verified by the unaffected mobile checks in `phase-4d-combat-feel-regression.mjs` (R14), `phase-4b-objective-regression.mjs`, `phase-4b-b-clarity-regression.mjs` (915×412 case), `phase-4c-a-capture-regression.mjs` (R-8), `phase-4c-b-siege-buff-regression.mjs` (R14), `phase-4c-c-timer-score-regression.mjs` (R14) — all PASS with Theme 1 active.

## 13. Mobile 800×360 result

PASS. Verified by `phase-4e-visual-reskin-regression.mjs` T14, and by the corresponding 800×360 checks across the same prior-phase scripts (R15 in 4D/4C-B/4C-C, the 800×360 case in 4B-B and 4C-A) — all PASS with Theme 1 active. No full-screen flash, no persistent particle, controls and damage numbers stay clear of joystick/skill zones.

## 14. Regression results

| Script | Result |
|---|---|
| `npm run build` | PASS |
| `scripts/phase-4e-visual-reskin-regression.mjs` (new) | **18/18 PASS** |
| `scripts/phase-4d-combat-feel-regression.mjs` | **17/17 PASS** (after the §19 test migration patch) |
| `scripts/phase-4b-objective-regression.mjs` | 15/15 PASS |
| `scripts/phase-4b-b-clarity-regression.mjs` | 13/13 PASS |
| `scripts/phase-4c-a-capture-regression.mjs` | 11/11 PASS |
| `scripts/phase-4c-b-siege-buff-regression.mjs` | 18/18 PASS |
| `scripts/phase-4c-c-timer-score-regression.mjs` | 18/18 PASS |

**4D history (R1, R4, R5, R6, R7):** these 5 assertions originally counted live scene children whose `texture.key` exactly equalled a literal legacy string (`vfx_hit_spark`, `vfx_gate_hit_spark`, `vfx_core_hit_pulse`, `vfx_skill_cast_flash`, `vfx_impact_ring`). Theme 1 intentionally swaps these exact VFX nodes to the namespaced `phase4e_theme1_vfx_*` equivalents when loaded (§9), so the literal-key match returned 0 in the first draft of this PR (12/17) — an expected texture-key-identity drift, not a missing or broken VFX, independently confirmed by Agent F's QA audit (verdict: *QA PASS WITH TEST MIGRATION REQUIRED*). The §19 test migration patch makes those VFX assertions accept either the legacy key or the themed key, restoring the suite to **17/17** without weakening any behaviour assertion. All other 4D checks — R2/R3 (damage numbers), R8/R9 (Core-destroyed result flow timing), R10–R15 (depth-below-HUD across both mobile viewports), R16–R19 (Siege Buff %, capture scoring, timer length, Gate/Core HUD), R20/R21 (copy, console errors) — were always PASS and remain so.

No script stalled on `networkidle0`; both the new script and all prior scripts use the established `domcontentloaded` + in-page `scene.start()` pattern.

## 15. Prior systems preservation

Verified unchanged by the regression results above: damage formula (4D R2/R3, 4C-B R1–R10), HP/armor/protected-Core logic (4B all checks, 4D R8/R9), attack speed/cooldown (4D timing-based checks), capture score/timing (4C-A all checks), Siege Buff % and rules (4C-B R1–R17), timer length and Objective Score win logic (4C-C R1–R13), Gate/Core HP/state machine (4B/4B-B), result priority (4D R8/R9, 4C-C R3–R9). No formula, threshold, or timing constant was touched in this pass — confirmed by code diff (§4 file list contains no `systems/CombatSystem.ts`, `systems/MatchTimerSystem.ts` writes, or constant-value edits).

## 16. Scope guard

- No edits to `package.json`, `package-lock.json`, README, or deploy/render config
- No existing asset outside `public/assets/phase-4e/theme1/**` touched; no PR #51 asset renamed, removed, or overwritten
- No new gameplay system, objective type, AI, economy, ranking, or Phase 5A feature added
- No new playable hero class added (rogue/summoner remain non-playable, unwired)
- `src/game/theme/Phase4ETheme.ts` contains only texture-key constants and loader/resolver functions — no gameplay state, no timers, no scoring
- All edits to `src/game/entities/**` and `src/game/systems/**` are texture-selection-only (confirmed by diff: no stat, formula, or state-machine-transition line changed)

## 17. Known risks

- The 4 HUD-panel backdrop textures and 2 environment parallax/tile groups remain unwired; a future pass should re-attempt them with a dedicated readability/contrast check rather than skip entirely
- `phase-4d-combat-feel-regression.mjs`'s VFX assertions are now theme-aware (§19): they pass with Theme 1 enabled (themed keys) **and** with it disabled (legacy keys), so the suite stays green in both modes. The legacy→themed key table in that script mirrors `VFX_THEME_MAP` in `Phase4ETheme.ts` by hand and must be kept in sync if the themed key names ever change (the live `phase-4e-visual-reskin-regression.mjs` T9–T11 would catch a drift by failing on the themed keys)
- Capture Point "contested" state and Gate "damaged"/"breached" intermediate states have no themed visual; players relying on those specific intermediate cues will see only the legacy/idle texture under Theme 1
- The single environment parallax layer is low-alpha (0.32) and may read as very subtle on some displays — this was a deliberate readability-over-immersion tradeoff, not an oversight
- No live/deployed verification was performed for this draft (only local build + local Puppeteer regression) — deploy verification should happen after review, before any Ready/merge step

## 18. Verdict

**RUNTIME RESKIN READY FOR REVIEW**

Draft PR only. Gameplay rules, formulas, timers, and scoring are unchanged and regression-verified. The minimum-acceptable bar for structure, UI/HUD, character, and VFX reskin requirements is met via the smallest safe subset of states, with all deferred states documented above rather than hidden. Not marked Ready. Not merged. Phase 5A not started.

## 19. Test migration patch (theme-aware 4D combat-feel regression)

Follow-up patch applied to this same Draft PR after Agent F's independent QA returned **QA PASS WITH TEST MIGRATION REQUIRED**. Agent F confirmed the 5 prior 4D deltas (R1, R4, R5, R6, R7) were legacy-vs-themed texture-key identity drift — not behaviour regressions (event triggers fire, depth stays safe, damage values/text unchanged, player-facing behaviour preserved) — and flagged a borderline 50 ms sample flake on R6.

**Why the 4D suite needed updating.** A merged PR should not leave the main regression stack red. The 5 failing assertions matched the *exact literal legacy texture key*; Theme 1 deliberately swaps those VFX sprites to namespaced themed keys, so the literal match read 0 even though the VFX node was present and behaving correctly under its new key.

**Scope of the patch.** Only `scripts/phase-4d-combat-feel-regression.mjs` was changed. No runtime, asset, config, or behaviour-assertion change.

**Legacy → themed key mapping** (mirrors `VFX_THEME_MAP` in `src/game/theme/Phase4ETheme.ts`; the regression script runs in Node and cannot import the TS resolver, so the table is duplicated with a sync note):

| Legacy key | Themed key (Theme 1) |
|---|---|
| `vfx_hit_spark` | `phase4e_theme1_vfx_normal_hit_spark` |
| `vfx_gate_hit_spark` | `phase4e_theme1_vfx_gate_hit_spark` |
| `vfx_core_hit_pulse` | `phase4e_theme1_vfx_core_hit_pulse` |
| `vfx_skill_cast_flash` | `phase4e_theme1_vfx_skill_cast_flash` |
| `vfx_impact_ring` | `phase4e_theme1_vfx_impact_ring` |

**How behaviour assertions stay strong (not weakened).**
- The theme-aware count helper returns `count = legacyCount + themedCount` (plus a `via` field recording which key carried the count, for debugging). Every VFX assertion still requires `count >= 1`, so it **fails if neither** the legacy nor the themed sprite is present — missing VFX is never hidden.
- Legacy-mode validity is preserved: with `PHASE4E_THEME1_ENABLED = false` the legacy key satisfies the assertion; with it enabled the themed key does. The check is mode-agnostic, not a weakened "optional" check.
- The R10–R13 depth check now scans **both** legacy and themed keys (`ALL_VFX_KEYS`), so a themed sprite cannot pass the "below HUD" check by being invisible to a legacy-only key list. It reports `fxCount` to prove a VFX node was actually found (currently `fxCount:1, maxFx:146 < hudMin:1090`).
- Damage-number checks (R2/R3 red, R4 amber `cfa14a`, R5 gold `f4d35e`, depth 150, stroke), the Core-destroyed result-flow checks (R8/R9), Siege/capture/timer/HUD checks (R16–R19), and copy/console checks (R20/R21) are untouched.

**R6 flake fix.** The success flash is a single-frame spawn with ~220 ms life; the old fixed 50 ms sample (and an occasionally dropped first keypress before Phaser's keyboard plugin is ready) could miss it. The patch:
- polls up to ~250 ms for the success flash instead of sampling once at a fixed offset; and
- retries **only a genuinely dropped keypress** via `castSkill1WithFlash()` — a dropped press leaves the skill off cooldown, so re-pressing is legitimate. This does not mask a real regression: if a successful cast genuinely produced no flash, the first silent cast consumes the cooldown and every retry is then blocked, so the count stays 0 and the assertion still fails.
- The negative trigger is preserved: after the success flash, an immediate second `q` (now on cooldown) must not raise the flash count (`castCd.castFlash.count <= castOk.castFlash.count`).
- Verified stable across 8 consecutive runs (8/8 PASS) plus the regression batch below; no runtime cooldown logic was changed.

**Final regression stack (after patch, against a fresh `npm run build` preview):**

| Script | Result |
|---|---|
| `npm run build` | PASS |
| `scripts/phase-4d-combat-feel-regression.mjs` | **17/17 PASS** |
| `scripts/phase-4e-visual-reskin-regression.mjs` | **29/29 PASS** (includes T19–T29 in-match character hotfix checks) |
| `scripts/phase-4b-objective-regression.mjs` | 15/15 PASS |
| `scripts/phase-4b-b-clarity-regression.mjs` | 13/13 PASS |
| `scripts/phase-4c-a-capture-regression.mjs` | 11/11 PASS |
| `scripts/phase-4c-b-siege-buff-regression.mjs` | 18/18 PASS |
| `scripts/phase-4c-c-timer-score-regression.mjs` | 18/18 PASS |

Still a Draft. Not marked Ready, not merged, no runtime/asset change, Phase 5A not started — awaiting Agent F re-QA / Agent E final gate.

## 20. In-match character sprite hotfix

Follow-up hotfix branch: `cursor/phase-4e-inmatch-character-sprite-fix` (separate Draft PR).

**Issue:** Phase 4E character art appeared in Class Select / menu previews, but the in-match player still rendered as the legacy blue circle. PR #52 wired `resolvePhase4eCharacterTexture()` for class-select cards only; `Player.ts` still used `scene.add.circle()` as the sole visible body.

**Fix:** Keep the existing circle + Arcade body as the physics hitbox. Add a separate `visualSprite` image that follows the body each frame. When the themed texture loads successfully, hide the circle (`alpha = 0`, stroke removed) and show the character sprite. If the texture is missing, the circle remains visible — no crash.

**Class texture mapping (existing 5-class roster only):**

| Hero class | Texture key |
|---|---|
| guardian | `phase4e_theme1_char_guardian_idle` |
| warrior | `phase4e_theme1_char_warrior_idle` |
| ranger | `phase4e_theme1_char_ranger_idle` |
| mage | `phase4e_theme1_char_mage_idle` |
| priest | `phase4e_theme1_char_priest_idle` |

Rogue and summoner are not playable; `HERO_CLASS_ORDER` unchanged.

**Fallback behavior:** `resolvePhase4eCharacterTexture()` returns `undefined` when Theme 1 is disabled or the texture is not loaded → player keeps the legacy visible circle.

**Regression:** `scripts/phase-4e-visual-reskin-regression.mjs` extended with T19–T29 — in-match character visual present, texture matches selected class (all 5), physics hitbox preserved, movement/camera/attack/skill/damage numbers intact, Menu ↔ Match ×3 does not duplicate `visualSprite`, mobile 915×412 and 800×360 visibility.

**Hotfix verdict:** **HOTFIX READY FOR RE-QA** — Draft PR only; gameplay rules unchanged.

