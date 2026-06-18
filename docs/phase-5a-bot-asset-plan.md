# Phase 5A Bot Asset Plan — Basic Enemy Bot MVP (5A-1)

> **Agent B** — visual asset / art-direction planning for the first playable enemy bot.  
> **Mode:** docs-only planning. **No runtime. No final game assets in this PR.**  
> **Base:** Phase 4E closed — Theme 1 pixel siege reskin live verified (`9405d1f`+).  
> **Status:** Phase 5A — **DESIGN PLANNING ONLY — IMPLEMENTATION NOT STARTED**

---

## 1. Phase goal

Define the **minimum asset set** for **Phase 5A-1: Basic Red Melee Bot** so Agent A can implement bot gameplay with **fallback-safe graphics first**, then swap in themed assets when Agent B produces the pack.

**Judgment question:** *Does the player instantly read this unit as an enemy, understand when it is about to attack, and track its HP — without covering HUD or confusing ally/enemy colors?*

---

## 2. Recommended first bot visual

### Basic Red Melee Bot (Red Warrior Bot)

| Attribute | Direction |
|-----------|-----------|
| Archetype | Melee chaser — short range, wind-up attack, no projectile |
| Faction read | **Enemy red** — dark red body (`#b91c1c` / `#dc2626`), black/iron accents |
| Silhouette | Compact warrior: horned or spiked helm, sword + shield or two-handed cleaver |
| Scale | **48×48** world frame — same master scale as `phase4e_char_*_idle` |
| Style | 2D pixel-art / pixel-inspired SVG (Phase 4E Theme 1) |
| Contrast | Strong outline `#0b0e13`; readable on grass/stone tiles |
| Distinction from player | Player = blue tint overlay; bot = **baked red enemy palette** (no blue team slot) |

**Why this bot first**

- Clearest enemy read (red vs blue player)
- Simple melee AI — no ranged projectile art
- Mirrors Warrior class proportions players already know
- Fits siege battlefield fantasy without new factions

**Do not resemble**

- `combat/training_dummy.svg` (straw/target rings — practice, not enemy)
- Player class sprites with only a tint swap (enemy needs unique silhouette)
- Gate/Core/capture objective icons

---

## 3. Asset path and manifest structure

### Future asset root (when production is authorized)

```
public/assets/phase-5a/bot/theme1/
├── manifest.json
├── phase5a_char_bot_melee_idle.svg
├── phase5a_char_bot_melee_walk.svg          # optional MVP stretch
├── phase5a_char_bot_melee_windup.svg        # optional — runtime flash may suffice
├── phase5a_char_bot_melee_attack.svg        # optional — slash cue may suffice
├── phase5a_char_bot_melee_hurt.svg          # optional — tint flash may suffice
├── phase5a_char_bot_melee_death.svg
├── phase5a_ui_bot_enemy_ring.svg
├── phase5a_ui_bot_enemy_marker.svg          # optional overhead pip
├── phase5a_ui_bot_hp_bar_frame.svg
├── phase5a_ui_bot_hp_bar_fill.svg
├── phase5a_vfx_bot_attack_warning_arc.svg
├── phase5a_vfx_bot_attack_flash.svg
├── phase5a_vfx_bot_hit_spark.svg            # optional — reuse 4D normal hit
└── phase5a_vfx_bot_death_pop.svg
```

### Manifest JSON (future)

Mirror `public/assets/phase-4e/theme1/manifest.json` fields:

| Field | Example |
|-------|---------|
| `phase` | `"5A"` |
| `theme` | `"theme1-castle-siege-field"` |
| `category` | `character` / `ui` / `vfx` |
| `filename` | `phase5a_char_bot_melee_idle.svg` |
| `candidate_key` | `phase5a_char_bot_melee_idle` |
| `intended_use` | Bot idle world sprite |
| `runtime_status` | `not wired` until Agent A PR |
| `safe_zone` | Zone E — center combat readable zone |
| `dimensions` | `48×48` (sprites), `256×256` (VFX source) |

Companion doc (future, when assets land): `docs/phase-5a-bot-asset-manifest.md`

---

## 4. Asset key naming proposal

Prefix: **`phase5a_`** — consistent with `phase4e_` Theme 1 keys.

### A. Bot character sprites

| Key | File | MVP |
|-----|------|-----|
| `phase5a_char_bot_melee_idle` | `phase5a_char_bot_melee_idle.svg` | **Required** |
| `phase5a_char_bot_melee_walk` | `phase5a_char_bot_melee_walk.svg` | Defer — idle + bob |
| `phase5a_char_bot_melee_windup` | `phase5a_char_bot_melee_windup.svg` | Defer — flash/scale |
| `phase5a_char_bot_melee_attack` | `phase5a_char_bot_melee_attack.svg` | Defer — slash cue |
| `phase5a_char_bot_melee_hurt` | `phase5a_char_bot_melee_hurt.svg` | Defer — tint flash |
| `phase5a_char_bot_melee_death` | `phase5a_char_bot_melee_death.svg` | **Required** |

> User alias keys (`phase5a_bot_melee_idle`, etc.) map 1:1 — prefer `phase5a_char_bot_melee_*` to align with `phase4e_char_warrior_idle`.

### B. Enemy marker

| Key | File | MVP |
|-----|------|-----|
| `phase5a_ui_bot_enemy_ring` | `phase5a_ui_bot_enemy_ring.svg` | **Required** |
| `phase5a_ui_bot_enemy_marker` | `phase5a_ui_bot_enemy_marker.svg` | Optional overhead pip |

### C. Bot HP bar

| Key | File | MVP |
|-----|------|-----|
| `phase5a_ui_bot_hp_bar_frame` | `phase5a_ui_bot_hp_bar_frame.svg` | **Required** |
| `phase5a_ui_bot_hp_bar_fill` | `phase5a_ui_bot_hp_bar_fill.svg` | **Required** (or runtime `Graphics` fill) |

### D. Attack warning

| Key | File | MVP |
|-----|------|-----|
| `phase5a_vfx_bot_attack_warning_arc` | `phase5a_vfx_bot_attack_warning_arc.svg` | **Required** |
| `phase5a_vfx_bot_attack_flash` | `phase5a_vfx_bot_attack_flash.svg` | Optional — arc may suffice |

### E. Hit / death VFX

| Key | File | MVP |
|-----|------|-----|
| `phase5a_vfx_bot_hit_spark` | `phase5a_vfx_bot_hit_spark.svg` | Defer — reuse 4D |
| `phase5a_vfx_bot_death_pop` | `phase5a_vfx_bot_death_pop.svg` | **Required** |

---

## 5. Minimum viable asset pack (5A-1)

### Required for safe Agent A implementation (7 assets)

| # | Asset | Role |
|---|-------|------|
| 1 | `phase5a_char_bot_melee_idle` | World bot body — idle/chase bob |
| 2 | `phase5a_char_bot_melee_death` | Death pose or collapsed silhouette |
| 3 | `phase5a_ui_bot_enemy_ring` | Ground/waist enemy ring — persistent foe read |
| 4 | `phase5a_ui_bot_hp_bar_frame` | Narrow HP chrome above bot |
| 5 | `phase5a_ui_bot_hp_bar_fill` | Red enemy HP fill strip |
| 6 | `phase5a_vfx_bot_attack_warning_arc` | Red melee wind-up cone/arc |
| 7 | `phase5a_vfx_bot_death_pop` | Brief pop/ring on death — no gore |

### Reuse from existing stock (no new file)

| Need | Reuse |
|------|-------|
| Player hits bot — hit spark | `phase4e_vfx_normal_hit_spark.svg` or `vfx/hit_spark.svg` (4D L1) |
| Player hits bot — damage number | Existing `CombatText` floating numbers |
| Bot hurt flash | Runtime `setTint(0xffffff)` 80–120 ms — no sprite required |
| Bot chase / walk | Idle sprite + vertical sine bob ±2 px |
| Bot wind-up | Scale 1.0→1.06 + `phase5a_vfx_bot_attack_warning_arc` |
| Bot attack strike | Brief red slash line or scaled `vfx/slash_arc.svg` tint `0xef4444` |
| Attack cone geometry reference | `combat/attack_cone.svg` (tint red, do not ship as bot-specific) |

### Deferred (post 5A-1)

- Multiple bot classes (ranged, mage, tank)
- Ranged projectile + muzzle flash
- Bot skill effects / ultimates
- Boss / elite 64×64 sprite
- Bot team icons, minimap blips
- Full 6-frame animation sheets per state
- Multiple factions (undead, siege engine)
- `phase5a_ui_bot_enemy_marker` overhead chevron (optional polish)
- `phase5a_vfx_bot_hit_spark` — only if enemy-hit needs distinct color from player-hit

---

## 6. Dimension recommendations

| Asset type | Canvas | Display (world) | Notes |
|------------|--------|---------------|-------|
| Bot sprite | 48×48 `viewBox` | 48×48 px | Match `phase4e_char_warrior_idle` |
| Enemy ring | 64×64 | 40–56 px diameter at bot feet | Thin stroke; opacity 0.5–0.7 |
| HP bar frame | 64×12 or 80×14 | 48–64 px wide × 6–8 px tall | Sits 8–12 px above sprite top |
| HP bar fill | same inner track | runtime width by HP% | Enemy red `#ef4444`, bg `#1a1020` |
| Attack warning arc | 128×128 or 256×256 | 80–120 px cone in front of bot | Short wind-up only ≤600 ms |
| Death pop | 64×64 | 48–64 px | 200–350 ms fade |
| Hit spark (reuse) | 256×256 source | 24–32 px | 4D normal tier scale |

**Outline rule (from 4E):** 1–1.5 px `#0b0e13` on 48×48 sprites.

---

## 7. Animation plan (light MVP)

No complex sprite sheets required for 5A-1 sign-off.

| State | MVP technique | Asset |
|-------|---------------|-------|
| Idle | Static sprite + sine bob ±2 px / 800 ms | `idle` |
| Chase | Same idle + faster bob + flipX by velocity | `idle` |
| Wind-up | Scale 1.0→1.06 + spawn warning arc | arc VFX |
| Attack | Arc hides; brief slash tween or `attack_flash` | optional flash |
| Hurt | White tint flash 100 ms | runtime tint |
| Death | Swap to `death` sprite → `death_pop` → fade out | death + pop |

**Stretch (not blocking):** separate `walk`, `windup`, `attack`, `hurt` SVG poses if cheap to produce.

---

## 8. HP bar / enemy marker plan

### Enemy ring (`phase5a_ui_bot_enemy_ring`)

- Thin red ring at bot feet (ellipse or circle stroke `#ef4444` / `#dc2626`)
- 1–2 px stroke at 48 px display
- Always visible while bot alive; hidden on death
- Must not be confused with `objectives/capture_ring.svg` (neutral gray) or player aura

### Optional overhead marker (`phase5a_ui_bot_enemy_marker`)

- Small red downward chevron or spike above head — **defer** unless playtest shows ring alone is insufficient at 800×360

### Bot HP bar

- **World-space** bar parented above bot (not UI camera HUD)
- Frame: dark `#10151d` track, 1 px light border — narrower than player `ui/hp_bar_frame.svg` (320×48)
- Fill: enemy red `#ef4444`; low-HP optional brightening — no green
- Width: ~48–64 px; height: 6–8 px; offset Y: −20 to −28 px from sprite origin
- Hide when bot dead or off-screen
- Must not overlap top HUD strip (timer, score, objective prompt)

---

## 9. Attack cue / hit / death feedback plan

### Attack warning (critical for melee bot)

- Spawn `phase5a_vfx_bot_attack_warning_arc` in front of bot facing angle
- Red fill opacity 0.15–0.25; dashed rim; matches melee range (~90–120 px)
- Visible **before** damage frame — sync to wind-up timer from Agent C spec
- Max one arc per bot; destroy on attack commit or cancel
- **Not** full-screen; **not** player skill VFX colors (no gold/blue cast flash)

Reference geometry: `combat/attack_cone.svg` — bot version is **red**, shorter, lighter

### Hit feedback (player → bot)

- Reuse 4D `phase4e_vfx_normal_hit_spark` / `vfx_hit_spark` at contact point
- Existing floating damage numbers (`CombatText`) — no new number art
- Optional bot sprite white tint 80 ms

### Death feedback

- `phase5a_vfx_bot_death_pop` — small white/red ring expand + fade (200–350 ms)
- Swap to `phase5a_char_bot_melee_death` (collapsed armor or fallen pose)
- Fade alpha 1→0 over 300–500 ms — **no gore**, no body parts, no blood pool
- Reference tone: `status/dead.svg` skull simplicity — but pixel siege style

---

## 10. Mobile readability (915×412 / 800×360)

| Constraint | Plan |
|------------|------|
| Bot silhouette | Must read as humanoid enemy at 48 px on both viewports |
| HP bar | Readable but compact — max 64 px wide; never larger than bot sprite |
| Enemy ring | Visible at 800×360; stroke ≥1 px at display size |
| Attack warning | Local cone only — never covers joystick (left) or attack cluster (right) |
| Top HUD | Bot world FX stay in **Zone E** (center field); no world VFX in Zones A–D |
| Red flash cap | Attack warning + hurt tint ≤ combined 40% bot footprint |
| Clutter | One warning arc per bot; death pop destroys on complete |

Align safe zones with `docs/phase-4e-mobile-hud-ux-spec.md` Zones A–I.

---

## 11. Visual style guard

### Allowed

- Pixel-inspired SVG (match Theme 1 castle siege field)
- Enemy red / dark crimson / iron gray
- Neutral white hit sparks (reuse 4D)
- Short-lived local FX

### Avoid

- Realistic rendering, PBR, soft-photo textures
- Coin gold, green reward, trophy/star framing
- Same silhouette as player Warrior with only color swap
- Effects that look like player skills (`fx_skill_cast_flash` blue/white)
- Capture-point green rings, Siege Buff gold badge language
- Minimap blips, vision fog, alert triangles
- Full-screen red flash or persistent smoke

---

## 12. Agent A handoff notes

1. **Implement with Phaser Graphics fallbacks first** — red circle body + `Graphics` HP bar + red arc cone. Gameplay must not block on assets.
2. **All assets optional** — if `phase5a_*` texture missing, keep fallback; log once in debug.
3. **HP bar tied to bot HP** — width = `currentHp / maxHp`; hide on death.
4. **Attack warning sync** — arc appears at wind-up start; removed when damage applies or wind-up cancels.
5. **Enemy ring** — show while `bot.alive`; depth below sprite, above ground tiles.
6. **Texture loader pattern** — follow `Phase4ETheme.ts` registry style; keys from Section 4.
7. **World camera only** — bot sprite, ring, HP bar, attack arc: `uiCamera.ignore()`.
8. **Do not use TrainingDummy art** for enemy bot — different semantic.
9. **Reuse 4D combat VFX** for player→bot hits — do not duplicate hit spark unless art review requests enemy-specific spark.
10. **No gameplay in asset PR** — Agent A opens separate runtime PR after C/D specs + this plan merged.

### Suggested fallback mapping

| Asset missing | Fallback |
|---------------|----------|
| idle | `add.circle` r=20 fill `0xdc2626` |
| death | scaleY 0.3 + alpha fade |
| enemy ring | `lineStyle(2, 0xef4444)` ellipse |
| hp bar | `Graphics` rect 48×6 |
| attack arc | `Graphics` fan polygon red alpha 0.2 |
| death pop | `scale` burst + `alpha` tween |

---

## 13. Scope guard

### In scope (5A-1 asset plan only)

- One melee enemy bot visual kit
- Enemy read, HP, attack warning, hit/death feedback art direction

### Out of scope

- Full enemy team roster, bot classes, bosses, monsters
- Ranged projectile art, bot skills, ultimates
- Economy, EXP, Gold, shop, ranking, rewards
- Minimap, route arrows, lane tracker, edge indicators
- Respawn UI, reward UI, login/clan/payment
- Phase 5B / 5C systems
- Runtime code, scripts, package changes (this PR)

---

## 14. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Bot reads as player Warrior | Unique enemy silhouette; baked red; horned helm; enemy ring |
| Attack arc confused with player AoE | Red only, shorter range, wind-up timing tied to bot |
| HP bar clutter with multiple bots | Cap visible bars to nearest N bots or on-damage reveal |
| Red palette clashes with red team structures | Bot crimson brighter than `red_gate`; ring always on |
| Asset delay blocks Agent A | Graphics fallbacks mandatory path |
| 48 px unreadable on 800×360 | Strong outline; avoid interior detail; test both viewports |

---

## 15. Production sequence (when authorized)

1. Agent C — bot behavior / combat spec (wind-up timing, range, HP)
2. Agent D — bot UX / mobile spec (HUD priority, warning visibility)
3. **This plan merged** (Agent B)
4. Agent B — produce 7-asset MVP pack under `public/assets/phase-5a/bot/theme1/`
5. Agent A — runtime with fallbacks → swap textures when ready

---

## 16. Acceptance checklist (asset pack, future)

- [ ] All MVP SVGs valid XML; 48×48 sprites; VFX 256×256 or 64×64 as specified
- [ ] No text nodes; no raster; no animation tags
- [ ] Enemy red distinct from player blue and objective icons
- [ ] Readable at 24–48 px equivalent for VFX; 48 px for sprite
- [ ] `manifest.json` mirrors 4E structure
- [ ] Mobile mock check at 915×412 and 800×360

---

**Verdict:** BOT ASSET PLAN READY FOR AGENT A (planning layer — assets not yet produced).
