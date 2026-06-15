# Objective Explanation Flow — Gate & Core MVP

> **Agent D** — how the game teaches what objectives **mean**, not just where they
> are. Player-facing mental model for Phase 4B/4C.
>
> References: `docs/phase-4-gameplay-loop.md`, `docs/objective-placement-spec.md`,
> `docs/objective-asset-manifest.md`.

---

## 1. UX Goal

Player builds this mental model **without reading a manual**:

```
Gate = wall you must break to enter the base
Core = heart of the base — destroy it to win
Order = break their gate first, then their core
Defend = keep your gate up so your core stays safe
```

---

## 2. Player Problem

| Misconception | Cause |
|---|---|
| "Core and gate are the same" | Both large structures on main route |
| "I should attack core first" | Core sprite visible behind gate |
| "Gate is decoration" | No damage feedback in 4B visual pass |
| "I already won when gate falls" | No clear transition teach |
| "Core vulnerable means I should attack it" | Ambiguous — could mean own or enemy core |

---

## 3. Explanation Flow — Teach by Doing

### Stage 1 — See (4B visual pass)

**When:** Player first sees objective sprites (approach enemy base or spawn pan).

| Objective | Visual teach | One-line callout (first sight) |
|---|---|---|
| **Enemy gate** | `red_gate.svg` on wall line, largest opening | **Attack the Gate** |
| **Enemy core** | `red_core.svg` deeper in base, behind gate | *(no callout yet — too early)* |
| **Own gate** | `blue_gate.svg` when player retreats | *(passive)* |
| **Own core** | `blue_core.svg` at spawn teach moment | **Protect your Core** |

**Rule:** Do not explain all four at spawn — **enemy gate only** until mid match.

### Stage 2 — Act (4C minimal siege)

**When:** Player can deal damage to objectives.

| Event | Explanation method | Copy |
|---|---|---|
| First hit on gate | Damage number + `objective_warning` flash | *(no text — feel impact)* |
| Gate HP < 30% | HUD chip: gate icon + low HP color | **Break the Gate** |
| Gate HP = 0 | Toast + destroyed sprite | **Gate Breached!** |
| Core becomes targetable | Attack marker on core + toast | **Core is open — destroy it!** |
| First hit on core | Damage number + warning on core | *(no text)* |
| Core HP = 0 | Result scene | **Victory!** |

### Stage 3 — Defend (4C+ / when bot exists)

**When:** Own gate takes damage.

| Event | Explanation | Copy |
|---|---|---|
| Own gate hit | `objective_warning` on `blue_gate` | **Your Gate is under attack!** |
| Own gate destroyed | Alert + defend marker on core | **Core Vulnerable — defend!** |
| Own core hit | Critical alert | **Enemy Attacking Core!** |

**MVP note:** Defend teach may use **scripted scenario** in playtest until bot AI ships.
Single-player vs dummy: teach defend concept at 0:22 spawn ping only.

---

## 4. What Each Objective Means (player-facing)

### Gate

| Question | Answer (EN) | Answer (TH) |
|---|---|---|
| What is it? | The fortress wall door — blocks the base | ประตูป้อม — ขวางทางเข้าฐาน |
| Why attack? | You cannot reach their core until it falls | ต้องทำลายก่อนถึงแกนหลัก |
| Where? | On the main path at the base entrance | อยู่บนเส้นทางหลักหน้าฐาน |
| What does breached mean? | The wall is down — push inside | ประตูพังแล้ว — บุกเข้าได้ |

### Core

| Question | Answer (EN) | Answer (TH) |
|---|---|---|
| What is it? | The base heart — the win target | หัวใจของฐาน — เป้าหมายชนะ |
| Why important? | Destroy enemy core = you win | ทำลายแกนศัตรู = ชนะ |
| Where? | Deepest inside the base, behind the gate | ลึกสุดในฐาน หลังประตู |
| What does vulnerable mean? | Your gate is down — enemy can hit your core | ประตูคุณพัง — ศัตรูโจมตีแกนได้ |

### Priority order (MVP)

```
Attack enemy gate → Enter base → Destroy enemy core = WIN
Protect own gate → If gate falls, protect own core = DON'T LOSE
```

**Deferred objectives** (one line each, no teach flow in MVP):

| Objective | One-liner when asked |
|---|---|
| Watchtower | "Holds the high ground — capture later" |
| Forward camp | "Advanced spawn point — later" |
| Resource camp | "Extra resources — later" |
| Siege ruins | "Midfield fight zone — not the win target" |

---

## 5. Screen / Mobile Notes

| Teach moment | Format | Max duration |
|---|---|---|
| First sight callout | HUD prompt, 1 line | 4 s |
| Gate breached | Toast + icon, center-top | 3 s |
| Core open | Toast + attack marker | Until dismissed or hit |
| Defend core | Alert strip, amber/red | 5 s or threat ends |

**Never** show a paragraph tooltip. **Never** pause the match for explanation modal.

### Optional micro-card (4B.1 — defer if tight)

First gate sight: 3-icon strip for 2 s only:

`[Gate icon] → break  |  [Core icon] → win  |  [Shield] → defend`

---

## 6. UX Copy

See `docs/ux-copy-and-message-guide.md` for complete strings.

**Explanation-specific:**

| Concept | EN | TH |
|---|---|---|
| Gate intro | Break the gate to enter | ทุบประตูเพื่อเข้าไป |
| Core intro | Destroy the core to win | ทำลายแกนหลักเพื่อชนะ |
| Gate breached explain | The way is open! | ทางเปิดแล้ว! |
| Core open explain | Core is open — destroy it! | แกนหลักเปิดแล้ว — ทำลายเลย! |
| Core vulnerable explain | Defend your core! | ป้องกันแกนหลักของคุณ! |
| Wrong target (4C) | Gate must fall first | ต้องทำลายประตูก่อน |
| Win | Victory! | ชนะ! |
| Lose | Defeat | แพ้ |

---

## 7. Implementation Brief for Agent A

1. **`ObjectiveExplainController`** — listens to first-sight events per objective type.
2. **First sight:** trigger when objective enters camera viewport AND not seen before
   this match (`Set<ObjectiveId>`).
3. **Gate before core:** if player attacks core while gate HP > 0, show floating deny
   text **"Gate must fall first"** at core position 1.5 s (4C only).
4. **State transition toasts:** on `gateDestroyed` → show breached toast, update
   `nextObjectiveChip` to Core, spawn `attack_core` marker.
5. **Core invulnerable feedback:** subtle shield shimmer on core when hit immune —
   reuse tint flash, no new asset required for MVP.
6. **Do not** add lore text, history, or multi-page codex.
7. **Result scene:** one line recap — "You destroyed the enemy core" / "ศัตรูทำลายแกนหลักของคุณ".

---

## 8. Asset Brief for Agent B

| Asset | Explanation use |
|---|---|
| `red_gate.svg` / `blue_gate.svg` | Must read as "door in wall" at 96–128 px |
| `red_core.svg` / `blue_core.svg` | Must read as "crystal/nexus" — taller than gate |
| `objective_destroyed.svg` | Teaches "this objective is done" |
| `icon_gate_small` + `icon_core_small` | Optional 3-icon micro-card |
| `shield_shimmer` overlay | Core invulnerable feedback — optional 4C |

If gate vs core confused in playtest: request **silhouette pass** from Agent B —
gate wider, core taller/brighter.

---

## 9. Design Dependency from Agent C

| Rule from Agent C | UX enforcement |
|---|---|
| Core behind gate toward spawn | Attack core deny until gate down |
| Win = red core HP 0 | Victory copy and Result handoff |
| Lose = blue core (deferred) | Defend teach exists but lose deferred |
| Ruins not win condition | No explanation card for ruins |
| Gate on wall line y 1000/3200 | Sight triggers at approach distance |

---

## 10. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| E1 | Player describes gate as "wall/door to break" after first match (playtest) | ☐ |
| E2 | Player describes core as "win target" after first match | ☐ |
| E3 | Player does not think ruins are the win condition | ☐ |
| E4 | Gate breached moment produces clear toast + visual destroyed state | ☐ |
| E5 | Attacking core through intact gate shows "gate first" feedback (4C) | ☐ |
| E6 | No explanation modal or pause | ☐ |
| E7 | EN and TH strings available for all teach moments | ☐ |
| E8 | Total explanation text ≤ 12 unique strings in MVP | ☐ |
