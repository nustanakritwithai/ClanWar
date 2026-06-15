# Open PR Dashboard

> **Maintained by:** Agent E  
> **Last updated:** 2026-06-15  
> **Base:** `claude/game-file-analysis-a20xup` @ `23ee8cb`

## Summary

| Metric | Count |
|--------|-------|
| Open PRs | **3** |
| Draft | **3** |
| Ready | **0** |
| Mergeable (CLEAN) | **3** |
| Needs base sync | **0** |

---

## Open pull requests

### PR #19 — Agent D (UX / Onboarding)

| Field | Value |
|-------|-------|
| **Title** | Phase 4B-D: Objective onboarding and player guidance spec |
| **URL** | https://github.com/nustanakritwithai/ClanWar/pull/19 |
| **Branch** | `cursor/phase-4b-d-objective-onboarding-guidance-spec` |
| **Head SHA** | `75e9ac8` |
| **Base** | `claude/game-file-analysis-a20xup` @ `23ee8cb` |
| **State** | OPEN |
| **Draft** | ✅ true |
| **Mergeable** | MERGEABLE (CLEAN) |
| **Files** | 7 × `docs/**` only |
| **Scope guard** | ✅ PASS — docs-only, no runtime/assets |
| **Agent E recommendation** | **HOLD — NEED REVIEW** — do not Ready/Merge until GPT/User reviews UX spec |

**Files changed:**
- `docs/mobile-hud-ux-spec.md`
- `docs/objective-explanation-flow.md`
- `docs/player-guidance-system.md`
- `docs/player-onboarding-flow.md`
- `docs/tutorial-first-3-minutes.md`
- `docs/ux-copy-and-message-guide.md`
- `docs/ux-risk-register.md`

---

### PR #20 — Agent B (Assets)

| Field | Value |
|-------|-------|
| **Title** | Phase 4B-B2: Player guidance marker asset pack |
| **URL** | https://github.com/nustanakritwithai/ClanWar/pull/20 |
| **Branch** | `cursor/phase-4b-b2-player-guidance-marker-asset-pack` |
| **Head SHA** | `d194bd8` |
| **Base** | `claude/game-file-analysis-a20xup` @ `23ee8cb` |
| **State** | OPEN |
| **Draft** | ✅ true |
| **Mergeable** | MERGEABLE (CLEAN) |
| **Files** | 12 × `public/assets/player-guidance/*.svg` + 4 docs |
| **Scope guard** | ✅ PASS — asset/docs only, no `src/game/**` |
| **Agent E recommendation** | **HOLD — NEED REVIEW** — independent of #19; merge after Product approval |

**Note:** `public/assets/player-guidance/` **not on base** until this PR merges.

---

### PR #21 — Agent C (Design / Spec)

| Field | Value |
|-------|-------|
| **Title** | Phase 4B-C: Gate/Core objective runtime design spec |
| **URL** | https://github.com/nustanakritwithai/ClanWar/pull/21 |
| **Branch** | `cursor/phase-4b-c-gate-core-objective-runtime-spec` |
| **Head SHA** | `b4d1b56` |
| **Base** | `claude/game-file-analysis-a20xup` @ `23ee8cb` |
| **State** | OPEN |
| **Draft** | ✅ true |
| **Mergeable** | MERGEABLE (CLEAN) |
| **Files** | 6 × `docs/**` only |
| **Scope guard** | ✅ PASS — docs-only, no runtime/assets |
| **Agent E recommendation** | **HOLD — NEED REVIEW** — **critical gate** for Agent A 4B runtime |

**Files changed:**
- `docs/phase-4b-objective-runtime-spec.md`
- `docs/gate-core-loop-spec.md`
- `docs/objective-state-machine-spec.md`
- `docs/objective-damage-and-win-condition.md`
- `docs/objective-runtime-acceptance-gate.md`
- `docs/phase-4b-design-risk-register.md`

---

## Recently merged (reference)

| PR | Agent | Status | Merge commit |
|----|-------|--------|--------------|
| #16 | A | MERGED | `23ee8cb` |
| #17 | C | MERGED | `266bc91` |
| #18 | B | MERGED | `9de58e5` |

---

## Merge readiness matrix

| PR | Synced | Scope OK | Tests N/A | Review | Ready? | Merge? |
|----|--------|----------|-----------|--------|--------|--------|
| #19 | ✅ | ✅ | N/A (docs) | ⏳ Pending | ❌ Draft | ❌ Hold |
| #20 | ✅ | ✅ | N/A (assets) | ⏳ Pending | ❌ Draft | ❌ Hold |
| #21 | ✅ | ✅ | N/A (docs) | ⏳ Pending | ❌ Draft | ❌ Hold |

---

## Agent A 4B runtime — prerequisite checklist

| Prerequisite | Status |
|--------------|--------|
| Phase 4A merged (#16) | ✅ |
| Phase 4A design docs (#17) | ✅ |
| Objective feedback assets (#18) | ✅ |
| Gate/Core design spec (#21) | ⏳ **Draft — not merged** |
| UX onboarding spec (#19) | ⏳ **Draft — not merged** |
| Player guidance assets (#20) | ⏳ **Draft — not merged** |
| Product work order for Agent A | ⏳ **Not issued** |

**Agent A may start 4B runtime when:** #21 merged + Product work order issued.  
**Recommended before start:** #19 and #20 also merged.
