# Phase 4B-B: Scope Guard

> **Agent C** — scope boundary for Objective Clarity / Feedback Polish.
> Prevents Phase 4B-B work from becoming a new gameplay system or premature
> Phase 4C kickoff.
>
> **Rule:** If a change does not directly improve player understanding of the
> existing Gate/Core loop, it is out of scope.

---

## 1. Phase Identity

| Field | Value |
|---|---|
| Phase | 4B-B — Objective Clarity / Feedback Polish |
| Predecessor | 4B-A — Gate/Core runtime MVP (PR #23, merged) |
| Successor | 4C — bot-lite pressure (blocked until 4B-B passes) |
| Nature | Clarity and feedback only — **not** a new gameplay system |

---

## 2. In Scope

Work that **is** allowed in Phase 4B-B:

- **Protected core feedback** — `Destroy Gate first` on blocked hits; cooldown;
  trigger from all real combat paths
- **HUD label clarity** — canonical prompts: Attack the Gate, Destroy the Core,
  Defend your Core (defend row wired but inactive without bot)
- **Gate breached feedback** — optional toast/visual on Red Gate destroyed
- **Core open feedback** — optional toast/visual when Red Core becomes vulnerable
- **Mobile readability polish** — HUD/feedback legibility at 915×412 and 800×360
- **Objective prompt reset** — Menu ↔ Match returns to Attack the Gate
- **Regression tests for clarity** — Agent A adds tests per acceptance doc
- **Result screen copy** — human-readable victory/defeat reasons (no snake_case)
- **Approved asset micro-pack usage** — wire existing PR #18 feedback assets;
  Agent B may deliver only the approved micro-pack additions defined in their
  work order — no new asset categories

---

## 3. Out of Scope

Work that **must not** land in Phase 4B-B PRs:

| Category | Examples |
|---|---|
| Bot AI | Enemy heroes, lane pressure, AI decision-making |
| Economy | Gold, shop, items, upgrades |
| Capture system | Capture points, ownership swap, capture progress |
| Watchtower gameplay | Tower capture, vision, tower damage |
| Forward camp gameplay | Camp capture, spawn changes |
| Resource camp gameplay | Resource gathering, camp bonuses |
| Minimap | Map overview, pings, fog |
| Multiplayer | Netcode, lobbies, sync |
| Guild / ranking / shop | Meta progression, storefronts |
| New objective types | Ruins HP, camps as damageable entities, extra gates |
| Persistent quest system | Quest log, tracked objectives across matches |
| Large tutorial system | Multi-step guided onboarding, skip/save progress |
| Full player-guidance marker system | World arrows, path markers, full guidance stack |
| Permanent objective HP bars | Always-on HP UI over objectives (debug overlay exempt) |
| Balance / layout changes | Gate/core HP, armor, positions, win condition logic |

**Hard rule:** Do not change gate/core HP, armor, positions, or win condition in
4B-B. Clarity polish only.

---

## 4. Design Dependency Rules

| Agent | Constraint |
|---|---|
| **Agent A** (runtime) | PR must not add Phase 4C features. Clarity + feedback wiring only. No new gameplay systems. |
| **Agent B** (assets) | PR must not create assets beyond the approved micro-pack. No capture/bot/economy art. |
| **Agent D** (UX) | May define copy and mobile layout rules only. No runtime or asset implementation. |
| **Agent F** (QA) | Must test against `phase-4b-b-objective-clarity-acceptance.md` — not invent new scope. |
| **Agent E** (final gate) | Must block any PR that crosses Section 3 out-of-scope list. |

Agents must not expand each other's scope through doc references or "while we're
here" additions.

---

## 5. Phase 4C Readiness Gate

Phase 4C **may start only after** all of the following are true:

1. Phase 4B-B runtime polish **merged** on base
2. Agent D UX pass complete (copy/mobile alignment)
3. Agent F playtest pass complete (AC1–AC7)
4. Agent E final gate pass complete
5. A solo player can complete **Gate → Core → Victory** without confusion

Until all five gates pass, no agent may open Phase 4C runtime or asset work
orders.

---

## 6. Phase 4C Candidate Scope (Preview Only — Do Not Start)

When the readiness gate opens, Phase 4C **may** include:

- **Bot-lite pressure** — minimal enemy threat on lane or base
- **Core defense pressure** — Blue Core can be attacked; Defend your Core becomes active
- **Simple objective threat alerts** — short alerts when friendly objectives are hit

Phase 4C is a separate design gate. This document does not authorize 4C work.

---

## 7. Phase 4C Forbidden (For Now)

Even after 4B-B merges, the following remain **forbidden** until a future phase
explicitly opens them:

- Full MOBA bot (pathing, roles, team fights)
- Economy loop (gold, shop, items)
- Capture loop (ownership, camps, towers as gameplay)

---

## 8. PR Hygiene

| Rule | Detail |
|---|---|
| One concern per PR | Runtime clarity PR ≠ asset pack PR ≠ UX doc PR |
| Draft until signed | 4B-B PRs stay Draft until Agent C + Agent F sign off |
| No base contamination | Do not merge partial 4C features "for later" behind flags |
| Doc authority | This file + `phase-4b-b-objective-clarity-acceptance.md` override informal requests |

---

## 9. Escalation

If a proposed change is unclear:

1. Ask: *Does this help the player understand the existing Gate/Core loop?*
2. If no → out of scope; defer to Phase 4C or later.
3. If yes but it adds a new system → out of scope for 4B-B; requires new phase spec.
4. Agent E final gate has veto on scope creep regardless of PR author.

---

## 10. References

- `docs/phase-4b-b-objective-clarity-acceptance.md` — acceptance criteria
- `docs/gate-core-loop-spec.md` — loop definition (frozen for 4B-B)
- `docs/objective-runtime-acceptance-gate.md` — 4B-A completed gate
- `docs/phase-4b-design-risk-register.md` — tracked design risks
