# Player Experience Checklist — Phase 4A Map Readability

> Quick playtest script for **Agent C / Product / QA**. Use after Phase 4A
> map visual runtime lands. Focus: comprehension, not mechanics.
>
> Viewports: **915×412** (primary), **800×360** (secondary).

---

## Pre-flight

- [ ] Fresh load — Menu → ClassSelect → Match (Guardian OK)
- [ ] Debug overlay **on** for first pass, **off** for second pass
- [ ] No prior knowledge given to tester

---

## A. First 30 seconds (spawn)

| # | Question | Expected | Pass |
|---|---|---|---|
| A1 | ผู้เล่นเดินไปข้างหน้าโดยไม่ลังเล | เดินตาม main path กลาง | ☐ |
| A2 | รู้ว่าฝั่งล่างเป็น "บ้าน" | Blue floor / spawn platform | ☐ |
| A3 | แยกพื้นทางหลักออกจากพื้นรอบข้าง | Tan main tile vs darker neutral | ☐ |
| A4 | ไม่ต้องอ่าน text label เพื่อหาทาง | — | ☐ |

---

## B. Route identity (first fork)

| # | Question | Expected | Pass |
|---|---|---|---|
| B1 | ซ้ายรู้สึก "สูง/หิน" | High ground tile + ramp | ☐ |
| B2 | ขวารู้สึก "มืด/แคบ" | Shadow / sewer tile | ☐ |
| B3 | กลางยังรู้สึกเป็น "ทางหลัก" | กว้างกว่า flanks | ☐ |
| B4 | ทั้งสามไม่ปนเป็นสีเดียว | 3 patterns visible | ☐ |

---

## C. Midfield (≤3 min travel)

| # | Question | Expected | Pass |
|---|---|---|---|
| C1 | มีจุดที่รู้สึกว่า "กลางแผนที่" | road_crossing / ruins zone | ☐ |
| C2 | มองเห็นได้ว่าหลายทางมาบรรจบ | Junction art | ☐ |
| C3 | ไม่หลงจนกลับ spawn โดยไม่รู้ตัว | — | ☐ |

---

## D. Gate read (approach enemy gate)

| # | Question | Expected | Pass |
|---|---|---|---|
| D1 | เห็นกำแพง / ช่องประตู | Wall art + gap | ☐ |
| D2 | ไม่พยายามเดินทะลุกำแพงที่ปิด | Collision matches art | ☐ |

---

## E. UI & noise

| # | Check | Pass |
|---|---|---|
| E1 | Joystick ใช้ได้ตลอด — map ไม่บัง | ☐ |
| E2 | Skill buttons ใช้ได้ — map ไม่บัง | ☐ |
| E3 | Combat VFX เห็นชัดบน main และ shadow | ☐ |
| E4 | ไม่รู้สึกว่าหน้าจอ "รก" (debug off pass) | ☐ |
| E5 | Text labels ไม่จำเป็นต่อการนำทาง | ☐ |

---

## F. Stability

| # | Check | Pass |
|---|---|---|
| F1 | Menu ↔ Match ×3 — ไม่มี tile ค้าง | ☐ |
| F2 | Resize — map ไม่หลุด UI layer | ☐ |
| F3 | ไม่มี 404 ใน console สำหรับ map assets | ☐ |

---

## Scoring

| Result | Action |
|---|---|
| All A + B + E1–E2 + F pass | **4A merge candidate** |
| Any A or B fail | **Block** — layout/tile pass |
| E4 fail only | Revise overlays/labels before merge |
| C fail | Add/fix mid `road_crossing` |

Record findings in `level-design-review.md` Appendix A worksheet.
