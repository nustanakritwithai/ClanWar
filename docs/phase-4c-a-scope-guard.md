# Phase 4C-A: Scope Guard

> **Agent C** — scope boundary for the Objective Capture Foundation.
> Keeps Phase 4C-A to one mechanic — **capture ownership + score** — and prevents
> it from absorbing the rewards, AI, economy, or map-awareness UI that belong to
> later sub-phases.
>
> **Rule:** If a change does anything beyond *flip an objective's owner and add to
> a simple score*, it is out of scope for 4C-A.

---

## 1. Phase Identity

| Field | Value |
|---|---|
| Phase | 4C-A — Objective Capture Foundation |
| Predecessor | 4B-B — Objective Clarity / Feedback Polish (PR #26, merged, live verified) |
| Base | `c4dc9e3` on `claude/game-file-analysis-a20xup` |
| Successor | 4C-B — Siege Ruins gate-damage bonus (blocked until 4C-A passes) |
| Nature | One additive mechanic: capture → ownership + score. **Not** rewards, **not** AI |

---

## 2. In Scope

Work that **is** allowed in Phase 4C-A:

- **Capturable objectives** — wire capture onto the six existing neutral markers
  (Resource Camp L/R, Watchtower, Siege Ruins, Forward Camp L/R)
- **Owner state** — `neutral` / `blue` / `red` per objective
- **Capture progress** — radius = existing marker radius; 6–8s duration; single
  capturer fills; exit pauses/decays; enemy contest freezes; 100% completes
- **Contest logic** — enemy-presence freeze rule (unit-testable even without a live
  enemy in solo MVP)
- **Visual state** — neutral / blue / red / contested / capturing-progress /
  captured feedback, using existing objective sprites
- **Contextual capture prompt** — show only when the player is near an objective
- **Objective score** — +5 Resource Camp, +5 Watchtower, +8 Siege Ruins, +6 Forward
  Camp; awarded once per completed capture; simple running integer per team
- **Match reset** — capture state and progress reset to initial on Menu ↔ Match
- **Regression coverage** — Agent A adds capture tests in `scripts/**` per the
  acceptance doc

---

## 3. Out of Scope

Work that **must not** land in Phase 4C-A PRs:

| Category | Examples |
|---|---|
| Bot AI | Enemy heroes, lane pressure, AI capturers, pathing, roles |
| Economy reward | Gold, EXP, resource ticks, shop, items, upgrades |
| EXP/Gold | Any XP or currency gain from objectives or kills |
| Siege Ruins damage bonus | Owner-grants-gate-damage — **deferred to Phase 4C-B** |
| Forward Camp respawn | Camp as respawn/forward spawn point — deferred |
| Watchtower vision/fog | Vision grants, fog of war, warnings, map awareness |
| Minimap | Map overview, pings, fog reveal |
| Edge indicators | Off-screen markers, directional edge arrows |
| Route arrows | World path arrows, guidance lines to objectives |
| Lane status tracker | Lane/objective status panel or icon row |
| Win condition change | Score-to-win, capture-to-win, timer victory — **Phase 4C-C** |
| Match timer | Countdown, sudden death, time-based scoring |
| New objective types | Extra camps/towers, damageable ruins HP, new gates |
| Geometry changes | Moving objectives, changing radii or marker positions |
| Gate/Core changes | Gate/core HP, armor, positions, protected-core rules, win logic |
| Multiplayer | Netcode, lobbies, sync |
| Account / login | Auth, profiles, persistence |
| Clan system | Guilds, clan meta |
| Ranking / shop / payment | Ladders, storefronts, monetization |
| Tutorial overhaul | Multi-step guided onboarding |
| New art pack | New asset categories beyond existing objective sprites |

**Hard rule:** Capturing an objective in 4C-A changes only **owner state** and
**team score**. It must not alter gate damage, respawn location, vision, economy,
or win condition. The Phase 4B Gate/Core loop is **frozen** — no HP, armor,
position, or win-condition edits.

---

## 4. Per-Objective Reward Deferral

The six objectives have future payoffs. 4C-A delivers capture + score only; the
payoff column is **forbidden** in this phase.

| Objective | 4C-A delivers | Forbidden in 4C-A (deferred) | Owner phase |
|---|---|---|---|
| Resource Camp L/R | Capture + score (+5) | EXP/Gold tick | Later economy phase |
| Watchtower | Capture + score (+5) | Vision / warning / map awareness | Later awareness phase |
| Siege Ruins | Capture + score (+8) | Gate damage bonus | **Phase 4C-B** |
| Forward Camp L/R | Capture + score (+6) | Forward respawn point | Later respawn phase |

If implementing capture appears to need any forbidden payoff, **stop** — that is a
scope-creep signal. Capture is purely ownership + score in 4C-A.

---

## 5. Design Dependency Rules

| Agent | Constraint |
|---|---|
| **Agent A** (runtime) | Capture foundation only. No reward payoffs, no AI, no win-condition, no geometry edits. Add regression tests in `scripts/**`. |
| **Agent B** (assets) | Reuse existing objective sprites. Only an approved micro-pack if a real gap is proven — no new asset categories, no capture VFX beyond existing feedback style. |
| **Agent D** (UX) | Capture prompt copy + mobile placement only. No runtime/asset implementation. Align with acceptance Sections 5–6. |
| **Agent F** (QA) | Test against `phase-4c-a-objective-capture-acceptance.md` (AC1–AC10). Do not invent new scope. |
| **Agent E** (final gate) | Block any PR crossing Section 3. Veto on scope creep regardless of author. |

Agents must not expand each other's scope through doc references or "while we're
here" additions.

---

## 6. Phase 4C-B Readiness Gate

Phase 4C-B (Siege Ruins gate-damage bonus) **may start only after** all of the
following are true:

1. Phase 4C-A capture foundation **merged** on base
2. Agent D capture-prompt UX pass complete (copy + mobile placement)
3. Agent F playtest pass complete (AC1–AC10)
4. Agent E final gate pass complete
5. A solo player can capture a neutral camp and see ownership + score change at
   915×412 without confusion or siege-loop regression

Until all five gates pass, no agent may open Phase 4C-B runtime or asset work
orders.

---

## 7. Phase 4C-B+ Candidate Scope (Preview Only — Do Not Start)

When the readiness gate opens, later 4C sub-phases **may** include:

- **Phase 4C-B** — Siege Ruins ownership grants a gate-damage bonus
- **Phase 4C-C** — score/timer win condition built on captured objectives
- Later — Forward Camp respawn, Watchtower vision, Resource Camp economy

These are separate design gates. This document does **not** authorize any of them.

---

## 8. Phase 4C-A Forbidden (For Now)

Even within Phase 4C, the following remain **forbidden** until a future sub-phase
explicitly opens them:

- Objective reward payoffs (gate damage, respawn, vision, economy)
- Score/timer win condition
- Full MOBA bot (pathing, roles, team fights)
- Map-awareness UI (minimap, edge indicators, route arrows, lane tracker)

---

## 9. PR Hygiene

| Rule | Detail |
|---|---|
| One concern per PR | Capture runtime PR ≠ asset PR ≠ UX doc PR |
| Draft until signed | 4C-A PRs stay Draft until Agent C + Agent F sign off |
| No base contamination | Do not merge partial reward/AI/win-condition features "for later" behind flags |
| Doc authority | This file + `phase-4c-a-objective-capture-acceptance.md` override informal requests |

---

## 10. Escalation

If a proposed change is unclear:

1. Ask: *Does this only flip an objective's owner and add to a simple score?*
2. If no → out of scope; defer to 4C-B / 4C-C or a later phase.
3. If yes but it adds a reward, AI, win condition, or map-awareness UI → out of
   scope for 4C-A; requires a new phase spec.
4. Agent E final gate has veto on scope creep regardless of PR author.

---

## 11. References

- `docs/phase-4c-a-objective-capture-acceptance.md` — acceptance criteria (AC1–AC10)
- `src/game/data/map-small-twin-fortress.ts` — existing objective markers (reuse)
- `src/game/types.ts` — `ObjectiveType` union (already includes all six types)
- `docs/phase-4b-b-scope-guard.md` — predecessor scope guard (capture was out of
  scope there — this phase opens it)
- `docs/objective-placement-spec.md` — placement / radius reference
- `docs/map-layout-spec.md` — map zones and objective roles
