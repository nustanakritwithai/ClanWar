# Phase 4C-A: Objective Capture Foundation — Design Acceptance

> **Agent C** — design acceptance criteria for the Objective Capture Foundation.
> This phase makes the six existing **non-core** map objectives capturable:
> ownership, capture progress, contest, visual state, and a simple score. It does
> **not** add the gameplay payoffs those objectives will eventually grant.
>
> **Base:** PR #26 merged (`c4dc9e3`) — Gate/Core loop + protected-core feedback
> live verified.
> **Judgment question:** *"Can a solo player walk into a neutral camp circle,
> fill a capture bar, flip it to their team, and see score go up — at 915×412 —
> without anything else changing?"*

---

## 1. Phase 4C-A Goal

Phase 4C-A is the **Objective Capture Foundation**.

It introduces a single new mechanic — **standing in an objective circle to capture
it** — for the six non-core objectives that already exist as neutral markers on
the map:

- Resource Camp L
- Resource Camp R
- Watchtower
- Siege Ruins
- Forward Camp L
- Forward Camp R

The Gate/Core siege loop from Phase 4B is **frozen and unchanged**. Capture is an
additive, side-objective layer. This phase delivers **ownership + score only**.
Every downstream reward those objectives will eventually grant (gate-damage bonus,
respawn point, vision, economy) is **explicitly deferred** to later sub-phases and
must not be implemented here.

These markers already exist in the runtime data and must be reused, not
re-authored:

| Id (`map-small-twin-fortress.ts`) | `ObjectiveType` | Label | Position | Radius |
|---|---|---|---|---|
| `forwardCampL` | `forwardCamp` | Forward Camp L | (900, 2550) | 60 |
| `forwardCampR` | `forwardCamp` | Forward Camp R | (2100, 2550) | 60 |
| `siegeRuins` | `siegeRuins` | Siege Ruins | (1500, 2100) | 75 |
| `resourceCampL` | `resource` | Resource Camp L | (850, 1700) | 60 |
| `resourceCampR` | `resource` | Resource Camp R | (2150, 1700) | 60 |
| `watchtower` | `watchtower` | Watchtower | (1500, 1600) | 55 |

> The `ObjectiveType` union (`src/game/types.ts`) and these markers are already in
> place. Phase 4C-A wires capture behavior onto them — it does not add new
> objective types or move existing ones.

---

## 2. Capturable Objectives

The following six objectives become capturable runtime targets. Their geometry
(position, radius) is taken from existing map data and **must not be changed** in
4C-A.

| Objective | Score on capture | Capture radius source | Future payoff (NOT in 4C-A) |
|---|---|---|---|
| Resource Camp L | +5 | marker radius (60) | EXP/Gold tick — Phase 4C-? economy |
| Resource Camp R | +5 | marker radius (60) | EXP/Gold tick — Phase 4C-? economy |
| Watchtower | +5 | marker radius (55) | Vision / warning / map awareness |
| Siege Ruins | +8 | marker radius (75) | Gate damage bonus — **Phase 4C-B** |
| Forward Camp L | +6 | marker radius (60) | Forward respawn point |
| Forward Camp R | +6 | marker radius (60) | Forward respawn point |

**Capture radius:** use each marker's existing `radius` as the capture circle. A
small fixed tolerance for "inside the circle" is allowed for readability but the
visual circle and the capture circle must match what the player sees. No new
position or radius tuning is in scope.

---

## 3. Owner States

Each capturable objective has exactly one owner state at any time.

| Owner state | Meaning |
|---|---|
| `neutral` | Uncaptured — the initial state for all six objectives |
| `blue` | Owned by the player's team |
| `red` | Owned by the enemy team |

Rules:

- All six objectives start `neutral` at match start and after every match reset.
- Ownership only changes through a **completed capture** (Section 4).
- In the solo MVP there is no enemy capturer, so in normal play objectives flip
  `neutral → blue`. The `red` state must still be representable and visually
  distinct so future enemy/bot capture works without a new phase.

---

## 4. Capture Progress (MVP Behavior)

Capture is a progress fill driven by team presence inside the capture circle.

| Rule | Required behavior |
|---|---|
| Capture radius | The objective's existing marker radius defines the capture circle |
| Capture duration | **6–8 seconds** of uncontested presence to go 0% → 100% |
| Single capturer | One team member inside the circle progresses capture |
| Leaving the circle | Progress **pauses or decays** (decay rate ≤ fill rate; see note) |
| Enemy contest | An enemy inside the circle **contests** — capture does **not** progress |
| Contested = frozen | While contested, progress neither rises nor completes |
| Completion | Capture completes when progress reaches **100%** |
| On completion | Owner state flips to the capturing team; score awarded once (Section 6) |

**Pause vs decay:** either is acceptable for 4C-A. If decay is chosen, decay must
be **no faster than** the fill rate so a player who briefly steps out is not
punished disproportionately. Pause-on-exit is the simpler default and is
recommended for the MVP.

**Contest definition:** "enemy presence" means a member of the opposing team is
inside the same capture circle. In the solo MVP there is typically no live enemy
unit; the contest rule must still exist in the capture logic so it is correct when
enemies arrive, and must be unit-testable via a simulated enemy presence flag.

**Re-capture:** an already-owned objective may be captured by the other team using
the same rules (progress from current owner → contested/neutralize → new owner).
Full neutralize-then-capture modeling is **optional** in 4C-A; a direct
progress-to-flip is acceptable as long as contest still freezes progress.

---

## 5. Visual Clarity

The player must be able to read each objective's state at a glance. Approved
objective sprites already exist (`watchtower_*`, `forward_camp_*`, neutral/blue/red
variants from PR #13 / objective asset packs) and should be reused. No new asset
**categories** are required by this doc.

| State | Player-facing signal |
|---|---|
| Neutral (uncaptured) | Neutral/gray visual variant |
| Blue owned | Blue visual variant |
| Red owned | Red visual variant |
| Contested | Distinct **contested** visual (e.g. pulsing/contested tint) — clearly different from plain capturing |
| Capturing (in progress) | A **progress indicator** (ring/bar) showing 0–100% fill |
| Captured (just completed) | Short feedback text on completion (e.g. **Camp captured**) |

Rules:

- Capturing, contested, and owned must be **visually distinguishable**. A player
  must never confuse "I'm filling this" with "this is contested and stuck."
- The progress indicator appears only while a capture is actively progressing or
  contested near the objective; it is not a permanent always-on overlay.
- Capture-complete feedback is short floating/toast text consistent with existing
  feedback style (`showWorldFeedback`-class one-shot), not a modal or pause.

---

## 6. HUD / UI (Minimal)

Capture adds the **minimum** UI needed to understand the mechanic. It must not
expand into the larger map-awareness UI that later phases own.

Required:

- Show a **current objective prompt only when the player is near an objective**
  (inside or approaching its capture circle) — e.g. **Capturing…**, **Contested**,
  or **Camp captured**.
- Reuse existing HUD/feedback styling and mobile-safe placement from Phase 4B.

Forbidden in 4C-A (these belong to later phases):

- Full minimap
- Lane status icons
- Full player-guidance marker set (world arrows / path markers)
- Edge / off-screen indicators
- Persistent always-on objective list or capture tracker panel

The Gate/Core HUD prompts (**Attack the Gate** / **Destroy the Core**) are
unchanged. Capture prompts are contextual and must not override or conflict with
the primary siege prompt.

---

## 7. Objective Score (MVP)

A simple per-team capture score. This is **not** a win condition.

| Capture | Score value |
|---|---|
| Resource Camp (L or R) | +5 |
| Watchtower | +5 |
| Siege Ruins | +8 |
| Forward Camp (L or R) | +6 |

Rules:

- Score is awarded **once** per successful capture, to the capturing team.
- Re-capturing the same objective awards score again to the new owner (one award
  per completed capture event); the design must not allow a single uninterrupted
  hold to repeatedly tick score.
- Keep score simple: a running integer per team is sufficient. Display of the score
  may be minimal (or debug-only) in 4C-A — the **mechanic correctness** is what
  matters, not score-board polish.
- **No timer win condition.** Score does not end the match. A score/timer victory
  condition is **Phase 4C-C** and must not be implemented here.

---

## 8. Per-Objective Cautions (Defer the Payoff)

Each objective has a future role. In 4C-A only **capture ownership + score** are in
scope. The following payoffs are **explicitly deferred** and must not be built now.

| Objective | Future role (NOT in 4C-A) | Deferred to |
|---|---|---|
| **Siege Ruins** | Grants **Gate damage bonus** to the owning team | **Phase 4C-B** |
| **Forward Camp L/R** | Becomes a **forward respawn point** for the owning team | Later phase |
| **Watchtower** | Grants **vision / warning / map awareness** | Later phase |
| **Resource Camp L/R** | Generates an **EXP/Gold tick** for the owning team | Later phase |

> **Hard rule:** capturing any of these in 4C-A changes only `owner state` and
> `score`. It must not alter gate damage, respawn location, vision/fog, economy,
> or any other system. If implementing capture appears to require touching one of
> those systems, that is a scope signal — stop and defer.

---

## 9. Core Acceptance Criteria

### AC1 — All six objectives are capturable
All six non-core objectives (Resource Camp L/R, Watchtower, Siege Ruins, Forward
Camp L/R) exist as capturable runtime targets, each starting `neutral`.

### AC2 — Presence fills capture
A player standing inside an objective's capture circle fills its capture progress
from 0% toward 100% over the 6–8s duration.

### AC3 — Leaving stops/decays progress
Leaving the circle pauses or decays capture progress per Section 4 (decay no faster
than fill).

### AC4 — Enemy contest prevents progress
While an enemy is present in the circle, capture is contested and progress does not
advance or complete.

### AC5 — Capture flips owner
Reaching 100% changes the objective's owner state to the capturing team
(`neutral → blue` in solo play; `red` representable for future enemy capture).

### AC6 — Visual changes by owner state
Each objective's visual reflects its state: neutral / blue / red / contested /
capturing (progress) / just-captured feedback — all distinguishable.

### AC7 — Score increments once per capture
A successful capture increases the capturing team's objective score by the
Section 7 value, exactly once per completed capture event.

### AC8 — Match reset restores initial state
On match reset / Menu ↔ Match, all six objectives return to `neutral`, all capture
progress clears to 0%, and no stale capture/contested visuals or feedback carry
over. (Consistent with the Phase 4B-B reset guarantee for gate/core.)

### AC9 — Mobile readable and playable
At **915×412** and **800×360**, capture circles, progress indicators, contested
state, and capture prompts are readable and do not overlap or block the joystick,
attack, or skill controls.

### AC10 — No new systems beyond capture foundation
No bot AI, economy, vision/fog, respawn changes, gate-damage bonus, minimap, edge
indicators, route arrows, lane tracker, or win-condition change is added. Only the
capture foundation (ownership + score) ships.

---

## 10. Regression Expectations (Agent A)

Agent A's implementation PR should add automated coverage (in `scripts/**`,
Puppeteer-style consistent with `phase-4b-objective-regression.mjs` /
`phase-4b-b-clarity-regression.mjs`). This doc does not author tests; it states
what must be covered. Manual playtest (Agent F) is still required.

| ID | Test | Pass criteria |
|---|---|---|
| R-1 | Objectives present & neutral | All six non-core objectives exist and start `neutral` |
| R-2 | Presence fills capture | Simulated presence in circle drives progress toward 100% |
| R-3 | Exit pauses/decays | Leaving the circle stops or decays progress (not faster than fill) |
| R-4 | Contest freezes | Simulated enemy presence prevents progress/completion |
| R-5 | Capture flips owner | Completion sets owner to capturing team |
| R-6 | Score once per capture | Capture increments team score exactly once, by the correct value |
| R-7 | Reset clears state | Menu ↔ Match returns all objectives to `neutral`, progress 0%, no stale visuals |
| R-8 | Mobile readable | Capture UI readable + controls unobstructed at 915×412 and 800×360 |
| R-9 | No siege-loop regression | Existing gate/core + clarity suites still pass; capture does not affect them |

Existing regression suites (`phase-4b-objective-regression.mjs`,
`phase-4b-b-clarity-regression.mjs`, mobile multitouch, 3B-B2/B3, 4A map visual)
must continue to pass unchanged.

---

## 11. Design Sign-off

| Role | Responsibility |
|---|---|
| Agent A | Implement capture foundation + regression coverage per this doc |
| Agent B | Reuse existing objective sprites; only an approved micro-pack if a gap is proven — no new categories |
| Agent D | Capture prompt copy + mobile placement rules — align with Sections 5–6 |
| Agent F | Playtest against AC1–AC10 |
| Agent E | Final gate — block any change crossing `phase-4c-a-scope-guard.md` |

**Merge gate:** the Phase 4C-A runtime PR may move Draft → Ready only after
Agent C + Agent F sign off against this document and the scope guard.

---

## 12. References

- `docs/phase-4c-a-scope-guard.md` — in/out of scope for this phase
- `src/game/data/map-small-twin-fortress.ts` — existing objective markers (reuse)
- `src/game/types.ts` — `ObjectiveType` union (already includes all six types)
- `docs/phase-4b-b-objective-clarity-acceptance.md` — predecessor (Gate/Core clarity)
- `docs/phase-4b-b-scope-guard.md` — predecessor scope guard (capture was out of scope there; now opened)
- `docs/objective-placement-spec.md` — placement / radius reference
- `docs/map-layout-spec.md` — map zones and objective roles
