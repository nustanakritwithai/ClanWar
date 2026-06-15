# Objective Runtime Acceptance Gate — Phase 4B

> **Agent C** — PR merge criteria for Agent A's Phase 4B runtime work.
> Judgment: **"Can a player complete the gate/core loop?"** — not code coverage alone.

---

## 1. Design Goal

Block merge until the MVP siege loop works end-to-end without scope creep or
mobile regressions.

---

## 2. Pre-merge requirements

| Gate | Requirement |
|---|---|
| P0 | Phase 4A map visual merged on base |
| P1 | This spec set approved by Product |
| P2 | **Separate Phase 4B runtime work order** from GPT/User |
| P3 | PR stays **Draft** until Agent C + Product sign off |

### Asset packs on base (safe to reference — not a work order)

| Pack | PR | Status |
|---|---|---|
| `public/assets/objectives/**` | #13 | Merged — safe to reference |
| `public/assets/objective-feedback/**` | #18 | Merged — safe to reference |
| `public/assets/player-guidance/**` | #20 | Merged — safe to reference (optional in 4B MVP) |

Agent D UX docs (PR #19) are **not on base** — runtime must not block on them.

---

## 3. Blockers (must pass)

### B-obj — Objective presence

| ID | Test | Pass |
|---|---|---|
| B-O1 | Four objectives spawn: `blueGate`, `blueCore`, `redGate`, `redCore` | ☐ |
| B-O2 | Positions match `objective-placement-spec.md` (±0 px) | ☐ |
| B-O3 | Base sprites from PR #13; no text labels on the four | ☐ |
| B-O4 | No gameplay entities for watchtower/camp/resource/ruins | ☐ |

### B-dmg — Damage rules

| ID | Test | Pass |
|---|---|---|
| B-D1 | Red Gate takes damage from basic attack in range | ☐ |
| B-D2 | Red Core **invulnerable** until Red Gate `destroyed` | ☐ |
| B-D3 | Red Core takes damage after gate breach | ☐ |
| B-D4 | Friendly fire off — Blue cannot damage Blue objectives | ☐ |
| B-D5 | `warrior_gate_breaker` damages gate (not skipped) | ☐ |
| B-D6 | Heal / War Taunt do not damage objectives | ☐ |

### B-win — Match outcome

| ID | Test | Pass |
|---|---|---|
| B-W1 | Red Core HP = 0 → Victory → `ResultScene` | ☐ |
| B-W2 | Blue Core HP = 0 → Defeat → `ResultScene` (debug damage OK) | ☐ |
| B-W3 | Match ends once — no double Result transition | ☐ |

### B-vis — Feedback assets

| ID | Test | Pass |
|---|---|---|
| B-V1 | Gate destroyed shows breach visual (PR #18 or destroyed base) | ☐ |
| B-V2 | Core vulnerable overlay after gate breach | ☐ |
| B-V3 | `under_attack` overlay while taking damage | ☐ |
| B-V4 | One HUD guidance icon; UI camera only | ☐ |
| B-V5 | No `danger_zone` / `capture_progress` misuse | ☐ |

### B-mobile — Controls & stability

| ID | Test | Pass |
|---|---|---|
| B-M1 | Joystick + skill buttons unobstructed 915×412 | ☐ |
| B-M2 | `mobile-multitouch-verify.mjs` 14/14 | ☐ |
| B-M3 | `phase-3b-b2-regression.mjs` 11/11 | ☐ |
| B-M4 | `phase-3b-b3-visual-regression.mjs` 8/8 | ☐ |
| B-M5 | `phase-4a-map-visual-regression.mjs` 7/7 | ☐ |
| B-M6 | Menu ↔ Match ×3 — no objective/overlay leak | ☐ |
| B-M7 | `npm run build` passes | ☐ |

### B-scope — Purity

| ID | Test | Pass |
|---|---|---|
| B-S1 | No bot AI | ☐ |
| B-S2 | No economy / shop / capture | ☐ |
| B-S3 | No pathfinding / new collision | ☐ |
| B-S4 | No changes to `public/assets/**` | ☐ |
| B-S5 | No changes to `skills.ts` / `heroes.ts` | ☐ |
| B-S6 | Debug objective state only when overlay on | ☐ |

---

## 4. Should-pass (fix before Ready if fail)

| ID | Test |
|---|---|
| S-1 | Priority HUD: attack gate → breach → attack core |
| S-2 | Floating damage numbers on objectives |
| S-3 | Gate HP ~1500 / Core HP ~2000 at match start |
| S-4 | `under_attack` clears after ~2s idle |
| S-5 | Combat dummy still works at spawn |

---

## 5. Playtest script (manual — 5 min)

1. Start Match as Guardian at 915×412.
2. Walk to Red Gate — **without reading debug text**, know to attack gate.
3. Basic attack gate until destroyed (~2–4 min acceptable).
4. Confirm core overlay/HUD changes to vulnerable.
5. Destroy Red Core — Victory screen.
6. New match — all objectives full HP.
7. Repeat Menu ↔ Match ×3 — watch for ghost sprites.

---

## 6. Regression commands

```bash
npm run build
npm run preview
node scripts/mobile-multitouch-verify.mjs http://127.0.0.1:4173
node scripts/phase-3b-b2-regression.mjs http://127.0.0.1:4173
node scripts/phase-3b-b3-visual-regression.mjs http://127.0.0.1:4173
node scripts/phase-4a-map-visual-regression.mjs http://127.0.0.1:4173
# Agent A adds:
# node scripts/phase-4b-objective-regression.mjs http://127.0.0.1:4173
```

---

## 7. Agent C review worksheet

```text
PR: _______________  Commit: _______________  Date: _______________

Blockers: ___/___ passed
Should-pass: ___/___ passed

Verdict: [ ] Approve Ready  [ ] Request changes  [ ] Block

Notes:
```

---

## 8. Deferred from acceptance (explicitly not required)

- Bot attacking Blue Core
- Watchtower / camp / resource interaction
- Capture ring / contested state
- Minimap objective icons
- Full tutorial / onboarding (Agent D — PR #19 pending)
- Player guidance world markers (PR #20 — optional; not required for 4B MVP)
- Match timer / scoreboard
- Balance tuning beyond MVP HP table

---

## 9. Phase 4B readiness for 4C+

After this gate passes:

| Next | Owner |
|---|---|
| Bot pressure on Blue Core | Agent A — separate PR |
| Onboarding copy wiring | Agent D (PR #19 when merged) |
| World guidance markers | Agent A + PR #20 assets (optional 4B.1) |
| Forward camp / watchtower | Agent C spec first |
