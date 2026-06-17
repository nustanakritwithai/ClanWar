# Phase 4E Mobile HUD / UX Safe Zones Spec

> **Agent D** — mobile HUD, screen-safe zones, and UX constraints for Phase 4E
> Visual Direction / MMORPG 2D Pixel Art Upgrade. **Docs only — not a runtime
> or asset work order.**
>
> **Primary design source:** `docs/phase-4e-visual-design-spec.md` (Agent C PR #49)
> **Builds on:** `docs/phase-4d-combat-uiux-addendum.md`,
> `docs/phase-4d-combat-uiux-screen-rules.md`, `docs/mobile-hud-ux-spec.md`
>
> Coordinates: origin top-left, x → right, y → down.

---

## 1. UX Goal

Convert Clan Siege Arena toward a **lightweight 2D Pixel MMORPG / painted fantasy
siege** look while preserving:

- Top HUD readability (Time Left, Objective Score)
- Objective prompt clarity (Gate/Core teaching)
- Capture HUD and Siege Buff badge clarity
- Joystick and attack/skill usability
- Gate/Core structure visibility on painted backgrounds
- Phase 4D damage numbers and VFX tiers without clutter

**4E is visual upgrade only** — no gameplay rule changes.

---

## 2. HUD Hierarchy (Phase 4E)

Higher layers must **never** be covered by lower layers. Environment and decorative
art are **lowest priority**.

| Layer | Name | Z-depth band | Contents |
|---|---|---|---|
| **1** | Result / match ending | 1300+ | Victory, Defeat, Draw, result reasons |
| **2** | Objective prompt | 1100–1200 | Attack the Gate, Destroy Gate first, Gate Breached, Destroy the Core, Defend your Core |
| **3** | Player controls | 2000+ | Joystick, attack button, skill buttons |
| **4** | Timer / Objective Score | 1050 | Time Left, Objective Score chip |
| **5** | Capture HUD | 1100 (contextual) | Capturing, Contested, Captured, progress |
| **6** | Siege Buff badge | 1150 | Siege Buff icon/badge, state toasts (secondary) |
| **7** | Gate/Core visual feedback | World + HUD | Structure states, 4D hit tiers, Gate Breached ring |
| **8** | Unit combat feedback | 140–155 world | Hit sparks, damage numbers, skill cast flash |
| **9** | Environment / parallax / decorative | 0–25 world | Painted background, tiles, props, particles |

**Rule:** Layers 1–6 must remain readable at all times. Layer 9 (parallax, painted
backgrounds, decorative props) must **never** cover Layers 1–6. Layer 7–8 spawn
in playfield or at structure contact — must respect protected screen rects (§3–4).

*Aligns with PR #43/#46 7-layer stack; extends with Gate/Core visual (7) and
environment (9) per Agent C PR #49.*

---

## 3. Screen Safe Zones — 915×412 Landscape

```
    0px                                                          915px
  ┌──────────────────────────────────────────────────────────────────┐
0 │ ZONE A — Top HUD strip (timer, score, HP/MP, menu)               │
52│──────────────────────────────────────────────────────────────────│
  │ ZONE B — Objective prompt band (center)          ZONE G — Siege  │
80│──────────────────────────────────────────────────────────────────│
  │                                                                   │
  │ ZONE H — Center combat readable zone (FX allowed, short-lived)   │
  │                                                                   │
  │         ZONE I — Gate/Core objective visual (world map regions)   │
  │         ZONE J — Capture Point zones (per objective, contextual)  │
  │                                                                   │
252│──────────────────────────────────────────────────────────────────│
  │ ZONE C — Joystick          ZONE D — Attack/skill cluster         │
412└──────────────────────────────────────────────────────────────────┘
```

### Zone A — Top HUD strip

| Property | Value |
|---|---|
| Rectangle | x=0–915, y=0–52 |
| Contents | Time Left (MM:SS), Objective Score, HP/Mana bars, menu |
| Min text | Timer digits ≥14 px mono; score digits ≥12 px |
| 4E frame rule | Fantasy trim allowed on chip edges — **inner text area must stay flat high-contrast** |
| Rule | No world VFX, parallax overlay, or decorative art may occlude |

### Zone B — Objective prompt band

| Property | Value |
|---|---|
| Rectangle | x=183–732 (center 60%), y=8–80 |
| Contents | Canonical objective copy (one line) |
| 4E frame rule | Plaque/frame with gold/stone trim OK — **copy on `#10151dcc` glass min 85% opacity** |
| Contrast | Text `#f5e6c8` or white on dark glass; stroke if on bright parallax bleed |
| Rule | Highest instructional priority after result overlay |

### Zone C — Joystick area

| Property | Value |
|---|---|
| Rectangle | x=0–210, y=248–412 (includes 10 px touch margin) |
| Min touch | 88×88 px effective (44 px knob + margin) |
| 4E frame rule | Stone ring base allowed — **knob direction indicator must stay clear** |
| Rule | No permanent decorative art, damage numbers, or VFX bbox inside |

### Zone D — Attack / skill cluster

| Property | Value |
|---|---|
| Rectangle | x=630–915, y=216–412 |
| Contents | ATK, S1–S3, ULT, class switch |
| Min touch | 44×44 px per button (existing) |
| 4E frame rule | Square stone frames OK — **icon inset ≥70% of button**; no ornate wings blocking tap |
| Rule | Hard exclusion for FX and floating numbers |

### Zone E — Center combat readable zone (screen projection)

| Property | Value |
|---|---|
| Rectangle | x=120–795, y=80–248 |
| Purpose | Primary playfield where combat VFX and damage numbers are allowed |
| Rule | Numbers drift **away** from Zones A–D when projected from edge fights |

### Zone F — Result screen priority (full viewport when active)

| Property | Value |
|---|---|
| Rectangle | Full screen when `ResultScene` or match-end overlay |
| Contents | VICTORY / DEFEAT / DRAW, reason lines, Back to Menu |
| 4E rule | Fantasy frame around result panel OK — **no full-screen illustrated splash blocking text** |
| Rule | Layer 1 — blocks all combat FX underneath |

### Zone G — Siege Buff badge

| Property | Value |
|---|---|
| Rectangle | x=835–915, y=48–88 |
| Contents | Siege Buff badge (icon ± compact text on 915) |
| 4E visual | Hammer/banner pixel icon — **not coin, not medal, not shop bag** |
| Rule | Must not be mistaken for currency or ranking |

### Zone H — Gate/Core objective visual zone (world)

| Property | Value |
|---|---|
| Map regions | Red/Blue Gate and Core world positions (frozen coordinates) |
| Display | Structures must remain **larger silhouette than props** (Gate ~128 px wide, Core ~96–160 px) |
| Rule | Parallax props must not overlap gate/core hit circles in a way that mimics interactable objectives |
| 4D tie-in | Gate/Core hit VFX spawn at structure center; may extend into Zone E only |

### Zone I — Capture Point zone (contextual, world + HUD)

| Property | Value |
|---|---|
| World | 6 capture objectives — radius 55–75 display per map spec |
| HUD | When player in radius: capture label near top-center or objective-attached chip |
| Protected HUD rect | Screen projection of capture UI ±100 px — no FX center within 48 px of capture label |
| Rule | Capture HUD must not look like reward/quest panel (no gold coin header, no "Quest Complete" styling) |

---

## 4. Screen Safe Zones — 800×360 Compact

```
    0px                                                          800px
  ┌──────────────────────────────────────────────────────────────────┐
0 │ ZONE A′ — Compact top HUD (`4:32 · 12–8`, HP·MP, menu, siege)    │
44│──────────────────────────────────────────────────────────────────│
  │ ZONE B′ — Compact objective prompt                    ZONE G′     │
68│──────────────────────────────────────────────────────────────────│
  │ ZONE E′ — Safe center combat (smaller, shorter FX)               │
216│──────────────────────────────────────────────────────────────────│
  │ ZONE C′ — Compact joystick      ZONE D′ — Compact skills + ATK   │
360└──────────────────────────────────────────────────────────────────┘
```

### Compact-specific rules

| Rule | Value |
|---|---|
| Top HUD strip | x=0–800, y=0–44 — **stricter than 915** |
| Objective band | x=160–640, y=4–68 |
| Joystick | x=0–190, y=216–360 |
| Skill cluster | x=555–800, y=200–360 |
| **No full-screen flash** | Any single FX ≤20% viewport area |
| **Reduced VFX lifetime** | −15–20% vs 915 table (§8) |
| **Reduced damage drift** | Upward float 20–28 px (not 28–36) |
| **Min text size** | Timer/score ≥11 px; objective prompt ≥12 px; HUD labels may hide — numbers required |
| **Compact shake** | **Disabled** on 800×360 (recommended full disable per 4D) |

---

## 5. MMORPG UI Direction (UX Rules)

Translate Agent C Section H into enforceable mobile UX:

| Element | Allowed | Forbidden |
|---|---|---|
| HUD frames | Thin gold `#cfa14a` / stone trim on dark glass `#10151dcc` | Thick ornamental borders reducing text area |
| Timer/score chip | Compact raid-timer mono digits + score pips | Coin purse icon, gold pile, shop styling |
| Objective plaque | Center-top, 1 line, high contrast | Multi-line quest journal, scrolling banner |
| Skill buttons | Stone square frame, class-color icon inset | Overdecorated frames shrinking tap target below 44 px |
| Joystick | Stone ring, subtle rune etch | Opaque art blocking thumb position feedback |
| Capture HUD | Team-color border chip, progress arc | Reward chest panel, EXP bar styling |
| Siege Buff badge | Hammer/banner, amber edge glow | Currency coin, rank medal, shop bag |
| HP/Mana | Thin ornate bars, blue/cyan fills | RPG inventory chrome |

**Flat-enough rule:** Decorative trim lives on **outer 4–6 px** of frames; inner
70% of each HUD element is flat fill + text/icon for mobile readability.

---

## 6. Pixel Art Readability Rules

| Rule | Requirement |
|---|---|
| Player silhouette | Readable at 32–48 px body on 800×360; class shape distinct |
| Class vs team color | Class accent (e.g. Mage purple) must not override team Blue/Red readability — team ring or banner required |
| Gate vs props | Gate width ≥2× generic prop; arch silhouette unique |
| Core vs VFX | Core crystal silhouette persistent through hit FX — pulse overlays ≤40% opacity at peak |
| Capture contested | Split-color or clash icon visible at 64 px icon scale |
| Facing / direction | Attack arc and movement direction readable without minimap |
| Background props | Wagons, banners, rubble — **no collision, no capture-ring mimic** |
| Parallax contrast | Background luminance mid-range; gameplay layer +20% edge contrast vs parallax |
| Integer scale | Prefer 1×/2× pixel scaling — no blur on hero/objective sprites |
| Outline | 1–2 px `#0b0e13` on sprites over painted ground |

---

## 7. Damage Numbers and VFX UX (4D Preservation)

Build on Phase 4D — **behavior frozen**, 4E may swap pixel art only.

### Damage numbers

| Tier | Color | Size 915 / 800 | Lifetime 915 / 800 |
|---|---|---|---|
| Normal | `#f87171` | 14–16 / 12–14 px | 500 / 400 ms |
| Gate | `#cfa14a` | 16–18 / 14–16 px | 550 / 450 ms |
| Core | `#f4d35e` | 17–19 / 15–17 px | 600 / 500 ms |

- Cyan `#22d3ee` accent on **pulse ring only** — not on number (per 4D addendum)
- Max 3 concurrent numbers per target cluster
- **Forbidden zones:** Zones A, B, C, D (both viewports)
- **Forbidden styles:** coin, EXP, ranking, crit burst unless crit rule exists

### VFX tiers (pixel swap allowed)

| Tier | Event | 915 max size / duration | 800 max size / duration |
|---|---|---|---|
| L1 | Normal hit | 44 px / 180 ms | 36 px / 150 ms |
| L3 | Gate hit | 56 px / 220 ms | 48 px / 180 ms |
| L4 | Core hit | 64 px / 280 ms | 52 px / 220 ms |
| Cast | Skill flash | 64 px / 200 ms | 52 px / 160 ms |
| L5 | Impact ring | 72 px / 400 ms | 60 px / 320 ms |

- No full-screen flash on 800×360
- No persistent particle clouds
- No VFX center in objective prompt band while prompt alpha >0.4
- Max 4 concurrent world FX sprites (excluding damage numbers)

---

## 8. Player-Facing Copy Rules

### Allowed (canonical — do not rename in 4E reskin)

Attack the Gate · Destroy Gate first · Gate Breached · Destroy the Core ·
Defend your Core · Time Left · Objective Score · Siege Buff · Siege Buff Active ·
Capturing · Contested · Captured · Victory · Defeat · Draw · Core Destroyed ·
Victory by Objective Score · Final Minute · Time Up

### Forbidden

snake_case · debug strings · internal texture keys · `hit_debug` ·
`damage_multiplier` · `impact_state` · `gate_hit_state` · `core_pulse_state` ·
economy/reward wording · EXP / Gold / Shop / Ranking (unless future authorized phase)

**4E reskin:** swap frames and icons — **never** swap copy keys to player-visible text.

---

## 9. Agent B Asset Handoff (Future — Not Started)

Agent B provides **after** this spec merges. UX constraints:

### Must deliver (Theme 1 MVP)

| Deliverable | UX requirement |
|---|---|
| HUD frame references | Thin trim; dark glass readable on painted bg |
| Timer/score chip visual | Mono digits legible; not coin-shaped |
| Objective prompt frame | Center plaque; 1-line width ≤50% screen |
| Joystick frame | 88 px touch ring; clear knob |
| Attack/skill button frames | 44 px min tap; icon inset 70% |
| Siege Buff badge visual | Hammer/banner — not currency |
| Capture HUD visual | Progress arc; team border — not quest reward panel |
| Gate/Core priority examples | States readable at 800×360 |
| Mobile mockups | 915×412 and 800×360 annotated with safe zones |

### Must not deliver

Runtime code · gameplay systems · economy UI · minimap · shop UI · ranking UI · Phase 5A assets

### Asset path convention

`public/assets/phase-4e/**` per Agent C Section J — manifest keys must map to
existing runtime slots (swap-only).

---

## 10. Agent A Runtime Handoff (Future — Not Started)

### Allowed (when authorized)

- Visual theme config (`visualTheme: 'castle_siege'`)
- Swap placeholder art for approved 4E assets
- Load UI frame / sprite sheet assets
- Preserve existing input hit areas and depths
- Preserve 4D combat VFX behavior (timing/tiers)
- All prior regression suites must pass

### Forbidden

- Move control hitboxes without explicit UX approval
- Change damage, HP, timer, capture, siege rules
- Add minimap, economy, monster AI, multiplayer, 5A systems
- New objective logic or win conditions
- Collision/radius/coordinate changes

Suggested order (from Agent C): structures → capture → HUD → hero → tiles → VFX pixel swap.

---

## 11. QA Requirements (Agent F)

### Required screenshots / probes

| Probe | Viewport | Pass |
|---|---|---|
| Full gameplay HUD | 915×412 | ☐ |
| Full gameplay HUD | 800×360 | ☐ |
| Gate hit + HUD visible | 915×412 | ☐ |
| Core hit + HUD visible | 915×412 | ☐ |
| Capture Point active | 915×412 | ☐ |
| Siege Buff active | 915×412 | ☐ |
| Skill cast + controls visible | both | ☐ |
| Crowded combat | 915×412 | ☐ |
| Result screen | both | ☐ |
| Menu ↔ Match reset ×3 | both | ☐ |
| UI overlap audit | 800×360 | ☐ |
| Forbidden copy audit | both | ☐ |
| Asset load audit | both | ☐ |
| 4B–4D regression suites | CI | ☐ |

### UI overlap audit method

Project Zones A–D, B, G onto screenshot; verify no damage number bbox or FX center
inside protected rects during combat sample.

---

## 12. UX Acceptance Criteria (UX-4E-AC1–AC20)

| ID | Criterion | Pass |
|---|---|---|
| UX-4E-AC1 | 915×412 full HUD readable after reskin | ☐ |
| UX-4E-AC2 | 800×360 compact layout readable | ☐ |
| UX-4E-AC3 | Joystick not blocked by art or FX | ☐ |
| UX-4E-AC4 | Attack/skill buttons not blocked | ☐ |
| UX-4E-AC5 | Top HUD strip (timer/score) readable | ☐ |
| UX-4E-AC6 | Objective prompt readable (high contrast) | ☐ |
| UX-4E-AC7 | Capture HUD readable when active | ☐ |
| UX-4E-AC8 | Siege Buff badge readable; not currency-like | ☐ |
| UX-4E-AC9 | Gate structure visible vs props/background | ☐ |
| UX-4E-AC10 | Core structure distinct from VFX | ☐ |
| UX-4E-AC11 | Pixel art does not obscure gameplay objectives | ☐ |
| UX-4E-AC12 | Painted backgrounds do not reduce HUD contrast | ☐ |
| UX-4E-AC13 | VFX does not cover controls or Layers 1–6 | ☐ |
| UX-4E-AC14 | No economy visual confusion (coin/shop/rank) | ☐ |
| UX-4E-AC15 | No Phase 5A scope in art (minimap, shop, talents) | ☐ |
| UX-4E-AC16 | 4B Gate/Core regression preserved | ☐ |
| UX-4E-AC17 | 4C-A/B/C capture/siege/timer regressions preserved | ☐ |
| UX-4E-AC18 | 4D combat-feel regression preserved | ☐ |
| UX-4E-AC19 | Menu ↔ Match ×3 — no stale theme/overlays | ☐ |
| UX-4E-AC20 | No forbidden copy in player UI | ☐ |

*Maps to VIS-AC1–VIS-AC20 (Agent C) — UX-4E-AC emphasizes safe zones and mobile overlap.*

---

## 13. Compatibility with Prior Phases

### 4B — Gate/Core flow

Protected Core until gate breach · Core destroyed immediate result · visual
protected state (cyan shield) until gate falls.

### 4B-B — Clarity prompts

Destroy Gate first · Gate Breached · Destroy the Core — frames may change, copy frozen.

### 4C-A — Capture

Score on capture complete · capture HUD states · ownership colors on reskin.

### 4C-B — Siege Buff

+30% enemy Gate only · contested-off · badge not confused with economy.

### 4C-C — Timer / score

300 s · score win at time-up · Core HP tiebreak · Draw · no Sudden Death.

### 4D — Combat feel

Intensity ladder · damage number tiers · mobile-safe FX · no gameplay behavior change.

### 4E — This phase

Visual upgrade only · runtime not authorized until Agent A work order after C+D+B gate.

---

## 14. Scope Guard

**Not authorized:** bot AI, economy, EXP, Gold, shop, ranking, minimap, route/lane
UI, respawn, vision/fog, multiplayer/login/clan/payment, Sudden Death, new objectives,
tutorial overhaul, **Phase 5A**, runtime code, asset production (this PR).

---

## 15. Verdict

**UX SPEC READY FOR REVIEW** — Phase 4E mobile HUD safe zones defined; Agent B
asset production and Agent A runtime **not** authorized by this document.
