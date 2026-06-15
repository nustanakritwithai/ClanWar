# UX Copy & Message Guide — Phase 4B-D

> **Agent D** — canonical in-game strings for objective onboarding and guidance.
> **Short. Clear. Mobile-readable.**
>
> Rules:
> - Alerts: **3–5 words** max (EN); Thai comparable brevity.
> - Prompts: **≤6 words** (EN).
> - Toasts: **≤4 words**.
> - No technical jargon (nexus, capture point, spawn pad).
> - Sentence case EN; natural Thai, not literal machine translation.

---

## 1. Copy Principles

| Principle | Example |
|---|---|
| Verb first | "Attack the Gate" not "The gate should be attacked" |
| One idea | "Defend the Core" not "Defend the core because gate is down" |
| Team-neutral where possible | "Gate Breached" not "Red gate breached" (color already on sprite) |
| Urgent = short | "Under Attack!" not "Your objective is currently under attack" |
| No duplicate | If HUD shows "Attack the Gate", world marker stays silent |

---

## 2. Movement & Route

| Key | EN | TH | Type | Max words |
|---|---|---|---|---|
| `move_forward` | Move forward | เดินไปข้างหน้า | Prompt | 2 |
| `follow_main` | Follow main path | เดินทางหลัก | Prompt | 3 |
| `head_to_gate` | Move to the Gate | เดินไปที่ประตู | Prompt | 4 |
| `head_enemy_gate` | Head to enemy gate | ไปที่ประตูศัตรู | Prompt | 4 |
| `push_main` | Push the main route | เดินทางหลัก | Chip | 4 |

---

## 3. Combat Teaching

| Key | EN | TH | Type |
|---|---|---|---|
| `tap_attack` | Tap Attack | กดโจมตี | Prompt |
| `hit_target` | Hit the target | โจมตีเป้าหมาย | Prompt |
| `use_skill` | Use a Skill | ใช้สกิล | Prompt |
| `nice` | Nice! | เยี่ยม! | Toast |

---

## 4. Objective Actions

| Key | EN | TH | Type |
|---|---|---|---|
| `attack_gate` | Attack the Gate | โจมตีประตู | Prompt |
| `break_gate` | Break the Gate | ทุบประตู | Chip |
| `attack_core` | Destroy the Core | ทำลายแกนหลัก | Prompt |
| `defend_core` | Defend the Core | ป้องกันแกนหลัก | Prompt |
| `protect_core` | Protect your Core | ป้องกันแกนหลัก | Prompt |
| `keep_attacking` | Keep attacking | โจมตีต่อ | Prompt |
| `gate_first` | Gate must fall first | ต้องทำลายประตูก่อน | Float |
| `core_win_target` | This is the win target | นี่คือเป้าหมายชนะ | Prompt |

---

## 5. State Alerts

| Key | EN | TH | Type | Priority |
|---|---|---|---|---|
| `gate_breached` | Gate Breached | ประตูแตกแล้ว | Toast | High |
| `core_vulnerable` | Core Vulnerable | แกนหลักถูกเปิดแล้ว | Alert | Critical |
| `core_open` | Core is open — destroy it! | แกนหลักเปิดแล้ว — ทำลายเลย! | Toast | High |
| `under_attack` | Under Attack! | กำลังถูกโจมตี! | Alert | Critical |
| `gate_under_attack` | Gate Under Attack | ประตูถูกโจมตี | Alert | High |
| `core_under_attack` | Enemy Attacking Core | ศัตรูกำลังโจมตีแกนหลัก | Alert | Critical |
| `your_gate_attack` | Your Gate is under attack! | ประตูของคุณถูกโจมตี! | Alert | High |
| `way_open` | The way is open! | ทางเปิดแล้ว! | Toast | Medium |
| `enemy_main_route` | Enemy at Main Route | ศัตรูอยู่เส้นทางหลัก | Alert | Medium — defer bot |

---

## 6. Next Objective Chip

| Key | EN | TH |
|---|---|---|
| `next_gate` | Next: Gate | ถัดไป: ประตู |
| `next_core` | Next: Core | ถัดไป: แกนหลัก |
| `next_defend` | Next: Defend | ถัดไป: ป้องกัน |

---

## 7. Match Outcome

| Key | EN | TH |
|---|---|---|
| `victory` | Victory | ชนะ |
| `defeat` | Defeat | แพ้ |
| `victory_detail` | Enemy core destroyed | ทำลายแกนหลักศัตรูแล้ว |
| `defeat_detail` | Your core was destroyed | แกนหลักของคุณถูกทำลาย |

---

## 8. Capture & Economy (Deferred — do not ship in 4B)

| Key | EN | TH | Status |
|---|---|---|---|
| `capture_tower` | Capture the Watchtower | ยึดหอคอย | ❌ |
| `hold_camp` | Secure the Camp | ยึดค่าย | ❌ |
| `gather_wood` | Gather Wood | เก็บไม้ | ❌ |

---

## 9. Typography & Display

| Context | Font size (compact) | Color | Background |
|---|---|---|---|
| Prompt | 14–16 px | `#e6edf3` | `#00000088` pill |
| Alert danger | 14 px bold | `#fca5a5` | `#7f1d1d99` |
| Alert warning | 14 px | `#fcd34d` | `#78350f99` |
| Toast | 15 px | `#e6edf3` | `#000000aa` |
| Chip | 12 px | `#93c5fd` | `#1e3a5f88` |

**Thai:** use system UI font stack; verify no clipping on 800×360 at 14 px.

---

## 10. Implementation Brief for Agent A

1. Store strings in `src/game/data/guidance-copy.ts` (or i18n map) — **single source**.
2. Keys above are stable IDs; EN default; TH via `locale` flag — MVP can ship EN-only
   with TH strings ready in data file.
3. `getCopy(key, locale)` returns `{ text, maxWidth }` for HUD layout.
4. Never hardcode strings in `MatchScene` — Agent D owns this doc as canonical.
5. Truncate with ellipsis if rendered width > 50% screen.
6. `gate_breached` and `victory` — no exclamation overload; max one `!` per message.

---

## 11. Asset Brief for Agent B

No text in assets. If icons need labels, labels are **HUD text only** from this guide.

---

## 12. Acceptance Criteria

| # | Criterion | Pass |
|---|---|---|
| C1 | All MVP keys have EN + TH entries | ☐ |
| C2 | No alert string > 5 words EN | ☐ |
| C3 | No prompt string > 6 words EN | ☐ |
| C4 | No duplicate EN/TH meaning across keys | ☐ |
| C5 | Strings readable at 14 px on 800×360 | ☐ |
