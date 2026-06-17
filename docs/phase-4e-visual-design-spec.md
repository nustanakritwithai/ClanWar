# Phase 4E: Visual Design Spec — MMORPG 2D Pixel Art Direction

> **Agent C** — formal planning spec for upgrading Clan Siege Arena’s visual
> identity toward a **lightweight 2D MMORPG / pixel-art fantasy siege** style.
> **Planning only** — no runtime, assets, or scripts in this phase.
>
> **Base:** Phase 4D closed (`bf08a0b`) — Combat Feel MVP merged and live verified.
> **Game identity:** Clan Siege Arena — fantasy siege battlefield with Gate/Core,
> capture points, Siege Buff, timer/score win, and 4D combat-feel polish.
>
> **Implementation status:** Phase 4E planning authorized by Product/GPT.
> Runtime and asset production are **not** authorized until this spec and
> dependent Agent D UX constraints are merged or explicitly approved.
> **Phase 5A remains NOT STARTED and NOT AUTHORIZED.**

---

## 1. Phase Goal

Phase 4E defines a **unified visual direction** and **implementation plan** for
replacing placeholder / flat-SVG presentation with cohesive **2D pixel-art fantasy
siege** art — characters, structures, environment, UI frames, and VFX extensions —
while **preserving every gameplay system** from Phases 4B through 4D.

**Visual thesis:**

> *Fantasy Siege MMORPG — 2D Pixel Art characters & structures on painted
> parallax backgrounds.*

**Judgment question for sign-off:** *"Does the game read as a fantasy siege MMORPG
on mobile — without changing how Gate, Core, capture, Siege Buff, timer, or
combat feel?"*

---

## 2. Phase 4E Scope

### In scope

- Visual direction upgrade (art bible for pixel siege MMORPG)
- 2D pixel MMORPG character/class visual language
- Environment and tile direction (themes, props, readability)
- Gate / Core / Capture / Siege Buff visual consistency
- Fantasy MMORPG UI style direction (HUD frames, chips, buttons)
- Mobile-safe art constraints (915×412, 800×360)
- Asset production plan for Agent B (future)
- Runtime implementation plan for Agent A (future — reskin wiring only)
- UX constraints handoff for Agent D (future)
- Acceptance criteria VIS-AC1–VIS-AC20
- QA screenshot / probe checklist

### Out of scope (this PR)

Runtime code, asset files, scripts, package changes, Phase 5A work.

---

## 3. Out-of-Scope Guard

### Forbidden systems (do not design into 4E)

Bot AI, economy, EXP, Gold, shop, ranking, reward currency, minimap, route
arrows, lane tracker, respawn, vision/fog, multiplayer, login, clan, payment,
tutorial overhaul, new objective types, **Phase 5A**.

### Frozen gameplay (do not change via visual pass)

| Rule | Frozen value / behavior |
|---|---|
| Damage formula | Unchanged |
| Gate HP / armor | 1500 / 10 |
| Core HP / armor | 2000 / 15 |
| Attack speed / cooldowns | Unchanged |
| Capture score | +5/+5/+8/+6 per 4C-A |
| Siege Buff | +30% enemy Gate only; contested-off |
| Match timer | 300s (`MATCH_DURATION_SEC`) |
| Score win | Time-up → score → Core HP tiebreak → Draw |
| Gate/Core flow | Protected core until gate breach |
| Result priority | Core destroy > time-up |
| 4D combat feel | Intensity ladder, mobile-safe FX |

**Hard rule:** 4E is a **visual reskin and art pipeline** phase. If a visual
change implies new mechanics, stop and defer to a future gameplay phase.

---

## 4. Compatibility with Prior Phases

### 4B — Gate/Core loop

- Preserve: spawn → attack gate → breach → attack core → victory/defeat.
- Visuals must reinforce **protected Core** (no vulnerable overlay until gate falls).
- Core destroyed → immediate result (visual may enhance, not delay).

### 4B-B — Clarity prompts

- Preserve copy: **Attack the Gate**, **Destroy Gate first**, **Gate Breached**,
  **Destroy the Core**, result reasons.
- New UI frames must not hide or replace canonical prompts.

### 4C-A — Capture

- Preserve capture scoring and once-per-capture awards.
- Capture HUD states: neutral, capturing, contested, captured.
- Visual ownership (blue/red/neutral) must remain distinguishable.

### 4C-B — Siege Buff

- Preserve +30% enemy Gate damage only; contested disables buff.
- Siege Buff badge must remain readable after UI reskin.

### 4C-C — Timer / score

- Preserve 300s timer, score-at-time-up, Core HP tiebreak, Draw, no Sudden Death.
- Timer/score chip must remain visible in new HUD style.

### 4D — Combat feel

- Preserve hit spark tiers, gate/core distinction, skill cast flash, damage numbers,
  micro shake on major events, mobile clutter limits.
- New pixel VFX must map to existing 4D intensity levels — not replace rules.

---

## A. Visual Thesis

**Target look:** *Fantasy Siege MMORPG — 2D Pixel Art + Painted Background*

Clan Siege Arena should feel like a **compact mobile siege instance** from a
lightweight fantasy MMORPG: readable pixel heroes on a **hand-painted** battlefield,
stone gates and arcane cores as raid objectives, capture points as contested
battlefield landmarks, and a HUD that echoes classic MMORPG raid frames — without
the complexity of a full MMO UI.

**Style pillars:**

1. **Readable first** — silhouette and team color beat detail density.
2. **Siege fantasy** — stone, banners, arcane cores, war camps — not sci-fi or chibi.
3. **Lightweight MMORPG** — evocative of raid/combat zones, not open-world clutter.
4. **Mobile landscape** — every asset must read at 915×412 and 800×360.
5. **Consistency** — one pixel scale, one outline rule, one palette system across modes.

**What changes:** art style, sprite presentation, UI chrome, environment tiles,
VFX appearance.

**What does not change:** gameplay rules, numbers, win conditions, phase behavior.

---

## B. Camera / Perspective

### Recommendation: **Top-down (orthogonal)** with **painted parallax background**

**Primary camera:** top-down, matching current gameplay (`MatchScene` movement,
joystick, melee arcs, capture circles). Gate/Core/Capture positions are fixed on
a 2D plane — orthogonal top-down keeps hit shapes, ranges, and objective radii
accurate without reprojection.

**Optional enhancement (art only):** structures (Gate, Core, towers) may use
**mild 3/4 shading** in sprite art (highlight on top face, shadow on south face)
while collision and gameplay remain top-down circles. Do **not** switch to true
isometric movement or pathing in 4E.

**Why it fits Gate/Core/Capture:**

- Capture circles and gate attack arcs are circle-based — top-down is honest.
- Three-route map reads as a **tactical lane diagram** from above.
- MMORPG raid zones often use top-down or near-top-down for clarity on mobile.
- Painted background layers (sky, distant walls, ground) add depth without
  changing gameplay coordinates.

**Forbidden in 4E:** camera rotation, zoom gameplay, fog-of-war camera, minimap camera.

---

## C. Sprite Resolution Guide

Single **master pixel scale** for world sprites: **1 world unit ≈ 1 px** at
authored resolution, displayed with **integer scaling** where possible (1×, 2×)
to avoid blur on mobile.

| Category | Authored size (px) | Display on map (approx) | Notes |
|---|---|---|---|
| **Player character** | 48×48 frame (32×32 body safe) | 48–64 px tall | 5 classes share scale |
| **Minion** (future) | 32×32 | 32–40 px | Not in 4E gameplay — art scale only |
| **Elite monster** (future) | 64×64 | 64–80 px | Reference scale for bosses |
| **Boss** (future) | 96×96 | 96–128 px | Gate defender fantasy — not 4E scope |
| **Gate** | 128×96 (wide) | ~96–128 px wide | Matches radius ~60 display |
| **Core** | 96×96 | ~120–160 px | Matches radius ~90 display |
| **Capture Point** | 64×64 icon + 128×128 pad | radius 55–75 | Neutral camp / ruins / tower |
| **UI icons** | 32×32 base | 32–48 HUD | Skills, buffs, objectives |
| **VFX** | 32×32 to 64×64 | short-lived | 4D intensity ladder sizes |
| **Tiles** | 32×32 or 48×48 | seamless grid | Environment pack |
| **Portraits** (optional) | 64×64 | menu/HUD only | Key art reference pack |

**Animation frame budget (MVP per hero):** idle (4), walk (6), attack (4), cast (4),
hit react (2) — **~20 frames/class** for 4E MVP character pass.

**Format:** PNG sprite sheets with transparent pixels; JSON or uniform grid for
Phaser `spritesheet` loading. SVG placeholders remain until B pack lands.

---

## D. Color Palette

Extend `art-style-guide.md` tokens into **faction / biome** palettes. Hex values
are canonical for 4E production.

### Player castle / Blue-Gold

| Token | Hex | Use |
|---|---|---|
| Blue primary | `#3b82f6` | Team Blue, friendly UI |
| Blue deep | `#2563eb` | Shading, banners |
| Castle gold | `#cfa14a` | Trim, gate accents friendly |
| Banner cream | `#f5e6c8` | Highlights |

### Enemy warfront / Red-Violet

| Token | Hex | Use |
|---|---|---|
| Red primary | `#ef4444` | Team Red, enemy UI |
| Red deep | `#dc2626` | Shading, war banners |
| War violet | `#7c3aed` | Enemy elite accent (not purple team) |
| Ash | `#4b5563` | Enemy fort weathering |

### Neutral battlefield / Stone-Brown

| Token | Hex | Use |
|---|---|---|
| Ground dark | `#182230` | Base terrain |
| Stone | `#3a4658` | Walls, ruins |
| Stone light | `#4a5870` | Raised edges |
| Dirt / brown | `#5c4a3a` | Paths, camps |
| Neutral gray | `#9ca3af` | Uncaptured markers |

### Core magic / Cyan-Purple

| Token | Hex | Use |
|---|---|---|
| Core gold | `#f4d35e` | Core crystal body |
| Arcane cyan | `#22d3ee` | Protected shield glow |
| Arcane purple | `#a855f7` | Vulnerable / under attack |
| Deep void | `#1e1b4b` | Core shadow |

### Gate structure / Gray-Amber

| Token | Hex | Use |
|---|---|---|
| Gate stone | `#3a4658` | Gate body |
| Gate amber | `#f59e0b` | Under attack, breach heat |
| Iron | `#64748b` | Bands, reinforcements |
| Breach ember | `#ea580c` | Destroyed / breached state |

**Outline rule:** `#0b0e13` or `#1a1020` 1–2 px on pixel sprites for contrast
on painted backgrounds.

---

## E. Character Class Visual Language

Runtime classes: **Guardian**, **Warrior**, **Ranger**, **Mage**, **Priest**.
Map to MMORPG fantasy roles below. Optional future: Rogue/Assassin, Summoner —
**not required for 4E MVP**.

### Guardian (Knight / Tank)

- **Silhouette:** wide shoulders, tower shield, short cape.
- **Colors:** steel blue `#2563eb`, silver trim.
- **Readable shape:** round shield blob + square shoulders — distinct at 32 px.
- **Min animation set:** idle, walk, shield bash attack, fortress cast, hit.
- **VFX identity:** blue shockwave rings, shield glint, low cyan sparks.

### Warrior (Knight / Berserker)

- **Silhouette:** two-hand weapon, forward lean, horned or flat helm.
- **Colors:** crimson `#dc2626`, dark iron.
- **Readable shape:** diagonal weapon line — longest melee silhouette.
- **Min animation set:** idle, walk, slash attack, rage buff, gate-breaker cast.
- **VFX identity:** red slash arcs, ember trails, heavy impact bursts.

### Ranger (Archer)

- **Silhouette:** bow curve, quiver bump, hood or cape tail.
- **Colors:** emerald `#16a34a`, leather brown.
- **Readable shape:** bow arc + narrow body — thinnest silhouette.
- **Min animation set:** idle, walk, draw shot, arrow rain cast, hit.
- **VFX identity:** green arrow streaks, small feather particles.

### Mage (Arcanist)

- **Silhouette:** pointed hat or hood, staff orb, wide sleeves.
- **Colors:** arcane purple `#9333ea`, cyan highlights.
- **Readable shape:** tall hat triangle + staff vertical line.
- **Min animation set:** idle, walk, bolt cast, meteor siege ult, hit.
- **VFX identity:** purple rune circles, cyan star bursts, meteor orange core.

### Priest (Cleric / Support)

- **Silhouette:** staff with cross/sun top, robe bell shape.
- **Colors:** holy gold `#f4d35e`, white-cream robe.
- **Readable shape:** staff vertical + wide robe hem.
- **Min animation set:** idle, walk, heal cast, holy circle, hit.
- **VFX identity:** gold crosses, soft green heal motes, gentle rings.

### Optional — Rogue / Assassin (future art only)

- Silhouette: dual daggers, crouched, hood — **do not add class in 4E runtime**.

### Optional — Summoner (future art only)

- Silhouette: floating totem, book — **do not add class in 4E runtime**.

---

## F. Structure Visual Language

Structures use **state-driven sprites or overlays** — same state machine as
runtime specs; only art changes.

### Gate

| State | Visual | Must read as |
|---|---|---|
| **Idle** | Intact stone arch, team banner | "Wall — attack here" |
| **Hit** | Brief amber flash + chip particles | 4D gate hit tier |
| **Breached** | Broken arch, inner glow | "Gate Breached" |
| **Destroyed** | Rubble pile, no collision art | Path open |

### Core

| State | Visual | Must read as |
|---|---|---|
| **Protected** | Crystal + cyan shield ring | "Not yet hittable" |
| **Vulnerable** | Cracked crystal, purple threat ring | "Destroy the Core" |
| **Hit** | Pulse flash, 4D core hit tier | Heavy damage |
| **Destroyed** | Shattered crystal, dim glow | Match end |

### Capture Point

| State | Visual | Must read as |
|---|---|---|
| **Neutral** | Gray camp/ruins/tower base | Uncaptured |
| **Capturing** | Progress ring (blue/red fill) | Progress |
| **Contested** | Split flash / clash icon | Stuck — no buff/score tick |
| **Captured blue/red** | Team banner + tinted base | Owned |

### Siege Buff badge (HUD)

- Compact pixel banner or hammer icon + subtle glow.
- Active: amber `#f59e0b` edge glow; inactive: hidden.
- Must not resemble gold coin or rank medal (no economy confusion).

---

## G. Environment Direction

**First map theme (ship on current map):** **Castle Siege Field** — reskin of
`twin-fortress` layout without moving coordinates.

### Theme 1 — Castle Siege Field (MVP)

- **Mood:** dusk siege, blue castle south, red fortress north.
- **Tile set:** grass/dirt path 32×32, stone border, moat blue-gray optional.
- **Props:** broken wagons, banners, barricades, torch poles — no collision.
- **Readability:** three routes must stay visually distinct (left/center/right).

### Theme 2 — Crystal Ruins (future skin)

- **Mood:** ancient arcane battlefield, cyan mist.
- **Tile set:** cracked marble, glowing fissures, neutral violet neutrals.
- **Props:** fallen pillars, crystal shards, siege rubble at mid.
- **Readability:** mid ruins `(1500, 2100)` must pop vs path.

### Theme 3 — Demon Warfront (future skin)

- **Mood:** red-black scorched earth, violet rifts.
- **Tile set:** basalt, lava cracks (visual only), ash paths.
- **Props:** bone spikes, war flags, demon braziers — fantasy tone, not horror gore.
- **Readability:** higher contrast gates/cores required on dark ground.

**4E MVP delivers Theme 1 only** as production target; Themes 2–3 are documented
for pipeline consistency.

---

## H. UI Direction

**Fantasy MMORPG HUD** — ornate but **thin** frames; dark translucent panels;
gold/bronze corner trims; no full-screen chrome.

| Element | Direction |
|---|---|
| **HUD shell** | Dark glass `#10151dcc` + 1px gold trim `#cfa14a` |
| **Timer/score chip** | Compact raid timer — mono digits + small score pips |
| **Objective prompt** | Center-top plaque: icon + 1 line canonical copy |
| **Skill buttons** | Square stone frames, class-color skill icon inset, CD swipe |
| **Joystick** | Stone ring base, subtle rune etch — keep 44px+ touch target |
| **Capture HUD** | Banner chip near top when in radius — state color border |
| **Siege Buff badge** | Small hammer/banner icon left of prompt row |
| **HP/Mana** | Ornate thin bars — green/blue fills from palette |

### Mobile safe zones (must preserve)

- **Top band (y 0–56):** timer, score, menu — no world VFX spawn.
- **Center-top (y 56–100):** objective prompt — highest text priority.
- **Bottom left:** joystick — no permanent art.
- **Bottom right:** attack + skills — no permanent art.
- **Playfield center:** combat VFX allowed — short-lived per 4D.

Agent D will formalize pixel coordinates in a future `phase-4e-mobile-hud-checklist.md`.

---

## I. VFX Direction

Build on Phase 4D intensity ladder — **swap art, keep timing and tiers**.

| Tier | 4D behavior | 4E pixel direction |
|---|---|---|
| Normal hit | tiny spark | 4–6 px yellow-white pixels, 300ms |
| Gate hit | structure spark | gray-amber chunk particles + small dust |
| Core hit | strong pulse | cyan-purple ring expand, 400ms |
| Skill cast | cast flash | class-color 8 px burst at feet |
| Impact ring | gate/core destroy | 1-frame expanding ring sprite sheet |
| Heal/support | green motes | gold-green crosses, soft — Priest kit |
| Denied/blocked | red flash | reuse `denied_flash` pixel version |
| Capture feedback | progress ring | team-color pixel arc on ground |
| Score toast | +N float | gold number only — not coin icon |

**No full-screen flash.** Max concurrent world VFX per 4D clutter rules.

---

## J. Asset Pipeline (Agent B — future)

Agent B work orders **after** this spec + Agent D UX merge. Suggested packs:

### 1. Sprite concept pack

- 5 hero turnaround sheets (48×48), silhouette sheet, palette swatches.

### 2. UI frame pack

- HUD plaque, skill button states, joystick ring, timer/score chip, bar frames.

### 3. Tile mockup pack

- Castle Siege Field: ground, path, wall edge, water optional — 32×32 tiles.

### 4. Structure pack

- Gate blue/red × states (idle, hit, breached, destroyed)
- Core blue/red × states (protected, vulnerable, hit, destroyed)
- Capture types: camp, ruins, watchtower, resource — neutral + team tints.

### 5. VFX extension pack

- Pixel versions of `fx_gate_hit_spark`, `fx_core_hit_pulse`, `fx_skill_cast_flash`,
  `fx_impact_ring` + capture pulse + heal burst.

### 6. Portrait / key art reference pack (optional)

- 64×64 class portraits, title splash mock — **not required for MVP sign-off**.

**Delivery format:** PNG sheets + manifest JSON listing keys matching runtime
loader paths under `public/assets/phase-4e/**` (exact paths defined in B PR).

---

## K. Runtime Implementation Plan (Agent A — future)

**Do not implement in this PR.** When authorized:

### Allowed

- Asset loader extensions for sprite sheets / theme config.
- Optional `visualTheme: 'castle_siege' | ...` config — cosmetic only.
- Replace placeholder SVG/circle art with structured sprites **same positions**.
- UI reskin wiring (textures on existing HUD objects).
- MapRenderer tile layer swap for Theme 1.
- Preserve all `CaptureSystem`, `ObjectiveSystem`, `MatchTimerSystem`,
  `SiegeBuffSystem`, `CombatVfx` call sites — swap textures only.

### Forbidden

- Gameplay rule, stat, or win-condition changes.
- New entities, objectives, or skills.
- Collision / radius / coordinate changes.
- Economy or reward UI.

### Suggested implementation order

1. Theme config + loader manifest.
2. Structure sprites (Gate/Core) — highest gameplay readability impact.
3. Capture point sprites.
4. HUD frame reskin.
5. Player hero sprite (one class pilot → all classes).
6. Tile ground reskin.
7. VFX pixel swap.
8. `phase-4e-visual-regression.mjs` (visual smoke + prior suite pass).

---

## L. Acceptance Criteria

### VIS-AC1
Game reads as fantasy siege MMORPG pixel style on first launch — not placeholder debug.

### VIS-AC2
Player character silhouette distinguishable at 48 px display.

### VIS-AC3
All five classes visually distinct by silhouette + class color.

### VIS-AC4
Gate states (idle, hit, breached, destroyed) visually distinct.

### VIS-AC5
Core states (protected, vulnerable, destroyed) visually distinct.

### VIS-AC6
Capture states (neutral, capturing, contested, captured) visually distinct.

### VIS-AC7
Siege Buff badge readable and not confused with currency.

### VIS-AC8
Timer/score chip readable at 915×412.

### VIS-AC9
Timer/score chip readable at 800×360 compact layout.

### VIS-AC10
Gate/Core objective prompts remain visible after UI reskin.

### VIS-AC11
Capture HUD remains visible when near objective.

### VIS-AC12
Joystick and skill buttons unobstructed.

### VIS-AC13
4D combat feel VFX tiers preserved (normal, gate, core, cast, destroy).

### VIS-AC14
No economy / reward / ranking visual language introduced.

### VIS-AC15
No Phase 5A features implied by art (shops, minimap, talent trees).

### VIS-AC16
All 4B Gate/Core gameplay behaviors preserved (regression pass).

### VIS-AC17
All 4C-A/B/C capture, siege buff, timer/score behaviors preserved.

### VIS-AC18
4D combat-feel regression still passes after visual swap.

### VIS-AC19
Menu ↔ Match ×3 — no visual leak or wrong theme state.

### VIS-AC20
No snake_case or internal debug labels in player-facing UI.

---

## M. QA Checklist (screenshots / probes)

Agent F should capture or automate probes for:

| Probe | Resolution | Pass criteria |
|---|---|---|
| Full battle HUD | 915×412 | Timer, score, prompt, buff, controls visible |
| Full battle HUD | 800×360 | Compact chip readable, no overlap |
| Gate hit moment | 915×412 | Gate hit VFX + damage number visible |
| Core hit moment | 915×412 | Core hit tier heavier than gate |
| Capture point active | 915×412 | Capture HUD + ground state readable |
| Siege Buff active | 915×412 | Badge visible, not coin-like |
| Skill cast | 915×412 | Cast flash visible, skill button feedback |
| Result screen | both | Core / Score / Draw reasons legible |
| Crowded combat | 915×412 | No persistent VFX cloud; prompts visible |
| UI overlap audit | 800×360 | No FX over joystick/skills/top strip |
| Theme reset | Menu↔Match×3 | Correct sprites, no stale overlays |
| Regression suites | CI | 4B–4D scripts pass |

---

## 14. Agent Handoffs

### Agent D (UX — next)

- Formalize `phase-4e-mobile-hud-checklist.md` from Section H safe zones.
- Define compact 800×360 chip layout for timer/score/buff.
- Confirm no economy-colored UI (gold coins for score).
- Asset usage priority: structures > HUD > hero > tiles > VFX.

### Agent B (Assets — after C + D)

- Produce packs per Section J; Theme 1 (Castle Siege Field) MVP only.
- Follow resolution guide Section C and palette Section D.
- PNG sprite sheets + manifest; no gameplay metadata in assets.

### Agent A (Runtime — after C + D + B)

- Loader + theme config + reskin wiring only per Section K.
- No stat or rule changes; all regression suites must pass.

### Agent F (QA)

- Section M probes + full 4B–4D regression + visual diff smoke.

### Agent E (Final Gate)

- Block any PR that changes gameplay rules or introduces 5A scope.
- Gate runtime only after spec + D + B merged (or waived).

---

## 15. Phase 5A Gate (Preview — Do Not Start)

Phase 5A remains **NOT STARTED** and **NOT AUTHORIZED**. This document does not
open bot, economy, shop, ranking, or multiplayer art requirements.

---

## 16. References

- `docs/art-style-guide.md` — predecessor palette (extend, do not contradict)
- `docs/phase-4d-combat-feel-mvp-spec.md` — VFX intensity ladder (frozen behavior)
- `docs/phase-4c-c-match-timer-score-win-spec.md` — timer/score HUD
- `docs/phase-4c-b-siege-ruins-gate-bonus-spec.md` — Siege Buff badge
- `docs/phase-4b-b-objective-clarity-acceptance.md` — canonical copy
- `docs/gate-core-loop-spec.md` — structure stats (frozen)
- `docs/map-layout-spec.md` — coordinates (frozen)
- `public/assets/**` — current SVG inventory to replace incrementally
