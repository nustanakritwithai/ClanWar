# Phase 4B — Gate/Core Objective Runtime Spec (MVP)

> **Agent C design spec** — authoritative rules for Phase 4B objective runtime.
> **Work order for Agent A** after Product approves. **Not started until
> Phase 4A map visual runtime is merged.**
>
> Lane separation: Agent C = rules · Agent A = runtime · Agent B = assets ·
> Agent D = UX/onboarding copy & HUD layout.

---

## 1. Design Goal

Give the local prototype a **real siege objective loop** without becoming a
full MOBA:

```
Blue spawn → push main route → destroy Red Gate → destroy Red Core → Victory
```

Player must always know **what to hit next**. Gate/Core are the only gameplay
objectives in this phase.

---

## 2. Player Experience

| Moment | Player understands |
|---|---|
| Match start | "I defend bottom (Blue); enemy is top (Red)." |
| First contact | "Red Gate on the wall line is my first target." |
| Gate under fire | "I'm damaging the gate — keep attacking." |
| Gate destroyed | "Gate is breached — now the Core is exposed." |
| Core destroyed | "I won." |
| Blue Core destroyed (future / hook) | "I lost — defend core." |

Target match length: **~6–10 minutes** of casual solo play (not final balance).

---

## 3. Scope — In / Out

### In scope (Phase 4B runtime PR)

| # | Deliverable |
|---|---|
| 1 | Four objectives: `blueGate`, `blueCore`, `redGate`, `redCore` |
| 2 | Objective HP, armor, damage, state machine |
| 3 | Protected / vulnerable core rules |
| 4 | Win (Red Core destroyed) → `ResultScene` victory |
| 5 | Lose hook (Blue Core destroyed) → `ResultScene` defeat |
| 6 | Base sprites (PR #13) + feedback overlays (PR #18) |
| 7 | Minimal HUD guidance icons (PR #18 `ui_*`) |
| 8 | Debug objective readout in dev overlay only |
| 9 | Menu ↔ Match reset; scene shutdown cleanup |

### Out of scope (defer — see `phase-4b-design-risk-register.md`)

Watchtower, forward camp, resource camp, capture, economy, bots, minimap,
multiplayer, siege equipment, pathfinding, stealth/elevation, full tutorial.

---

## 4. Document map

| Doc | Contents |
|---|---|
| [`gate-core-loop-spec.md`](./gate-core-loop-spec.md) | Loop, HP values, priorities, UI states |
| [`objective-state-machine-spec.md`](./objective-state-machine-spec.md) | States & transitions |
| [`objective-damage-and-win-condition.md`](./objective-damage-and-win-condition.md) | Damage rules, win/lose |
| [`objective-runtime-acceptance-gate.md`](./objective-runtime-acceptance-gate.md) | PR acceptance tests |
| [`phase-4b-design-risk-register.md`](./phase-4b-design-risk-register.md) | Design risks |

### Related existing docs

| Doc | Role |
|---|---|
| `objective-placement-spec.md` | Coordinates — **do not change** |
| `objective-asset-manifest.md` | Base sprites (PR #13) |
| `objective-feedback-asset-manifest.md` | Feedback overlays (PR #18) |
| `objective-feedback-integration-brief.md` | Agent B wiring notes |
| `player-guidance-asset-manifest.md` | World guidance markers (PR #20) |
| `player-guidance-integration-brief.md` | Agent B guidance wiring notes |
| `map-layout-spec.md` | Terrain context (Phase 4A) |

---

## 5. MVP Objective Loop (summary)

```
┌─────────────┐     damage      ┌──────────────┐
│  Red Gate   │ ──────────────► │  destroyed   │
│  (intact)   │                 │  (breached)  │
└─────────────┘                 └──────┬───────┘
                                       │ enables
                                       ▼
┌─────────────┐     damage      ┌──────────────┐
│  Red Core   │ ◄────────────── │  vulnerable  │
│ (protected) │   (blocked      │  (hittable)  │
└─────────────┘    until gate   └──────────────┘
                   destroyed)
        │
        └── HP = 0 ──► VICTORY

Blue Core: protected while Blue Gate intact.
Blue Core HP = 0 ──► DEFEAT (enemy damage hook; no bot required in 4B).
```

---

## 6. Agent A — high-level implementation order

1. **Data** — objective definitions keyed to `map-small-twin-fortress` marker IDs.
2. **Entity** — `Objective` world sprite + hit radius at placement coords.
3. **System** — `ObjectiveSystem`: state, damage, win/lose, events.
4. **Combat hook** — after dummy hit check, evaluate enemy objectives in hit shape.
5. **Visuals** — swap base texture + feedback overlay per state.
6. **HUD** — one guidance slot on UI camera (priority-driven icon).
7. **Result** — transition on victory/defeat; full reset on new match.
8. **Tests** — extend regression; pass acceptance gate doc.

**Do not** implement watchtower/resource/forward camp entities in this PR.

---

## 7. Agent B — asset dependencies

| Pack | Status | Use in 4B |
|---|---|---|
| `public/assets/objectives/**` | **Merged PR #13** — safe to reference | Base gate/core sprites |
| `public/assets/objective-feedback/**` | **Merged PR #18** — safe to reference | State overlays + HUD icons |
| `public/assets/player-guidance/**` | **Merged PR #20** — safe to reference | World guidance markers (optional in 4B MVP) |

All three packs are stock art on base branch — **Agent A must not wire any of
them until a separate Phase 4B runtime work order** from GPT/User.

See §8 in `gate-core-loop-spec.md` for per-state asset mapping. Guidance
markers are **optional** for 4B MVP; PR #18 HUD icons are sufficient to ship
the gate/core loop.

---

## 8. Agent D — UX dependencies

Agent C defines **rules**; Agent D defines **how we tell the player**.

| Doc (Agent D) | Status | Runtime uses |
|---|---|---|
| `player-onboarding-flow.md` | **Pending** (PR #19 not on base) | First-match sequencing |
| `objective-explanation-flow.md` | **Pending** (PR #19) | Gate → Core teaching beats |
| `mobile-hud-ux-spec.md` | **Pending** (PR #19) | HUD alert slot position |
| `player-guidance-system.md` | **Pending** (PR #19) | When to show guidance |
| `ux-copy-and-message-guide.md` | **Pending** (PR #19) | Toast/banner strings |
| `tutorial-first-3-minutes.md` | **Pending** (PR #19) | Optional first-run flags |

Agent A implements **hooks/events** (`onObjectivePriorityChanged`, etc.).
Agent D copy can land after runtime skeleton exists — do not block 4B runtime
on PR #19 merge.

---

## 9. Phase label

Runtime PR may update `CURRENT_PHASE_LABEL` to  
`Phase 4B: Gate/Core Objective Runtime` — **only when Product approves phase advance**.

---

## 10. Acceptance

Full checklist: [`objective-runtime-acceptance-gate.md`](./objective-runtime-acceptance-gate.md).

**Gate to start coding:** Phase 4A merged + this spec approved + **separate
Phase 4B runtime work order** from GPT/User. Merged asset packs (PR #13, #18,
#20) do **not** authorize runtime work by themselves.
