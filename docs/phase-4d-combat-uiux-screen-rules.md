# Phase 4D Combat UI/UX Screen Rules

> **Agent D** — pixel-level safe zones and spawn rules for combat polish FX.
> Companion to `docs/phase-4d-combat-uiux-addendum.md`.
>
> Viewports: **915×412** (primary), **800×360** (compact — design first).
> Coordinates: origin top-left, x → right, y → down.

---

## 1. Screen Zone Model

Each viewport divides into **protected zones** (no combat FX overlap) and
**FX-allowed zones** (sparks, numbers, pulses may spawn).

Combat FX spawn at **world contact point** but must **not render inside**
protected screen rectangles when projected to screen space.

---

## 2. Protected Zones — 915×412

```
    0px                                                          915px
  ┌──────────────────────────────────────────────────────────────────┐
0 │ [PROTECTED: Top HUD strip — timer/score, HP/MP, menu]            │
48│──────────────────────────────────────────────────────────────────│
  │         [PROTECTED: Objective prompt band]              [Siege]   │
72│──────────────────────────────────────────────────────────────────│
  │                                                                   │
  │                    FX-ALLOWED: main playfield                     │
  │              (damage numbers drift away from edges)               │
  │                                                                   │
  │                                                                   │
248│──────────────────────────────────────────────────────────────────│
  │ [PROTECTED: Joystick]              [PROTECTED: Skills + ATK]      │
412└──────────────────────────────────────────────────────────────────┘
```

### Zone A — Top HUD strip

| Property | Value |
|---|---|
| Rectangle | x=0–915, y=0–48 |
| Contents | Time Left, Objective Score, HP/MP, menu icon |
| Rule | No damage number center may enter this rect |

### Zone B — Objective prompt band

| Property | Value |
|---|---|
| Rectangle | x=183–732 (center 60%), y=8–72 |
| Contents | Attack the Gate, Destroy the Core, Gate Breached, etc. |
| Rule | No spark/ring center; numbers may pass through only if fading (alpha <0.4) |

### Zone C — Siege Buff badge

| Property | Value |
|---|---|
| Rectangle | x=843–915, y=44–80 |
| Contents | Siege Buff badge (4C-B slot) |
| Rule | No FX center; brief toast may share band if not overlapping badge glyph |

### Zone D — Joystick (bottom-left)

| Property | Value |
|---|---|
| Rectangle | x=0–200, y=248–412 |
| Contents | Virtual joystick + touch margin |
| Rule | **Hard exclusion** — no FX, no number text bbox |

### Zone E — Action / skill cluster (bottom-right)

| Property | Value |
|---|---|
| Rectangle | x=640–915, y=220–412 |
| Contents | ATK, skills, ULT, class button |
| Rule | **Hard exclusion** — no FX, no number text bbox |

### Zone F — Capture HUD (contextual)

| Property | Value |
|---|---|
| Rectangle | Near active capture objective screen projection ±120 px |
| Contents | Capturing, Contested, progress ring |
| Rule | When capture UI active, no FX within 48 px of capture label center |

---

## 3. Protected Zones — 800×360

```
    0px                                                          800px
  ┌──────────────────────────────────────────────────────────────────┐
0 │ [PROTECTED: Compact top strip — HP, timer·score, menu, siege]    │
40│──────────────────────────────────────────────────────────────────│
  │         [PROTECTED: Objective prompt — tighter]                   │
64│──────────────────────────────────────────────────────────────────│
  │                                                                   │
  │              FX-ALLOWED (smaller, shorter effects)                │
  │                                                                   │
216│──────────────────────────────────────────────────────────────────│
  │ [PROTECTED: Joy]                    [PROTECTED: Skills + ATK]    │
360└──────────────────────────────────────────────────────────────────┘
```

### Zone A — Top HUD strip (compact)

| Property | Value |
|---|---|
| Rectangle | x=0–800, y=0–40 |
| Contents | Combined `4:32 · 12–8`, HP·MP, menu, siege icon |
| Rule | Stricter than 915 — no FX; numbers must not enter |

### Zone B — Objective prompt band (compact)

| Property | Value |
|---|---|
| Rectangle | x=160–640 (center 60%), y=4–64 |
| Rule | Same as 915 — prompt always wins |

### Zone C — Siege Buff badge (compact)

| Property | Value |
|---|---|
| Rectangle | x=728–800, y=36–68 |
| Rule | Icon-only badge — no overlap |

### Zone D — Joystick (compact)

| Property | Value |
|---|---|
| Rectangle | x=0–180, y=216–360 |
| Rule | Hard exclusion |

### Zone E — Skill cluster (compact)

| Property | Value |
|---|---|
| Rectangle | x=560–800, y=200–360 |
| Rule | Hard exclusion — damage numbers from nearby combat must drift **left** or **up** into playfield |

---

## 4. FX Spawn and Drift Rules

### Contact point

- Spawn spark/ring at world hit coordinates (gate/core/dummy/player)
- Project to screen; if center falls in protected zone, **offset spawn** toward playfield center (max 48 px nudge)

### Damage number drift

| Tier | Start offset from contact | Drift direction |
|---|---|---|
| Normal | y −16 | Up 24–36 px (800: 20–28 px) |
| Gate | y −20 | Up + slight away from top HUD |
| Core | y −24 | Up; if near top edge, drift **downward** first 20 px then up |

### Float away from controls

If projected number bbox intersects Zone D or E:

1. Apply horizontal nudge toward screen center (±24–40 px)
2. If still intersecting, fade 2× faster (250 ms total)
3. Never expand font to compensate

---

## 5. Size and Duration Limits

### 915×412

| FX type | Max display size | Max duration |
|---|---|---|
| Normal spark | 44 px | 180 ms |
| Gate spark | 56 px | 220 ms |
| Core pulse | 64 px | 280 ms |
| Skill cast flash | 64 px | 200 ms |
| Impact ring | 72 px | 400 ms |
| Damage number | 19 px font | 600 ms |

### 800×360

| FX type | Max display size | Max duration |
|---|---|---|
| Normal spark | 36 px | 150 ms |
| Gate spark | 48 px | 180 ms |
| Core pulse | 52 px | 220 ms |
| Skill cast flash | 52 px | 160 ms |
| Impact ring | 60 px | 320 ms |
| Damage number | 17 px font | 500 ms |

**Global compact rules:**

- No full-screen flash (max single FX ≤25% viewport area)
- No persistent particle cloud
- No shake on 800×360 for Core hit (recommended full disable)
- Max 4 concurrent world FX sprites (excluding damage numbers)
- Max 3 concurrent damage numbers per target cluster

---

## 6. Layer Visibility Checklist (Per Frame)

Agent A/F automated or manual check — all must pass during combat:

| Layer | Visible element | Check |
|---|---|---|
| 4 | Timer MM:SS | Readable in Zone A |
| 4 | Score digits | Readable in Zone A |
| 2 | Objective prompt | Readable in Zone B |
| 6 | Siege badge (if active) | Readable in Zone C |
| 5 | Capture label (if active) | Readable near objective |
| 3 | Joystick | Unobstructed Zone D |
| 3 | Skill buttons | Unobstructed Zone E |
| 7 | Combat FX | None permanently occluding 1–6 |

---

## 7. Screenshot Composition Guide (QA)

### 915×412 required frames

1. **normal-hit.png** — dummy hit; Zones D/E clear; number in playfield
2. **gate-hit.png** — gate spark + amber number; prompt in Zone B visible
3. **core-hit.png** — core pulse; stronger than gate frame
4. **skill-cast.png** — flash at player; skills in Zone E still tappable
5. **gate-destroyed.png** — ring at gate + Gate Breached copy
6. **hud-stack.png** — idle combat: timer, score, prompt, siege, controls all in one frame

### 800×360 required frames

1. **compact-normal-hit.png**
2. **compact-gate-hit.png**
3. **compact-core-hit.png**
4. **compact-skill-cast.png**
5. **compact-no-overlap.png** — annotated proof Zones D/E have no FX bbox overlap

---

## 8. Relationship to Prior Specs

| Source | This doc |
|---|---|
| PR #43 §5 HUD priority | Zone model implements priority — FX lowest |
| PR #43 §9 mobile layout | Pixel rects formalize "do not overlap controls" |
| PR #44 §8 mobile requirements | Bottom 40% reserved → Zones D/E |
| `mobile-hud-ux-spec.md` | Objective prompt y=8–16 / compact y=8 → Zone B |

**Conflict resolution:** See `phase-4d-combat-uiux-addendum.md` §2 for shake and color conflicts.

---

## 9. Verdict

**UIUX ADDENDUM READY FOR REVIEW** — screen rules ready for Agent B layout reference
and Agent A spawn clamp implementation.
