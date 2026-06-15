# Phase 4B-B: Objective Clarity Design Acceptance

> **Agent C** — design acceptance criteria for Phase 4B-B runtime, UX, and asset
> polish. This phase answers player confusion questions only. It does **not**
> introduce new gameplay systems.
>
> **Base:** PR #23 merged (`34a277c`) — Gate/Core MVP loop works.
> **Judgment question:** *"Can a solo player complete Gate → Core → Victory
> without confusion?"*

---

## 1. Phase 4B-B Goal

Phase 4B-B is **Objective Clarity / Feedback Polish**.

It improves how the existing Gate/Core siege loop is communicated to the player:
HUD prompts, protected-core feedback, gate-breach transition copy, result-screen
clarity, and mobile readability. All work must stay inside the loop already shipped
in Phase 4B-A:

**Blue Spawn → Red Gate → Red Core → Victory** (Blue Core destroyed → Defeat).

Phase 4B-B is **not** a new gameplay system. It must not add bots, economy,
capture, new objectives, persistent quests, tutorials, or win-condition changes.

---

## 2. Player Questions This Phase Must Answer

| Question | How 4B-B answers it |
|---|---|
| What is my first target? | Match-start HUD and/or guidance shows **Attack the Gate**. |
| Why can't I damage the core yet? | Protected core shows short feedback: **Destroy Gate first** — no damage, no `under_attack`. |
| What changed after the gate broke? | Gate breach visual + optional toast (**Gate Breached** or **Core is open**) + HUD switches to **Destroy the Core**. |
| What do I do after the gate is destroyed? | HUD priority and prompt direct player to **Destroy the Core**. |
| Why did I win or lose? | Result screen shows human-readable outcome + reason — no internal keys. |

---

## 3. Core Acceptance Criteria

### AC1 — Match start clarity

Player sees and understands **Attack the Gate** at match start without reading
debug text or internal state keys.

**Pass when:**

- Primary objective HUD icon/label shows **Attack the Gate** (or approved
  equivalent from canonical copy list below).
- Player at 915×412 can identify first target within first 30 seconds of play.

---

### AC2 — Protected core clarity

If the player attacks Red Core before Red Gate is destroyed:

| Requirement | Expected behavior |
|---|---|
| Damage | **No damage** applied to core |
| Combat state | Core does **not** enter `under_attack` |
| Feedback | Short world or HUD feedback appears: **Destroy Gate first** |
| UX constraints | **No modal**, **no pause**, **no technical text** |
| Spam control | Feedback respects cooldown — does not flood screen |

**Known gap from 4B-A:** protected-core feedback may not trigger from all real
combat paths. 4B-B must close this gap so feedback appears from normal basic
attack and skill hits that would otherwise be blocked.

---

### AC3 — Gate destroyed transition

When Red Gate is destroyed:

| Requirement | Expected behavior |
|---|---|
| Core vulnerability | Red Core becomes **vulnerable** (hittable) |
| HUD prompt | Primary prompt changes to **Destroy the Core** |
| Transition feedback | Optional short feedback: **Gate Breached** or **Core is open** |
| Visual state | Gate shows breached/destroyed visual; core shows vulnerable overlay |

Transition feedback is optional but recommended. HUD prompt change is required.

---

### AC4 — Result clarity

**Victory**

- Headline: **VICTORY**
- Reason: **Enemy core destroyed**

**Defeat**

- Headline: **DEFEAT**
- Reason: **Your core was destroyed**

Result copy must be human-readable. No snake_case, no raw enum keys, no debug
strings visible to the player.

---

### AC5 — No internal keys

Player-facing UI must **not** show raw or debug state labels, including:

- `enemy_core_destroyed`
- `friendly_core_destroyed`
- `attack_gate`
- `attack_core`
- `protected`
- `vulnerable`

Internal keys may exist in code and debug overlays (when debug overlay is on)
but must never appear in HUD, toasts, floating text, or ResultScene copy shown
to players.

---

### AC6 — Mobile clarity

Objective prompts and feedback must remain readable and playable at:

- **915×412** (primary mobile layout)
- **800×360** (compact layout)

**Pass when:**

- HUD objective icon + label legible without overlap on joystick or skill buttons.
- Protected-core and gate-breach feedback visible at both resolutions.
- No new UI element blocks movement or combat controls.

---

### AC7 — Reset clarity

Menu → Match repeated runs must reset the objective prompt to **Attack the Gate**.

**Pass when:**

- After Menu ↔ Match ×3, HUD shows **Attack the Gate** at match start each time.
- No stale breach/vulnerable overlays, toasts, or wrong-priority icons carry over.
- All four objectives return to full HP and correct initial combat states.

---

## 4. Visual State Communication

Expected player-readable meaning for each objective visual state. Assets from
`public/assets/objective-feedback/**` (PR #18) and base sprites (PR #13) may be
used; 4B-B does not require new asset categories beyond the approved micro-pack.

| State | Player reads as | Visual / copy signal |
|---|---|---|
| Gate intact | Enemy gate is the current attack target | Intact gate sprite; HUD **Attack the Gate** |
| Gate under attack | Gate is taking damage | `objective_under_attack` overlay (or equivalent); gate HP decreasing |
| Gate breached | Gate is destroyed; path to core is open | `gate_breached_*` or destroyed gate visual; optional **Gate Breached** toast |
| Core protected | Core cannot be damaged yet — destroy gate first | `core_vulnerable_*` **not** shown; protected feedback on blocked hit |
| Core open / vulnerable | Core can now be destroyed | `core_vulnerable_*` overlay; HUD **Destroy the Core**; optional **Core is open** |
| Core under attack | Core is taking damage | `objective_under_attack` overlay while actively damaged |
| Core destroyed | Objective eliminated — match may end | Destroyed/rubble visual; match ends if win/lose condition met |

**Distinction rules:**

- **Protected** vs **vulnerable:** protected core shows no vulnerable overlay and
  rejects damage; vulnerable core shows threat overlay and accepts damage.
- **Gate breached** vs **core vulnerable:** gate breach is about the gate falling;
  core open is about the win target becoming hittable. Both may appear in sequence
  but must not contradict each other.

---

## 5. Copy Rules

### Canonical English copy (4B-B required)

| String | Use |
|---|---|
| Attack the Gate | Match-start primary objective prompt |
| Destroy the Core | Post-breach primary objective prompt |
| Defend your Core | Future defend priority (wired; no bot required in 4B-B) |
| Destroy Gate first | Protected-core blocked-hit feedback |
| Gate Breached | Optional gate-destroyed transition toast |
| Core is open | Optional core-vulnerable transition toast |
| Enemy core destroyed | Victory reason line |
| Your core was destroyed | Defeat reason line |

### Copy constraints

- Sentence case English; verb-first; ≤6 words for prompts; ≤5 words for alerts.
- No technical jargon (nexus, capture point, spawn pad, enum names).
- Thai copy is **future optional** — not required for 4B-B sign-off.
- If Agent D UX docs specify alternate phrasing, Agent D + Agent C must agree
  before deviating from the canonical list above.

---

## 6. Regression Expectations (Agent A)

Agent A runtime PR for 4B-B must include or extend automated regression coverage
for the following. Manual playtest (Agent F) still required.

| ID | Test | Pass criteria |
|---|---|---|
| R-1 | Protected core feedback appears | Hitting protected Red Core from a real combat path shows **Destroy Gate first** |
| R-2 | Cooldown prevents spam | Repeated blocked hits do not stack overlapping feedback within cooldown window |
| R-3 | HUD changes after gate destroyed | After Red Gate `destroyed`, HUD shows **Destroy the Core** (not Attack the Gate) |
| R-4 | 800×360 mobile still usable | Objective HUD + feedback readable; controls unobstructed |
| R-5 | ResultScene no snake_case | Victory/defeat reasons use canonical copy — no `enemy_core_destroyed` etc. |
| R-6 | Menu ↔ Match ×3 resets prompt | Three cycles; each new match starts with **Attack the Gate** |

Existing regression suites (`phase-4b-objective-regression.mjs`, mobile multitouch,
3B-B2/B3, 4A map visual) must continue to pass. New clarity tests may be added
only in `scripts/**` by Agent A — this doc does not author tests.

---

## 7. Design Sign-off

| Role | Responsibility |
|---|---|
| Agent A | Implement clarity polish + regression tests per this doc |
| Agent B | Asset micro-pack only — no extra categories beyond approved scope |
| Agent D | UX copy/mobile rules — must align with Section 5 |
| Agent F | Playtest against AC1–AC7 |
| Agent E | Final gate — block scope creep per `phase-4b-b-scope-guard.md` |

**Merge gate:** Phase 4B-B runtime polish PR may move from Draft → Ready only
after Agent C + Agent F sign off against this document.

---

## 8. References

- `docs/gate-core-loop-spec.md` — loop and stats (unchanged in 4B-B)
- `docs/objective-state-machine-spec.md` — combat states
- `docs/objective-runtime-acceptance-gate.md` — Phase 4B-A gate (completed)
- `docs/phase-4b-b-scope-guard.md` — in/out of scope for this phase
- `docs/ux-copy-and-message-guide.md` — Agent D canonical strings (align where merged)
