# Phase 4D Combat Feel UI/UX Addendum

> **Agent D** — detailed UI/UX clarification for Phase 4D Combat Feel MVP.
> **Docs only — not a runtime or asset work order.**
>
> **Extends (does not replace):**
> - PR #43 — `docs/phase-4d-combat-feel-ux-spec.md`
> - PR #44 — `docs/phase-4d-combat-feel-mvp-spec.md`
> - `docs/phase-4d-mobile-combat-feedback-checklist.md`
>
> **Companion:** `docs/phase-4d-combat-uiux-screen-rules.md` (pixel safe zones)

---

## 1. Purpose

This addendum gives Agent B and Agent A **exact visual, layout, and priority rules**
before asset or runtime work. Phase 4D remains **polish only** — no gameplay rule
changes.

---

## 2. Alignment with PR #43 and PR #44

### Confirmed alignment

| Topic | PR #43 / #44 | This addendum |
|---|---|---|
| 7-layer HUD priority | Result → objective → controls → timer → capture → siege → FX | **Same order** — §3 |
| Intensity ladder L1–L5 | Normal → skill → gate → core → destroyed | **Same** — §6–8 |
| No balance / stat changes | Frozen | **Reaffirmed** — §11 |
| Asset micro-pack list | 5 required + 2 optional | **Same priority** — §10 |
| Mobile-first 800×360 | Design compact first | **Same** — screen-rules doc |
| Max 3 damage numbers | Anti-clutter | **Same** — §5 |
| No full-screen explosion | MVP guard | **Reaffirmed** |

### Documented conflicts and resolutions

| Conflict | PR #43 | PR #44 | **Resolution (this addendum)** |
|---|---|---|---|
| Core hit number color | Gold `#f4d35e` | Gold `#f4d35e` | **Keep gold `#f4d35e`** for damage number (matches `ObjectiveSystem` today). Optional **cyan energy accent** (`#22d3ee` at ≤30% alpha) permitted **only on pulse ring** — not on the number itself. |
| Gate/Core destroyed shake | Level 5 table: shake "None" | Level 5: small shake allowed on gate/core destroy | **Follow PR #44 (design authority):** tiny shake allowed on Gate destroyed and Core destroyed; optional on Core hit. Normal hit: never. |
| HUD priority Layer 2 label | "Core/Gate objective state" | "Gate/Core objective prompt" | **Unified label:** Layer 2 — **Objective command prompt** (same content, clearer name). |

No silent overrides — runtime and assets should follow resolutions above when
PR #43 and this addendum differ.

---

## 3. UI Layer Priority Stack (Active Match)

Combat polish is **Layer 7 — lowest**. Must never hide Layers 1–6.

| Layer | Name | Z-depth band | Contents | Combat FX rule |
|---|---|---|---|---|
| **1** | Result / match ending | 1300+ (result overlay) | Victory, Defeat, Draw, Core Destroyed result | **No new combat FX** after match end |
| **2** | Objective command prompt | 1100–1200 | Destroy Gate first, Gate Breached, Destroy the Core, Attack the Gate, Attack the Core, Defend your Core | FX must not cover top-center pill |
| **3** | Player controls | 2000+ | Joystick, attack button, skill buttons | **Untouchable** — no FX in control hit zones |
| **4** | 4C-C timer / Objective Score | 1050 | Time Left, Objective Score (top strip) | FX must not cover y=0–48 band |
| **5** | Capture HUD | 1100 (contextual) | Capturing, Contested, Captured, capture progress | FX must not cover capture radius UI |
| **6** | Siege Buff badge | 1150 | Siege Buff badge, state toasts (secondary) | FX must not cover top-right badge slot |
| **7** | Combat feel polish | 140–155 (world) | Hit spark, damage number, gate/core pulse, skill cast flash, impact ring, micro shake | Short-lived; spawn at contact point only |

**Depth rule:** World combat FX (140–155) < HUD chips (1050+) < objective prompt (1100+) < controls (2000+).

---

## 4. Damage Number UI Rules

### Normal hit (Level 1)

| Property | 915×412 | 800×360 |
|---|---|---|
| Font size | 14–16 px | 12–14 px |
| Color | `#f87171` (red) | Same |
| Stroke | `#000000`, 2–3 px — only if contrast fails on bright terrain | Same |
| Float | Up 28–36 px over 450–500 ms | Up 20–28 px over 400–450 ms |
| Style | Smallest tier; no glow, no coin outline | Compact |

### Gate hit (Level 3)

| Property | Value |
|---|---|
| Font size | +2 px vs normal (16–18 / 14–16 compact) |
| Color | `#cfa14a` (amber structure tone) |
| Contrast | Slightly bolder stroke if needed |
| Must not look like | Reward number, gold coin, +score toast |

### Core hit (Level 4)

| Property | Value |
|---|---|
| Font size | +3 px vs normal (17–19 / 15–17 compact) |
| Color | `#f4d35e` (gold — **canonical**, per PR #43/#44) |
| Pulse accent | Optional ring `#22d3ee` at ≤30% alpha — **not** on number |
| Must not look like | Objective Score, currency, ranking points |

### Stacking rules

- **Max 3** visible numbers within 80 px of same target center
- New number: stagger 40–60 ms horizontal offset (±12 px) from prior
- Oldest number: fade early when cap exceeded (alpha → 0 in 150 ms)
- **Forbidden zones:** objective prompt band (see screen-rules), control corners, timer/score strip
- Spawn offset: structure numbers spawn **below** objective world Y when target is near top of map — drift **down-then-up** if needed to avoid HUD strip

### Forbidden number styles

- Gold coin icon, `$` prefix, `+` reward style (except heal `+N` green)
- EXP yellow burst, critical-hit oversized font unless crit rule exists (none in MVP)
- `×2`, `%`, `CRIT`, ranking badges

---

## 5. Hit Feedback Rules

### Normal hit

- Tiny spark (`vfx/hit_spark.svg` or `fx_hit_spark_light.svg`)
- Display size: 36–44 px (915), 28–36 px (800)
- Duration: ≤180 ms fade
- **No shake, no ring**

### Gate hit

- Heavier spark (`fx_gate_hit_spark.svg` or tinted `impact_burst` at 85% scale)
- Display size: 48–56 px (915), 40–48 px (800)
- Structure pulse on gate sprite: scale 1.0 → 1.04 → 1.0, ≤150 ms
- **No full shake**; no destruction implication

### Core hit

- Energy pulse (`fx_core_hit_pulse.svg`) + structure spark
- Pulse scale 1.0 → 1.06 → 1.0, ≤180 ms
- Optional tiny shake: ≤2 px amplitude, ≤100 ms (disable on 800×360)
- **No result implication** unless Core actually destroyed

### Gate destroyed

- Short ring (`fx_impact_ring.svg`), ≤400 ms
- Optional `fx_gate_breach_pulse.svg` if distinct from ring
- **Gate Breached** world copy remains **primary**
- Tiny shake allowed: ≤2 px, ≤120 ms (PR #44 resolution)
- Must **not** look like Victory

### Core destroyed

- Strongest polish band: brief ring + pulse at core position
- **ResultScene / Victory / Defeat** remains primary
- No delay beyond existing match-end flow (≤200 ms cosmetic only if Product approves)
- Tiny shake allowed once; then immediate result transition

---

## 6. Skill Cast UI Rules

### On successful cast start

| Property | Rule |
|---|---|
| Timing | Immediate on cast start (mana deducted / cooldown begins) |
| Visual | `fx_skill_cast_flash.svg` at player feet or cast origin |
| Size | 48–64 px (915), 40–52 px (800) |
| Duration | 120–200 ms |
| Alpha | Peak 0.7 → 0 over lifetime |

### Must not

- Look like cooldown-ready badge (`skill_ready_flash` is separate)
- Look like Siege Buff or capture badge
- Add new skill meaning or damage implication
- Fire on failed cast (no mana, on cooldown) — button denial only

### Button feedback

- Existing `SkillButtons.flash()` on press — **keep**
- World cast flash **confirms** action; button flash confirms touch

### Heavy skill impact (existing AoE/projectile)

- May use existing `showImpactBurst` / `showSlashArc` — polish duration/alpha only
- Shake only if skill already has impact moment and PR #44 Level 2 band applies — **not** every skill

---

## 7. Micro Screen Shake Rules

### Allowed

| Event | Amplitude | Duration | 800×360 |
|---|---|---|---|
| Core hit | ≤2 px | ≤100 ms | **Disabled** (recommended) |
| Gate destroyed | ≤2 px | ≤120 ms | ≤1 px or disabled |
| Core destroyed | ≤3 px | ≤150 ms | ≤1 px or disabled |
| Heavy skill impact | ≤2 px | ≤80 ms | Disabled |

### Forbidden

- Normal hit, capture tick, score update, timer warning, Final Minute, Siege Buff events
- Shake during ResultScene transition
- Persistent or chained shake

### Implementation note

- Shake **camera** only — not control positions
- Controls remain at fixed screen coords (depth 2000+)

---

## 8. Agent B Asset Decision Rules

### Priority order

1. `fx_gate_hit_spark.svg` — gate structure hit (required)
2. `fx_core_hit_pulse.svg` — core hit emphasis (required)
3. `fx_skill_cast_flash.svg` — cast confirmation (required)
4. `fx_impact_ring.svg` — gate/core destroy ring (required)
5. `fx_hit_spark_light.svg` — **only if** `vfx/hit_spark.svg` too heavy for L1

### Optional (justify in PR body)

- `fx_gate_breach_pulse.svg` — if `fx_impact_ring` insufficient for Gate Breached
- `fx_core_danger_pulse.svg` — only if Product approves sub-25% HP warning (PR #44 optional)

### Reuse rule

Reuse `public/assets/vfx/hit_spark.svg`, `impact_burst.svg`, `slash_arc.svg` when
tier distinction is achievable via **scale, tint, duration** — do not duplicate
assets that solve no new UX problem.

### Asset constraints

- SVG only, no text nodes, no scripts, no external refs
- Transparent-friendly, readable at 32–64 px display
- Distinct from capture/timer/siege HUD icons
- No coin, trophy, victory, shop imagery

---

## 9. Agent A Runtime Handoff Rules

### Allowed (after planning + asset gate)

- Spawn tiered hit spark on confirmed hit
- Improved damage number (size, lifetime, stagger, zone checks)
- Gate/Core hit visual distinction + structure pulse
- Skill cast flash on successful cast
- Impact ring on gate/core destroy
- Tiny camera shake per §7
- `scripts/phase-4d-combat-feel-regression.mjs`

### Forbidden

- Damage, HP, armor, attack speed, cooldown, skill mechanic changes
- New skills, objectives, win conditions
- Economy, bot AI, minimap, respawn, vision/fog
- Capture score, Siege Buff, timer/score rule changes
- Phase 4E / 5A scope

### Integration points (reference)

- `CombatVfx.ts`, `CombatText.ts`, `ObjectiveSystem.showDamageFeedback`
- `MatchScene` attack/skill paths, `SkillButtons.flash()`
- Respect `uiCamera.ignore()` for world FX

---

## 10. UI/UX Acceptance Criteria

| ID | Criterion | Pass |
|---|---|---|
| UIUX-AC1 | Normal hit feedback visible | ☐ |
| UIUX-AC2 | Normal hit feedback not noisy | ☐ |
| UIUX-AC3 | Gate hit visually distinct from normal | ☐ |
| UIUX-AC4 | Core hit visually distinct from Gate | ☐ |
| UIUX-AC5 | Gate destroyed reinforces Gate Breached | ☐ |
| UIUX-AC6 | Core destroyed preserves result flow | ☐ |
| UIUX-AC7 | Skill cast flash confirms activation | ☐ |
| UIUX-AC8 | Damage number readable on dark map | ☐ |
| UIUX-AC9 | Damage number not currency/reward-like | ☐ |
| UIUX-AC10 | Max damage-number clutter controlled (≤3) | ☐ |
| UIUX-AC11 | Timer/score HUD unobstructed | ☐ |
| UIUX-AC12 | Gate/Core prompt unobstructed | ☐ |
| UIUX-AC13 | Capture HUD unobstructed | ☐ |
| UIUX-AC14 | Siege Buff badge unobstructed | ☐ |
| UIUX-AC15 | Joystick unobstructed | ☐ |
| UIUX-AC16 | Skill buttons unobstructed | ☐ |
| UIUX-AC17 | 915×412 playable | ☐ |
| UIUX-AC18 | 800×360 playable | ☐ |
| UIUX-AC19 | No forbidden player-facing copy | ☐ |
| UIUX-AC20 | No balance/stat/win-condition implication | ☐ |

*Maps to UX-AC1–AC16 (PR #43) — UIUX-AC adds clutter/noise and dark-map readability checks.*

---

## 11. QA Screenshot Checklist

Future Agent F or Agent A must capture or inspect:

### 915×412

- [ ] Normal hit moment (dummy)
- [ ] Gate hit moment
- [ ] Core hit moment
- [ ] Skill cast moment
- [ ] Gate destroyed moment
- [ ] Frame showing timer/score + Gate/Core prompt + controls all visible

### 800×360

- [ ] Normal hit moment
- [ ] Gate hit moment
- [ ] Core hit moment
- [ ] Skill cast moment
- [ ] Proof of no overlap with joystick/skill buttons
- [ ] Proof of no top-HUD clutter (timer strip + prompt + siege badge)

Store in QA evidence folder or PR attachments when runtime lands.

---

## 12. Scope Guard

**Not authorized:** bot AI, economy, EXP, Gold, shop, ranking, reward currency,
minimap, route arrows, lane tracker, edge indicators, respawn, vision/fog,
multiplayer/login/clan/payment, Sudden Death, new objective types, tutorial
overhaul, Phase 4E / 5A.

**This PR:** docs only — no runtime, assets, scripts, package files.

---

## 13. Verdict

**UIUX ADDENDUM READY FOR REVIEW** — extends PR #43 and PR #44; does not authorize
runtime or asset creation.
