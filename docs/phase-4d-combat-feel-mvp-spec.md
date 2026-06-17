# Phase 4D: Combat Feel MVP — Design Spec

> **Agent C** — formal planning spec for combat feel polish: hit feedback, Gate/Core
> impact, skill clarity, and damage readability. **Planning only** — no runtime,
> assets, or scripts in this phase.
>
> **Base:** Phase 4C-C closed (`edf1348`) — Match Timer and Objective Score Win
> merged and live verified.
> **Predecessor:** `docs/phase-4c-c-match-timer-score-win-spec.md`,
> `docs/phase-4b-b-objective-clarity-acceptance.md`
>
> **Implementation status:** Phase 4D planning is authorized. Runtime and asset
> work are **not** authorized until this spec and dependent Agent D UX (and
> optional Agent B assets) are merged or explicitly approved.

---

## 1. Phase Goal

Phase 4D makes combat **clearer, heavier, and more satisfying** through visual
and feedback polish only. It does **not** change gameplay rules, balance, win
conditions, or scoring.

**Core design statement:**

> *"Improve player feel and clarity while keeping existing 4B / 4C-A / 4C-B /
> 4C-C systems frozen."*

**Judgment question for sign-off:** *"Does the player feel hits land, understand
Gate vs Core impact, and read damage on mobile — without any rule or balance
change?"*

---

## 2. Design Problem Statement

### What feels weak today

- **Attacks may not feel impactful enough** — some paths show damage numbers but
  lack consistent hit sparks or weight differentiation.
- **Hit confirmation may be unclear** — melee, projectile, and objective hits
  do not always give the same immediate "I connected" feedback.
- **Gate/Core hits feel too similar to normal hits** — structure damage uses
  `showCombatText` but lacks heavier visual treatment vs Training Dummy hits.
- **Skill activation lacks a clear cast moment** — button press may only show
  cooldown/mana denial or downstream damage, not a brief cast confirmation.
- **Damage numbers need readability polish** — fixed 16px, 600ms float may overlap
  HUD bands or stack on rapid attacks.
- **Mobile clutter risk** — timer/score (4C-C), Gate/Core prompts, capture HUD,
  and Siege Buff badge already occupy the top band; large VFX would block play.

### What 4D is not

4D is **polish only** — not a combat overhaul, not new skills, not balance
tuning, not economy, not bot AI, not Phase 4E / 5A.

### Frozen systems (must not change)

| System | Phase | Frozen behavior |
|---|---|---|
| Gate/Core loop | 4B | HP, armor, protected core, win on core destroy |
| Clarity prompts | 4B-B | Attack the Gate, Destroy the Core, etc. |
| Capture scoring | 4C-A | Score values, once-per-capture awards |
| Siege Buff | 4C-B | Contested-off, +30% gate bonus, unified pipeline |
| Timer / score win | 4C-C | 300s timer, score at time-up, tiebreak, draw |

---

## 3. MVP Design Pillars

### Pillar 1 — Hit Confirmation

Players must **immediately know** that an attack landed on a valid target.

### Pillar 2 — Impact Weight

Gate and Core hits must feel **heavier** than normal unit/dummy hits.

### Pillar 3 — Skill Clarity

Skill activation must have a **short, clear visual confirmation** at cast origin.

### Pillar 4 — Damage Readability

Damage numbers must be **readable and short-lived** without screen clutter.

### Pillar 5 — Mobile Safety

Effects must **not block** controls, HUD, prompts, timer/score, capture HUD, or
Siege Buff badge.

### Pillar 6 — No Balance Implication

Visual polish must **not imply** hidden buffs, new damage rules, currency rewards,
or ranking rewards. No "+30%" or multiplier text unless already approved elsewhere
(Siege Buff uses copy only — no numeric % in 4D).

---

## 4. In-Scope Polish Features

### A. Normal hit feedback

- Tiny hit spark at impact point (reuse or extend `vfx/hit_spark.svg`).
- Small damage number (`-${n}`) with polished position/lifetime.
- **No camera shake.**
- Very short lifetime (≤400ms VFX, ≤700ms number fade).

### B. Gate hit feedback

- Heavier spark than normal hit (`fx_gate_hit_spark` or tinted `impact_burst`).
- Slight structure pulse on gate sprite position.
- Clearer damage number (gate gold tone `#cfa14a` — existing).
- **No HP or stat change** — visuals only.

### C. Core hit feedback

- Stronger pulse than Gate hit (`fx_core_hit_pulse`).
- Slightly more emotional weight (brighter ring, larger number).
- Optional **tiny shake** (amplitude ≤2px, duration ≤120ms).
- **No Core HP or stat change.**

### D. Gate destroyed feedback

- Short ring/pulse/flash at gate position.
- **Reinforces** existing **Gate Breached** copy — does not replace it.
- Does **not** create a new win condition.
- Small camera shake allowed (Level 5 band — see Section 6).

### E. Core destroyed feedback

- Strongest allowed in-match feedback before result transition.
- **Result flow remains primary** — `ResultScene` transition unchanged in timing
  unless Product approves ≤200ms cosmetic delay.
- No full-screen explosion.

### F. Skill cast feedback

- Short flash around player or cast origin (`fx_skill_cast_flash`).
- Confirms button press registered.
- Does **not** add mechanics, change cooldowns, or change damage.

### G. Damage number polish

- Improved vertical offset to avoid top HUD strip.
- Stagger or merge rapid numbers on same target (cooldown ≤150ms per target).
- Readable at 915×412 (≥14px effective) and 800×360 (≥12px compact).
- Avoid overlap with Gate/Core prompt band.

### H. Micro screen shake

- **Only** for: Gate destroyed, Core hit (optional), Core destroyed.
- Minimal on mobile — must not affect joystick/skill hit targets.
- Disable or reduce further on 800×360 if playtest reports nausea/clutter.

### Optional (justify in Agent D UX — not required for MVP sign-off)

- **Core danger pulse** when friendly Core HP below 25% — subtle, no new alert
  system, no minimap/vision. Asset: `fx_core_danger_pulse.svg` optional.

---

## 5. Out-of-Scope Guard

The following are **forbidden** in Phase 4D:

**Balance / rules:** damage formula, attack speed, skill cooldowns, Gate/Core HP,
armor, capture score values, Siege Buff %, timer duration, score win rules.

**New gameplay:** new skills, combo system, bot AI, respawn, economy, EXP, Gold,
shop, ranking, reward currency.

**Map / meta UI:** minimap, route arrows, lane tracker, edge indicators, vision/fog,
multiplayer, login, clan, payment.

**Content / phases:** tutorial overhaul, new objective types, Phase 4E / 5A systems.

**This PR:** runtime code, assets, scripts, package changes.

---

## 6. Visual Intensity Ladder

Effects must map to intensity levels. Higher levels may use longer duration or
slightly larger display size — never full-screen in MVP.

### Level 1 — Normal hit (dummy / hero if applicable)

- Tiny spark (`fx_hit_spark_light` or `vfx_hit_spark`).
- Small damage number.
- **No shake.**

### Level 2 — Skill / heavier unit hit

- Brighter cast or impact flash.
- Clearer damage number.
- **No large particles** — no `impact_burst` at full scale on every skill.

### Level 3 — Gate hit

- Structure spark + small pulse on gate.
- Clear damage number (gate color).
- **No shake** or ≤1px subtle pulse only.

### Level 4 — Core hit

- Stronger pulse ring.
- Clearer, slightly larger damage number (core gold `#f4d35e`).
- **Tiny shake allowed** (≤2px, ≤120ms).

### Level 5 — Gate destroyed / Core destroyed

- Short ring or pulse (`fx_impact_ring`, optional `fx_gate_breach_pulse`).
- Strongest allowed feedback in band.
- **Objective/result copy remains primary** — Gate Breached, Core Destroyed, ResultScene.
- **No full-screen explosion** in MVP.
- Small camera shake on Gate destroyed / Core destroyed only.

---

## 7. HUD Priority

Combat polish FX are **lower priority** than essential play information. Z-order
and spawn rules must respect:

1. **Result state** (match ended — no new combat FX)
2. **Gate/Core objective prompt**
3. **Player controls** (joystick, attack, skills — never covered)
4. **4C-C timer / Objective Score HUD**
5. **Capture HUD** (near objective)
6. **Siege Buff badge**
7. **Combat FX and damage numbers** (short-lived, world-space or low UI band)

Combat FX must be **short-lived** (≤600ms typical, ≤900ms max for Level 5) and
never permanently obscure essential information.

---

## 8. Mobile Requirements

### 915×412 (primary)

- Normal and structure effects readable without dominating playfield.
- Damage numbers readable at a glance.
- Timer/score HUD (4C-C) remains visible.
- Gate/Core prompt remains visible.
- Capture HUD remains visible when near objectives.
- Siege Buff badge remains visible when active.
- Joystick and action buttons **unobstructed**.

### 800×360 (compact)

- Effects **compact** — reduce display size ~15–20% vs 915 layout.
- **No full-screen flash.**
- **No large persistent particles** or smoke cloud.
- **No long shake** — reduce amplitude vs 915 or disable on Core hit.
- **No overlap** with controls (bottom 40% reserved).
- Avoid clutter in **top HUD strip** (y < 56px) — spawn damage numbers lower on
  objectives or offset toward playfield center.
- Damage numbers must **not stack over skill buttons**.

Reference: `docs/mobile-hud-ux-spec.md`, `docs/phase-4c-c-mobile-timer-score-checklist.md`,
`docs/phase-4c-b-mobile-siege-buff-checklist.md`.

---

## 9. Player-Facing Copy Rules

### Allowed (existing or minimal new)

- **Hit** — optional float on confirmed hit (usually silent — number is enough)
- **Blocked** — protected core / invalid target (existing 4B-B)
- **Skill Cast** — optional brief toast (usually silent — flash is enough)
- **Gate Breached** — existing canonical copy (primary on gate destroy)
- **Core Destroyed** — result reason (existing flow)
- Damage numbers — numeric only (`-91`, `+45`)

Avoid adding new copy unless necessary. Prefer **visual** over text for hit feedback.

### Forbidden in player UI

`hit_debug`, `damage_multiplier`, `impact_state`, `gate_hit_state`,
`core_pulse_state`, `skill_cast_state`, snake_case, internal keys, `gold`, `EXP`,
`currency`, `reward`, `ranking`, `economy`.

---

## 10. Acceptance Criteria

### AC1 — Normal hit feedback
Normal hits on valid targets show clear hit feedback (spark and/or damage number).

### AC2 — Damage readability
Damage numbers are readable on mobile without persistent clutter.

### AC3 — Gate hit distinction
Gate hits feel visually distinct from normal dummy/unit hits.

### AC4 — Core hit distinction
Core hits feel visually distinct from Gate hits.

### AC5 — Gate destroyed
Gate destroyed feedback reinforces **Gate Breached** without replacing copy.

### AC6 — Core destroyed flow
Core destroyed feedback does not delay or replace existing result flow.

### AC7 — Skill cast
Skill activation has clear visual confirmation (cast flash).

### AC8 — Gate/Core prompt visible
Effects do not obscure Gate/Core objective prompt.

### AC9 — Capture HUD visible
Effects do not obscure Capture HUD when active.

### AC10 — Siege Buff visible
Effects do not obscure Siege Buff badge when active.

### AC11 — Timer/score visible
Effects do not obscure 4C-C timer/score HUD.

### AC12 — Controls usable
Effects do not block joystick or action buttons.

### AC13 — Mobile 915×412
Layout remains playable at 915×412.

### AC14 — Mobile 800×360
Layout remains playable at 800×360.

### AC15 — No balance change
No damage formula, stat, or win-condition changes.

### AC16 — No forbidden systems
No economy, bot, minimap, respawn, vision, or 4E/5A features introduced.

### AC17 — No forbidden copy
No snake_case, internal keys, or economy wording in player-facing UI.

### AC18 — Regression preservation
Existing 4B, 4C-A, 4C-B, and 4C-C regression suites remain valid.

---

## 11. Regression Expectations

Future Agent A runtime PR must add:

`scripts/phase-4d-combat-feel-regression.mjs`

### Required cases

- **R1** Normal hit spark appears on confirmed dummy hit.
- **R2** Damage number appears and is readable (non-zero alpha, within viewport).
- **R3** Gate hit feedback appears (distinct from R1 — structure tier).
- **R4** Core hit feedback appears (distinct from R3).
- **R5** Skill cast feedback appears on successful skill activation.
- **R6** Gate destroyed feedback appears on gate breach.
- **R7** Core destroyed still transitions to ResultScene correctly.
- **R8** Effects do not cover Gate/Core prompt bounding region.
- **R9** Effects do not cover Capture HUD when capture prompt active.
- **R10** Effects do not cover Siege Buff badge when buff active.
- **R11** Effects do not cover timer/score HUD region.
- **R12** No control overlap at 915×412 (joystick + skill button hit zones).
- **R13** No control overlap at 800×360.
- **R14** `phase-4b-objective-regression.mjs` / clarity suites still pass.
- **R15** `phase-4c-a-capture-regression.mjs` still passes.
- **R16** `phase-4c-b-siege-buff-regression.mjs` still passes.
- **R17** `phase-4c-c-timer-score-regression.mjs` still passes.
- **R18** No forbidden economy/bot/minimap strings in player-visible text.
- **R19** No fatal console errors during combat feel test path.

---

## 12. Agent Handoffs

### Agent D (UX — next)

Create UX/mobile spec **after** this design spec merges. Agent D decides:

- Exact mobile HUD safe zones for FX spawn
- Damage number size, lifetime, stagger rules
- Effect priority vs timer/score and Siege Buff
- 915×412 and 800×360 layout rules
- Allowed player-facing copy (minimal)
- Asset usage priority (reuse vs new micro-pack)
- Clutter limits and max concurrent world FX count

Expected deliverable: `docs/phase-4d-combat-feel-ux-copy.md` and mobile checklist
(follow 4C-C / 4C-B doc pattern).

### Agent B (Assets — after C + D)

**Wait** until Agent C + Agent D specs are merged.

**Reuse first:** `public/assets/vfx/hit_spark.svg`, `impact_burst.svg`,
`skill_ready_flash.svg` — only add micro-pack if reuse insufficient.

**Possible 4D FX micro-pack:**

| Asset | Purpose |
|---|---|
| `fx_hit_spark_light.svg` | Level 1 normal hit |
| `fx_gate_hit_spark.svg` | Level 3 gate hit |
| `fx_core_hit_pulse.svg` | Level 4 core hit |
| `fx_skill_cast_flash.svg` | Skill cast confirmation |
| `fx_impact_ring.svg` | Level 5 ring/pulse |

**Optional only if justified:**

- `fx_gate_breach_pulse.svg`
- `fx_core_danger_pulse.svg`

**Do not request:** full-screen explosion, victory/defeat illustration, shop/economy
icons, skins, new objective icons, map markers.

### Agent A (Runtime — after C + D + B or waiver)

**Do not implement** until C/D specs merged and B assets merged or explicitly waived
by Product.

**Allowed scope:**

- Confirmed-hit spark wiring
- Damage number polish (`CombatText` or successor)
- Gate/Core impact distinction in `ObjectiveSystem` feedback paths
- Skill cast flash in `MatchScene` skill handlers
- Structure pulse + micro camera shake for major events
- `scripts/phase-4d-combat-feel-regression.mjs`

**Forbidden scope:** stat/balance changes, new combat mechanics, new skills, bot,
economy, respawn, minimap, vision, multiplayer, 4E/5A.

**Must preserve:** 4B Gate/Core, 4B-B clarity, 4C-A capture score, 4C-B Siege Buff,
4C-C timer/score win.

### Agent F (QA)

Future retest: all R1–R19, manual playtest for feel/weight on device, full regression
stack, mobile layouts at both resolutions.

### Agent E (Final Gate)

Gate 4D runtime only after planning docs merged, 4C-C closure confirmed, scope guard
verified. Veto balance changes or forbidden systems.

---

## 13. Implementation Notes (Reference — Not a Work Order)

Existing integration points on base (for Agent A reference only):

- `src/game/ui/CombatVfx.ts` — hit spark, impact burst spawn helpers
- `src/game/ui/CombatText.ts` — floating damage numbers
- `src/game/systems/ObjectiveSystem.ts` — `showDamageFeedback`, gate/core colors
- `src/game/scenes/MatchScene.ts` — attack/skill resolution paths
- `src/game/systems/SiegeBuffSystem.ts` — optional **Siege Bonus** float (do not
  conflict with 4D gate hit FX intensity)

World FX: main camera, `uiCamera.ignore()`. Do not parent combat sparks to UI camera.

---

## 14. Phase 4D Runtime Readiness Gate

Phase 4D **runtime** may open only after:

1. This spec PR merged (or explicitly approved)
2. Agent D combat-feel UX spec merged
3. Agent B micro-pack merged **or** Product waives new assets (reuse-only)
4. Product/GPT runtime work order issued
5. Agent E confirms scope guard

Phase 4E / 5A remain **not authorized** from this document.

---

## 15. Risks and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| FX clutter on 800×360 | High | Intensity ladder caps; Agent D safe zones; R12–R13 |
| Players think visuals = hidden buffs | Medium | Pillar 6; no multiplier/gold copy |
| Gate/Core FX delays result | High | AC6; no extra delay without Product sign-off |
| Regression breakage across 4B–4C | High | AC18; R14–R17 mandatory |
| Duplicate VFX with existing combat kit | Low | Reuse audit before new assets |
| Skill flash on every button spam | Medium | Only on successful cast start; respect cooldown |

---

## 16. References

- `docs/phase-4b-b-objective-clarity-acceptance.md` — frozen clarity copy
- `docs/objective-damage-and-win-condition.md` — damage pipeline (frozen)
- `docs/phase-4c-a-objective-capture-acceptance.md` — capture score (frozen)
- `docs/phase-4c-b-siege-ruins-gate-bonus-spec.md` — siege buff (frozen)
- `docs/phase-4c-c-match-timer-score-win-spec.md` — timer/score (frozen)
- `docs/combat-visual-kit.md` — existing VFX inventory
- `docs/mobile-hud-ux-spec.md` — HUD layer model
- `src/game/ui/CombatVfx.ts`, `CombatText.ts`, `ObjectiveSystem.ts`
