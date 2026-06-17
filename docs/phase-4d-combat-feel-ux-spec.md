# Phase 4D Combat Feel UX Spec

> **Agent D** — player-facing UX and mobile clarity for Phase 4D Combat Feel MVP.
> **Docs only — not a runtime work order.**
>
> References: `docs/project-status.md`, `docs/phase-close-report.md` (4C-C closure),
> `docs/phase-4c-c-timer-score-ux-copy.md`, `docs/phase-4c-b-siege-buff-ux-copy.md`,
> `docs/phase-4b-b-ux-copy.md`, `docs/mobile-hud-ux-spec.md`,
> `src/game/ui/CombatVfx.ts`, `src/game/ui/CombatText.ts`.

---

## 1. UX Goal

Phase 4D improves **combat feel** without changing gameplay rules. A mobile player
should clearly feel:

- An attack **landed**
- **Damage happened** (readable numbers)
- A **skill activated** when a button is pressed
- A **Gate hit** feels different from a normal unit hit
- A **Core hit** feels more important than a Gate hit
- **Gate destroyed** feels like a milestone (Gate Breached)
- **Core destroyed** still follows the existing ResultScene flow
- Effects do **not** hide HUD, timer/score, capture UI, Siege Buff, or controls

**4D is polish only — not a combat overhaul.**

---

## 2. Current UX Surface (Review Baseline)

As of Phase 4C-C closure (`4e928fb` runtime, `edf1348` docs base):

| Surface | Current behavior | 4D opportunity |
|---|---|---|
| Normal hit (dummy) | `showHitSpark` + red `-N` float (`CombatVfx` / `CombatText`) | Polish size, lifetime, mobile density |
| Gate/Core hit | Same `showHitSpark`; gate `#cfa14a`, core `#f4d35e` damage color | Distinct structure spark/pulse tiers |
| Skill cast | `showSlashArc`, `showImpactBurst`, `showAoeMarker`; button `flash()` | Clearer cast confirmation without new mechanics |
| Gate Breached | World text **Gate Breached** + gate texture swap | Short ring/pulse reinforcement |
| Core destroyed | ResultScene flow; **Victory** / **Defeat** + reason | Strongest allowed feedback; no delay |
| Timer/score HUD | `MatchTimerSystem` top strip — secondary to Gate/Core prompt | Must remain visible under combat VFX |
| Gate/Core prompt | `ObjectiveSystem` top-center priority label | Must not be covered by sparks/particles |
| Capture HUD | `CaptureSystem` near-objective feedback | Must not be obscured |
| Siege Buff badge | `SiegeBuffSystem` top-right secondary slot | Must not be obscured |
| Controls | Joystick left, attack/skills right (depth 2000+) | Untouchable by combat polish |

Existing reusable assets: `vfx/hit_spark.svg`, `vfx/impact_burst.svg`,
`vfx/slash_arc.svg`, `objective-feedback/gate_breached_*.svg`,
`objective-feedback/objective_under_attack.svg`.

---

## 3. UX Problems (4D Targets)

### A. Hit confirmation

Player may not instantly know a basic attack or skill hit landed — spark is brief
and uniform across target types.

### B. Target identity

Gate, Core, and Training Dummy hits share the same spark profile. Structure
importance is conveyed only by damage number color, not weight.

### C. Skill activation

Button `flash()` confirms press, but world cast feedback varies by skill and may
feel inconsistent on mobile.

### D. Damage readability

16 px floats with 600 ms lifetime work on desktop but can clutter 800×360 when
multiple hits stack near the player or objectives.

### E. Structure impact

Gate/Core hits lack structural weight — no pulse on the objective sprite, no
tiered intensity between gate and core.

### F. Visual clutter

Adding effects risks covering timer/score, Gate/Core prompt, Capture HUD, Siege
Buff badge, joystick, and skill buttons — especially on 800×360.

---

## 4. UX Principles

| # | Principle | Rule |
|---|---|---|
| 1 | **Clear but not noisy** | Confirm action without screen spam |
| 2 | **Structure hits feel heavier** | Gate/Core > normal unit hit |
| 3 | **Core is highest emotional weight** | Core hit/destroy strongest; must not delay result |
| 4 | **Player control visibility first** | Never hide joystick, skills, or core objective prompts |
| 5 | **Mobile-first polish** | Design for 800×360 first, scale to 915×412 |
| 6 | **No balance implication** | Effects must not imply hidden damage buff |

---

## 5. HUD Priority During Combat Polish

Combat effects are **lowest persistent priority**. Short-lived only.

| Priority | Layer | Examples |
|---|---|---|
| 1 | Result state | Victory, Defeat, Draw |
| 2 | Core/Gate objective state | Destroy Gate first, Gate Breached, Destroy the Core, Core Destroyed |
| 3 | Player controls | Joystick, attack button, skill buttons |
| 4 | 4C-C timer/score HUD | Time Left, Objective Score |
| 5 | Capture HUD | Capturing, Contested, Captured |
| 6 | Siege Buff badge | Siege Buff Active, Enemy Siege Buff Active, badge |
| 7 | Combat polish feedback | Hit spark, damage number, pulse, micro shake |

**Critical:** Priority 1–6 elements must remain readable while Priority 7 plays.
Combat VFX depth: world band **140–155** — below HUD chips (1050+) and controls (2000+).

---

## 6. Feedback Types

### A. Normal hit feedback

**Purpose:** Confirm hit landed on unit/dummy.

| Property | Recommendation |
|---|---|
| Spark | Small — reuse `hit_spark` or `fx_hit_spark_light` |
| Damage number | Small, red `#f87171`, 14–16 px |
| Camera | No shake |
| Lifetime | Spark ≤ 200 ms; number ≤ 500 ms |

### B. Gate hit feedback

**Purpose:** Show structure damage.

| Property | Recommendation |
|---|---|
| Spark | Larger than normal — `fx_gate_hit_spark` or scaled `impact_burst` |
| Pulse | Slight scale pulse on gate sprite (1.0 → 1.04 → 1.0, ≤ 150 ms) |
| Damage number | Slightly larger (16–18 px), amber `#cfa14a` |
| Camera | No heavy shake |
| Constraint | Does not hide **Attack the Gate** / **Gate Breached** prompt |

### C. Core hit feedback

**Purpose:** High-value structure damage.

| Property | Recommendation |
|---|---|
| Pulse | Stronger than gate (1.0 → 1.06 → 1.0, ≤ 180 ms) |
| Damage number | Clearer (17–19 px), gold `#f4d35e` |
| Camera | Optional **very tiny** shake (≤ 2 px, ≤ 100 ms) — skip on 800×360 if crowded |
| Constraint | Does not delay Core destroyed → ResultScene |

### D. Gate destroyed feedback

**Purpose:** Reinforce **Gate Breached** milestone.

| Property | Recommendation |
|---|---|
| Visual | Short ring or pulse at gate position (`fx_impact_ring` or `fx_gate_breach_pulse`) |
| Copy | **Gate Breached** remains primary (existing world text) |
| Camera | No full-screen explosion |
| Lifetime | ≤ 400 ms |

### E. Core destroyed feedback

**Purpose:** End match clearly.

| Property | Recommendation |
|---|---|
| Visual | Strongest allowed pulse/ring — brief only |
| Result | ResultScene remains primary; existing delay unchanged |
| Copy | **Victory** / **Defeat** + **Core Destroyed** — no score/timer override |
| Constraint | No unnecessary delay before ResultScene |

### F. Skill cast feedback

**Purpose:** Confirm skill button triggered an action.

| Property | Recommendation |
|---|---|
| Cast flash | Short flash around player or skill origin (`fx_skill_cast_flash`) |
| Button | Existing `flash()` on press — keep |
| Mechanics | **No** new skills, cooldown changes, or damage changes |
| AoE | Existing `showAoeMarker` — polish alpha/duration only |

### G. Damage number polish

**Purpose:** Mobile readability.

| Target | Size | Lifetime | Notes |
|---|---|---|---|
| Normal | 14–16 px | ≤ 500 ms | Small, floats up 24–32 px |
| Gate | 16–18 px | ≤ 550 ms | Amber, slightly bolder stroke |
| Core | 17–19 px | ≤ 600 ms | Gold, max one concurrent per core |
| Bonus (Siege) | Existing **Siege Bonus** text | Throttled | Not a damage number change |

**Anti-clutter:** Max 3 concurrent damage numbers near same target; older fade early.
Avoid stacking over top HUD strip or control corners.

---

## 7. Intensity Levels

| Level | Event | Spark | Number | Pulse | Shake |
|---|---|---|---|---|---|
| 1 | Normal unit hit | Tiny | Small | None | None |
| 2 | Heavy/skill hit | Brighter | Clearer | None | None |
| 3 | Gate hit | Structure spark | Emphasized | Small | None / tiny |
| 4 | Core hit | Structure spark+ | Emphasized | Stronger | Very tiny (optional) |
| 5 | Gate/Core destroyed | Short ring | N/A (copy primary) | Brief emphasis | None |

**No full-screen explosion in MVP.**

---

## 8. Player-Facing Copy Rules

### Allowed (minimal additions)

| Copy | Use |
|---|---|
| Hit | Optional debug-only — **not** default player copy |
| Gate Breached | Existing milestone (primary) |
| Core Destroyed | Result reason (existing 4C-C) |
| Skill Ready | Existing cooldown-ready state (if shown) |
| Skill Cast | Optional brief cast confirm — prefer visual-only |
| Blocked | Protected core feedback (**Destroy Gate first**) |
| Damage number only | `-N` floats — preferred over extra words |

### Forbidden

- `hit_debug`, `impact_state`, `damage_multiplier`, `gate_hit_state`, `core_pulse_state`, `skill_cast_state`
- snake_case, internal keys
- gold, EXP, currency, reward, ranking, economy
- Copy implying damage buff not in rules (e.g. `+30%` on hit float)

**Default:** polish is **visual-first** — avoid new text unless necessary.

---

## 9. Mobile Layout Requirements

### 915×412 (primary)

- Damage numbers readable at combat distance
- Timer/score HUD remains visible (top strip)
- Gate/Core prompt remains visible (top-center)
- Capture HUD readable near objectives
- Siege Buff badge readable (top-right)
- Joystick and action buttons unobstructed
- Hit effects do not cover controls or HUD chips

### 800×360 (design first)

- Effects **smaller and shorter** than 915×412
- No full-screen flash
- No long-lived particles (> 600 ms)
- No big smoke cloud
- No persistent camera shake
- Damage numbers must not overlap joystick (left) or skill cluster (right)
- Avoid clutter in top HUD strip (timer `4:32 · 12–8`, prompt, menu, siege badge)
- Skill cast feedback fits around player — not over action buttons
- Optional: disable micro shake entirely on 800×360

---

## 10. Asset Guidance for Agent B

### Reuse first

- `public/assets/vfx/hit_spark.svg`
- `public/assets/vfx/impact_burst.svg`
- `public/assets/vfx/slash_arc.svg`
- `public/assets/objective-feedback/gate_breached_blue.svg` / `gate_breached_red.svg`
- `public/assets/objective-feedback/objective_under_attack.svg`

### Possible micro-pack (after C/D specs accepted)

| Asset | Use | Priority |
|---|---|---|
| `fx_hit_spark_light.svg` | Normal hit (lighter variant) | Required if reuse insufficient |
| `fx_gate_hit_spark.svg` | Gate structure hit | Required |
| `fx_core_hit_pulse.svg` | Core hit emphasis | Required |
| `fx_skill_cast_flash.svg` | Skill activation | Required |
| `fx_impact_ring.svg` | Gate/Core destroy ring | Required |
| `fx_gate_breach_pulse.svg` | Gate Breached reinforcement | Optional |
| `fx_core_danger_pulse.svg` | Core under-attack accent | Optional |

### Do not request

- Full-screen explosion
- Victory/defeat illustration
- Skin art, economy icons, item icons, shop icons
- Map markers, new objective icons

Asset rules: SVG only, no text nodes, no scripts, transparent-friendly,
mobile-readable at 32–64 px display size, distinct from capture/timer icons.

---

## 11. Agent A Runtime Handoff (When Authorized)

### Allowed polish layer

- Hit spark on confirmed hit (tiered by target type)
- Improved damage number positioning, size, lifetime, concurrency cap
- Gate/Core hit visual distinction (spark + pulse tiers)
- Skill cast flash (visual confirm)
- Structure pulse on gate/core hit
- Tiny camera shake for major structure moments (optional, compact-safe)
- Mobile-safe effect placement and depth ordering

### Forbidden

- Damage formula, HP, armor, attack speed, cooldown changes
- Skill mechanic changes, new skills
- New objectives, win conditions
- Bot AI, economy, respawn, vision/fog, minimap
- Multiplayer, ranking, shop
- Phase 4E / 5A scope

Regression script: `scripts/phase-4d-combat-feel-regression.mjs`

Prior suites must still pass: 4B, 4B-B, 4C-A, 4C-B, 4C-C.

---

## 12. UX Acceptance Criteria

| ID | Criterion | Pass |
|---|---|---|
| UX-AC1 | Normal hit feedback is visible | ☐ |
| UX-AC2 | Damage numbers are readable | ☐ |
| UX-AC3 | Gate hit feedback feels distinct from normal hit | ☐ |
| UX-AC4 | Core hit feedback feels distinct from Gate hit | ☐ |
| UX-AC5 | Skill cast feedback confirms activation | ☐ |
| UX-AC6 | Gate destroyed feedback reinforces Gate Breached | ☐ |
| UX-AC7 | Core destroyed feedback does not delay result flow | ☐ |
| UX-AC8 | Combat effects do not hide Gate/Core prompt | ☐ |
| UX-AC9 | Combat effects do not hide Capture HUD | ☐ |
| UX-AC10 | Combat effects do not hide Siege Buff badge | ☐ |
| UX-AC11 | Combat effects do not hide 4C-C timer/score HUD | ☐ |
| UX-AC12 | Combat effects do not hide joystick/action buttons | ☐ |
| UX-AC13 | 915×412 remains playable | ☐ |
| UX-AC14 | 800×360 remains playable | ☐ |
| UX-AC15 | No balance/stat/win-condition changes implied | ☐ |
| UX-AC16 | No forbidden UI/internal/economy wording | ☐ |

---

## 13. Regression Expectations

Future `scripts/phase-4d-combat-feel-regression.mjs`:

| ID | Check |
|---|---|
| R1 | Normal hit spark appears |
| R2 | Damage number appears and is readable |
| R3 | Gate hit feedback appears (distinct tier) |
| R4 | Core hit feedback appears (distinct tier) |
| R5 | Skill cast feedback appears |
| R6 | Gate destroyed feedback appears |
| R7 | Core destroyed result still works |
| R8 | Effects do not cover Gate/Core prompt |
| R9 | Effects do not cover Capture HUD |
| R10 | Effects do not cover Siege Buff badge |
| R11 | Effects do not cover timer/score HUD |
| R12 | Effects do not cover controls at 915×412 |
| R13 | Effects do not cover controls at 800×360 |
| R14 | 4B Gate/Core regression still passes |
| R15 | 4C-A Capture regression still passes |
| R16 | 4C-B Siege Buff regression still passes |
| R17 | 4C-C Timer/Score regression still passes |
| R18 | No forbidden systems or economy strings |
| R19 | No fatal console errors |

---

## 14. UX Scope Guard

**In scope:** combat feel copy rules, feedback tiers, HUD priority, mobile layout,
intensity levels, UX-AC, handoff notes, regression expectations.

**Out of scope:** runtime, scripts, assets, damage/HP/cooldown changes, new skills,
new objectives, win conditions, economy, bot AI, minimap, tutorial overhaul,
Sudden Death, 4E/5A.

---

## 15. Handoff Notes

### Agent C (Design — if needed)

4D design spec may reference this UX doc for intensity tiers and mobile constraints.

### Agent B (Assets)

Optional micro-pack per §10 — after UX spec merge. Reuse existing VFX first.

### Agent A (Runtime)

Implement polish layer only when authorized. Respect HUD priority §5 and depth bands.

### Agent F (QA)

Use `docs/phase-4d-mobile-combat-feedback-checklist.md` after runtime lands.

### Agent E (Gate)

Gate 4D runtime only after planning docs merged and scope guard confirmed.

---

## 16. Verdict (Spec)

**UX SPEC READY FOR REVIEW** — Phase 4C-C formally closed; 4D runtime not authorized.
