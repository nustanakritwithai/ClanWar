# Phase 4B-B UX Copy Spec

> **Agent D** — canonical player-facing copy for Phase 4B-B Objective Clarity /
> Feedback Polish. Builds on PR #19 (`docs/ux-copy-and-message-guide.md`) and
> PR #23 runtime (4B-A). **Docs only — not a runtime work order.**
>
> References: `docs/gate-core-loop-spec.md`, `docs/mobile-hud-ux-spec.md`,
> `docs/objective-explanation-flow.md`, `docs/phase-4b-objective-runtime-spec.md`.

---

## 1. UX Goal

A new mobile player understands the Gate/Core loop **without reading debug text**:

```
Spawn → Attack the Gate → Gate Breached → Destroy the Core → Victory
```

Phase 4B-B polishes copy and feedback only. No new gameplay systems.

---

## 2. Canonical Copy — HUD / Objective Prompt

These four strings are the **only** persistent HUD objective labels in Phase 4B-B.

| Priority key (internal — never shown) | Player-facing EN | Max words |
|---|---|---|
| `attack_gate` | **Attack the Gate** | 4 |
| `attack_core` | **Destroy the Core** | 4 |
| `defend_core` | **Defend your Core** | 4 |
| `victory` | **Victory** | 1 |

### Display rules

- Show **icon + label** together at top-center (per `mobile-hud-ux-spec.md`).
- Only **one** label visible at a time.
- Label updates immediately when priority changes.
- Do not show the internal priority key (`attack_gate`, etc.) anywhere in UI.

### Icon pairing (4B-B polish)

| Priority | Label | Preferred icon (Agent B) |
|---|---|---|
| `attack_gate` | Attack the Gate | `ui_attack_gate` |
| `attack_core` | Destroy the Core | `ui_attack_gate` or dedicated `ui_attack_core` — **not** `ui_core_vulnerable` |
| `defend_core` | Defend your Core | `ui_defend_core` |
| `victory` | Victory | text only or `ui_objective_claimed` — no icon required |

**Rule:** If icon semantics disagree with label, **label wins**. Fix icon in 4B-B if possible.

---

## 3. Protected Core Feedback

| Trigger | Player-facing EN | Type | Duration |
|---|---|---|---|
| Player attempts damage on protected enemy core | **Destroy Gate first** | World float or top flash | 1.0–1.5 s |

### Rules

- Must fire from **real combat paths** (melee, AoE, projectile) — not only debug hooks.
- Cooldown ≥ 2 s between repeats (anti-spam).
- No modal. No pause. No full-screen overlay.
- No damage number (`-0`) on protected core.
- No technical text (`protected`, `blocked`, `canReceiveDamage`).

### Acceptable alternatives (pick one, do not stack)

- `Destroy Gate first` (preferred — matches PR #23 intent)
- `Gate first` (shorter fallback for 800×360)

---

## 4. Gate Transition Copy

| Event | Player-facing EN | Type | Duration |
|---|---|---|---|
| Enemy gate HP reaches 0 | **Gate Breached** | Top-center toast | 2–3 s |

### Rules

- Fire **once** per gate destruction.
- Toast auto-dismisses; do not block input.
- HUD label changes to **Destroy the Core** at same moment (or within 0.2 s).
- Do not also show **Core is open** in the same frame — pick one transition message.

### Optional follow-up (0.5 s after toast, if needed)

| EN | When |
|---|---|
| **Core is open** | Only if playtest shows players still hesitate |
| **Core is open — destroy it!** | Longer variant — use only on desktop or if 800×360 has room |

**Default for 4B-B:** **Gate Breached** toast + HUD label **Destroy the Core**. Skip second toast unless playtest fails.

---

## 5. Core Transition Copy

| Event | Player-facing EN | Type |
|---|---|---|
| Enemy core becomes damageable (gate down) | *(HUD label only)* **Destroy the Core** | HUD label |
| Enemy core under attack | *(world only)* `objective_under_attack` overlay | World VFX — no extra text |
| Enemy core destroyed | **Victory** | HUD then ResultScene |

### Rules

- Do not show internal state words: `vulnerable`, `protected`, `intact`, `destroyed`.
- **Core is open** is optional toast — not required if HUD label is clear.

---

## 6. Result Screen Copy

| Element | Player-facing EN |
|---|---|
| Victory title | **VICTORY** |
| Victory reason | **Enemy core destroyed** |
| Defeat title | **DEFEAT** |
| Defeat reason | **Your core was destroyed** |
| CTA | **← Back to Menu** |

### Rules

- Map internal keys to display copy in `ResultScene` — never render keys.
- Sentence case for reason line (not ALL CAPS).
- Title may be ALL CAPS for impact.

### Internal keys (runtime only — never displayed)

```
enemy_core_destroyed   → Enemy core destroyed
friendly_core_destroyed → Your core was destroyed
```

---

## 7. Copy Rules (Phase 4B-B)

1. **No snake_case** in player-facing UI.
2. **No raw internal states** as visible text:
   - `attack_gate`, `attack_core`, `defend_core`, `victory`
   - `enemy_core_destroyed`, `friendly_core_destroyed`
   - `protected`, `vulnerable`, `intact`, `destroyed`, `under_attack`
3. **Short for mobile** — alerts ≤ 5 words; HUD labels ≤ 4 words.
4. **No long tutorial paragraphs** — one line per message.
5. **No modal** unless Product approves later.
6. **No debug-like wording** — no `hp=`, `priority:`, `blocked:`, `combat:`.
7. **No duplicate messages** — if HUD shows **Attack the Gate**, do not also show the same text as world float, toast, and debug line simultaneously.

### Message priority (when multiple events fire)

```
1. Defend your Core (critical)
2. Destroy Gate first (protected hit)
3. Gate Breached (transition toast)
4. HUD priority label (persistent)
5. World under_attack overlay (silent)
```

Higher priority replaces lower; do not stack equal-priority duplicates.

---

## 8. Thai Copy (Future / Localization — Optional)

**Not required in Phase 4B-B.** Ship EN only. Store for future `locale` flag.

| EN | TH (suggested) |
|---|---|
| Attack the Gate | โจมตีประตู |
| Destroy the Core | ทำลายแกนหลัก |
| Defend your Core | ป้องกันแกนหลัก |
| Victory | ชนะ |
| Destroy Gate first | ทำลายประตูก่อน |
| Gate Breached | ประตูแตกแล้ว |
| Core is open | แกนหลักเปิดแล้ว |
| Core is open — destroy it! | แกนหลักเปิดแล้ว — ทำลายเลย! |
| Enemy core destroyed | ทำลายแกนศัตรูแล้ว |
| Your core was destroyed | แกนหลักของคุณถูกทำลาย |
| ← Back to Menu | ← กลับเมนู |

---

## 9. Guidance Marker Policy (Phase 4B-B)

**Do not wire the full player-guidance marker set in 4B-B.**

| Asset group | Phase 4B-B |
|---|---|
| HUD icon + label | ✅ Required |
| Gate Breached toast | ✅ Required |
| Destroy Gate first float | ✅ Required (fix unreachable path from 4B-A) |
| `objective_under_attack` world overlay | ✅ Keep (existing) |
| `gate_breached_*` / `core_vulnerable_*` world sprites | ✅ Keep (existing) |
| `route_hint_arrow`, `go_to_gate_marker`, `attack_gate_marker` | ❌ Defer |
| Minimap | ❌ Defer |
| Full onboarding / tutorial flow | ❌ Defer |

**At most one** world marker may be considered **after playtest** if text alone fails — default: **none**.

If a single marker is approved later:
- Prefer `attack_gate_marker` only during first match
- Max 1 marker on screen
- Hide when HUD label is visible for same objective

---

## 10. Implementation Brief for Agent A (4B-B)

1. Fix protected-core feedback to trigger on **attempted** hits against protected core in all combat paths.
2. Add **Gate Breached** toast on enemy gate destroy (once, 2–3 s).
3. Swap `attack_core` HUD icon away from `ui_core_vulnerable` if Agent B ships `ui_attack_core`.
4. Centralize strings in one copy map — keys internal, display from this doc.
5. Do not add modal, minimap, or tutorial scene.
6. Regression: assert ResultScene reason strings; assert protected feedback text on blocked core hit.

---

## 11. Asset Brief for Agent B (4B-B, optional)

| Request | Trigger |
|---|---|
| `ui_attack_core.svg` | `ui_core_vulnerable` confuses attack vs defend |
| No new markers | Text-first policy for 4B-B |

---

## 12. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| C1 | All HUD labels match §2 exactly | ☐ |
| C2 | Protected core shows **Destroy Gate first** from real combat | ☐ |
| C3 | Gate destroy shows **Gate Breached** once | ☐ |
| C4 | ResultScene shows human-readable reasons only | ☐ |
| C5 | No snake_case or internal state words on screen | ☐ |
| C6 | Max 1 HUD label + max 1 toast at a time | ☐ |
| C7 | EN copy only required for 4B-B merge | ☐ |
