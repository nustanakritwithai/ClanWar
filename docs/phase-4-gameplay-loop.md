# Phase 4 Gameplay Loop — Design Sketch (MVP)

> **Agent C** — high-level loop for Phase 4B/4C planning. **Not a work order.**
> Runtime implementation stays with Agent A; approved by Product before coding.
>
> Principle: **อ่านออกก่อน ลึกทีหลัง** — 4A terrain → 4B objective visuals →
> 4C minimal siege loop.

---

## 1. Design Goal

ให้ผู้เล่นใน local prototype มี **เป้าหมายชัด**: เดินทาง → ทำลายประตู →
ทำลาย core ฝั่งศัตรู — ภายใน ~8–12 นาทีแมตช์ (ไม่ต้อง balance จริงใน MVP).

---

## 2. Player Experience

```
Spawn → อ่านแผนที่ (4A) → เห็น Gate/Core (4B) → โจมตี Gate (4C) → เข้า base → ทำลาย Core → ชนะ
```

ผู้เล่นต้องรู้สึกว่า:

- Gate คือ **กำแพง** — ต้องทุบก่อนเข้าได้
- Core คือ **ชนะ** — อยู่ลึกกว่า gate
- Ruins กลางแผนที่คือ **ที่ปะทะ** — ไม่ใช่ win condition ใน MVP

---

## 3. Layout / System Rules

| Phase | Delivers | Gameplay |
|---|---|---|
| **4A** | Terrain + 3 routes | None |
| **4B** | Objective sprites at markers | Visual only (optional hover/debug HP bar off) |
| **4C** | Gate + Core HP, win on core destroy | Minimal — training dummy → gate/core targets |

**Win condition (MVP):** Red `redCore` HP → 0 → Result scene.

**Lose condition (defer):** Blue core damage — single-player vs dummy ไม่จำเป็นในรอบแรก.

---

## 4. MVP Scope

### 4B — Objective visual pass

1. Gate + Core sprites (both teams) at spec coordinates
2. Siege ruins at mid
3. Remove debug text markers
4. `objective_destroyed` texture when HP = 0 (visual only OK before damage)

### 4C — Minimal siege loop (separate PR)

1. Gate has HP; skills with `gateDamageBonus` / gate breaker apply
2. Core has HP; gate destroyed → core vulnerable
3. Simple Result scene on core destroy
4. **No** capture, economy, respawn, bots

---

## 5. Deferred

- Watchtower capture / vision
- Forward camp respawn
- Resource income
- Blue core lose condition / enemy AI pushing
- Sudden death / tiebreakers (`rules.ts` edge cases)
- Multiplayer

---

## 6. Implementation Brief for Agent A

**4B:** Follow `objective-visual-integration-brief.md` — icons only.

**4C (when approved):**

- Reuse `CombatSystem` damage pipeline; add `Objective` entity with `team`, `type`, `hp`
- Gate invulnerable or reduced damage until scripted (optional simplification: gate always hittable)
- `warrior_gate_breaker` / gate damage skills should show feedback on gate sprite (`objective_warning` flash)
- Do not implement full `ECONOMY` / shop in same PR

---

## 7. Asset Brief for Agent B

4B uses existing objective pack. 4C may need:

- Optional: gate **damage stage** art (cracked gate) — **defer**; use `objective_warning` + tint flash first

---

## 8. Risk

| Risk | Mitigation |
|---|---|
| 4C scope includes capture + economy | Product lock — gate/core only |
| Player attacks core through gate | Core invulnerable until gate destroyed |
| No enemy pressure | Acceptable for MVP; add dummy near red gate later |

---

## 9. Acceptance Criteria

| Phase | Criteria |
|---|---|
| 4B | O1–O6 in `objective-placement-spec.md` |
| 4C | Player can destroy red gate then red core using skills; Result shows win |
| 4C | No regression on mobile controls / combat VFX |
