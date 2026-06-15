# Clan Siege Arena — Development Roadmap (Tracking)

> Master development plan (Dolist) for Clan Siege Arena, captured for tracking.
> This is a **planning/tracking document only** — it authorizes no implementation.
> Each phase still requires its own design spec, scope guard, and review gate.
>
> **Maintainer note:** the Dolist below is preserved as authored. Status badges and
> the dependency map are the tracking layer added on top.

---

## Status Snapshot

| Field | Value |
|---|---|
| Final base | `c4dc9e358d13501e2167936007e19c99416516a6` (`claude/game-file-analysis-a20xup`) |
| Live URL | `https://clan-siege-arena.onrender.com` |
| Merged | PR #24, #25, #26, #27 |
| Last verified | Phase 4B-B live deploy — **PASS** (all checks, no blockers) |

### Legend

| Badge | Meaning |
|---|---|
| ✅ Done | Completed and verified |
| 🟡 Spec | Design spec authored; implementation not started |
| 🔜 Next | Cleared to start (its readiness gate is open) |
| ⛔ Blocked | Gated behind an earlier phase |

### Phase status

| # | Phase | Status | Note |
|---|---|---|---|
| 1 | 4B-C — Live Deploy Verification | ✅ Done | Verified on `c4dc9e3`; PASS, no blocker |
| 2 | 4C-A — Objective Capture Foundation | 🟡 Spec | Draft PR #28 (acceptance + scope guard); awaiting review; runtime not built |
| 3 | 4C-B — Siege Ruins Gate Damage Bonus | ⛔ Blocked | Until 4C-A merges |
| 4 | 4C-C — Objective Score + Timer Win | ⛔ Blocked | Until 4C-A capture + score exist |
| 5 | 4D-A — Mobile Ergonomics Polish | ⛔ Blocked | Sequenced after 4C |
| 6 | 4D-B — Combat Text + System Banner | ⛔ Blocked | Sequenced after 4D-A |
| 7 | 4E-A — EXP / Gold / Level Foundation | ⛔ Blocked | Needs capture rewards hook (4C) |
| 8 | 4E-B — Shop / Item MVP | ⛔ Blocked | Until 4E-A gold exists |
| 9 | 4F-A — Bot AI Waypoint Foundation | ⛔ Blocked | Sequenced after economy |
| 10 | 4F-B — Bot Objective Priority | ⛔ Blocked | Until 4F-A bots exist |
| 11 | 5A — War Action System | ⛔ Blocked | Needs capture + siege context |
| 12 | 5B — Full HUD MVP | ⛔ Blocked | Needs level/gold/timer/score/war-action |
| 13 | 5C — 10-Minute Stability MVP | ⛔ Blocked | Final gate; needs 5v5 bots + all systems |

---

## Shortest Work Order

1. Live Deploy Verification ✅
2. Objective Capture Foundation 🟡 (spec ready)
3. Siege Ruins Gate Damage Bonus
4. Objective Score + Timer Win Condition
5. Mobile Ergonomics Polish
6. Combat Text + System Banner
7. EXP / Gold / Level
8. Shop / Item MVP
9. Bot AI Waypoint
10. Bot Objective Priority
11. War Action System
12. Full HUD MVP
13. 10-Minute Stability MVP

---

## PHASE 4B-C — Live Deploy Verification ✅

**เป้าหมาย:** ยืนยันว่า build ล่าสุดใช้งานจริงบน production ก่อนเริ่มฟีเจอร์ใหม่

Dolist:

- [x] ตรวจ live URL โหลดได้ HTTP 200
- [x] เข้าเกมบน desktop ได้
- [x] เข้าเกมบน mobile landscape ได้
- [x] Start game ได้
- [x] HUD เริ่มต้นแสดง "Attack the Gate"
- [x] โจมตี Red Core ก่อน Gate แตกแล้วขึ้น "Destroy Gate first"
- [x] Red Core HP ไม่ลดตอน protected
- [x] ตี Red Gate แตกแล้วขึ้น "Gate Breached"
- [x] Red Core เปลี่ยนเป็น vulnerable
- [x] ขึ้น "Core is open"
- [x] HUD เปลี่ยนเป็น "Destroy the Core"
- [x] ตี Red Core แตกแล้วขึ้น Victory
- [x] ResultScene แสดง "Enemy core destroyed"
- [x] Back to Menu ใช้งานได้
- [x] Menu → Match → Menu 3 รอบแล้วไม่มี stale state
- [x] ไม่มี console error ที่กระทบ gameplay

Definition of Done:

- [x] Live deploy ผ่าน
- [x] ไม่มี blocker
- [x] พร้อมเปิด Phase 4C-A

> **Result:** Verified against the live deploy on base `c4dc9e3`. Verdict **PASS**.

---

## PHASE 4C-A — Objective Capture Foundation 🟡

**เป้าหมาย:** ทำให้ objective รอบแผนที่ "ยึดได้จริง" ไม่ใช่แค่วัตถุบนแผนที่

Dolist:

- [ ] สร้าง capture state สำหรับ neutral / blue / red
- [ ] เพิ่ม Resource Camp L/R ให้ยึดได้
- [ ] เพิ่ม Watchtower ให้ยึดได้
- [ ] เพิ่ม Siege Ruins ให้ยึดได้
- [ ] เพิ่ม Forward Camp L/R ให้ยึดได้
- [ ] เพิ่ม capture radius
- [ ] เพิ่ม capture progress 6–8 วินาที
- [ ] ยืนในวงแล้ว progress เพิ่ม
- [ ] ออกจากวงแล้ว progress หยุดหรือลด
- [ ] มี enemy contest แล้ว progress หยุด
- [ ] objective เปลี่ยนสีตาม owner
- [ ] HUD หรือ floating text แจ้ง "Captured"
- [ ] เพิ่ม objective score เมื่อยึดสำเร็จ
- [ ] reset match แล้ว objective กลับค่าเริ่มต้น
- [ ] เพิ่ม regression test สำหรับ capture
- [ ] ทดสอบ mobile 800×360 ว่า capture UI ไม่รก

ห้ามทำในเฟสนี้:

- ห้ามทำ economy reward จริง
- ห้ามทำ vision/fog จริง
- ห้ามทำ respawn forward camp จริง
- ห้ามทำ bot AI
- ห้ามทำ minimap

Definition of Done:

- [ ] ผู้เล่นยึด objective ได้จริง
- [ ] owner เปลี่ยนจริง
- [ ] score เพิ่มจริง
- [ ] reset ได้
- [ ] ไม่มี scope creep

> **Spec status:** Draft **PR #28** —
> `docs/phase-4c-a-objective-capture-acceptance.md` (AC1–AC10) +
> `docs/phase-4c-a-scope-guard.md`. Awaiting review. Implementation = Agent A,
> after spec sign-off.

---

## PHASE 4C-B — Siege Ruins Gate Damage Bonus ⛔

**เป้าหมาย:** ทำให้ Siege Ruins เป็นจุดยุทธศาสตร์สำคัญ ช่วยเปิดประตูได้เร็วขึ้น

Dolist:

- [ ] เพิ่ม team control state ของ Siege Ruins
- [ ] ถ้า Blue ครอง Siege Ruins → Blue ได้ +30% damage ต่อ Red Gate
- [ ] ถ้า Red ครอง Siege Ruins → Red ได้ +30% damage ต่อ Blue Gate
- [ ] bonus ใช้กับ Gate เท่านั้น
- [ ] bonus ไม่เพิ่ม damage ใส่ Hero
- [ ] bonus ไม่เพิ่ม damage ใส่ Core
- [ ] HUD หรือ floating text แจ้ง "Siege Buff Active"
- [ ] เสีย Siege Ruins แล้ว buff หาย
- [ ] reset match แล้ว buff หาย
- [ ] เพิ่ม regression test ว่า damage gate เพิ่มจริง
- [ ] เพิ่ม regression test ว่า damage hero/core ไม่เพิ่ม

Definition of Done:

- [ ] Siege Ruins มีผลต่อเกมจริง
- [ ] Gate damage bonus ทำงาน
- [ ] ไม่มี balance creep
- [ ] ไม่มี entity siege weapon ใหม่

> **Gate:** Blocked until 4C-A capture ownership is merged and verified.

---

## PHASE 4C-C — Objective Score + Time Limit Win Condition ⛔

**เป้าหมาย:** ให้เกมจบได้แม้ไม่มีฝ่ายทำลาย Core สำเร็จ

Dolist:

- [ ] เพิ่ม match timer
- [ ] ตั้งเวลา MVP เริ่มต้น 10–15 นาที
- [ ] เพิ่ม objective score state
- [ ] capture objective แล้วได้ score
- [ ] destroy gate แล้วได้ score
- [ ] core damage threshold แล้วได้ score แบบง่าย
- [ ] หมดเวลาแล้วเทียบ score
- [ ] score สูงกว่าชนะ
- [ ] ถ้า score เสมอ ให้เทียบ Core HP
- [ ] ResultScene แสดงเหตุผลแบบ human-readable
- [ ] ไม่มี snake_case
- [ ] reset score เมื่อเริ่ม match ใหม่
- [ ] เพิ่ม regression test time-out victory
- [ ] เพิ่ม regression test time-out defeat
- [ ] เพิ่ม regression test tie-break by core HP

ห้ามทำในเฟสนี้:

- ห้ามทำ Sudden Death
- ห้ามทำ scoreboard เต็ม
- ห้ามทำ ranking
- ห้ามทำ multiplayer

Definition of Done:

- [ ] Core destroyed ยังชนะทันที
- [ ] หมดเวลาแล้วตัดสินจาก score ได้
- [ ] ResultScene อ่านรู้เรื่อง
- [ ] ไม่มี internal key

---

## PHASE 4D-A — Mobile Ergonomics Polish ⛔

**เป้าหมาย:** ทำให้เล่นบนมือถือแล้วกดติดมือขึ้น

Dolist:

- [ ] ตรวจขนาด virtual joystick
- [ ] ขยาย hitbox joystick ถ้าจำเป็น
- [ ] ขยาย hitbox ปุ่ม Attack 10–15%
- [ ] ขยาย hitbox ปุ่ม Skill 10–15%
- [ ] ตรวจระยะห่างปุ่ม skill อย่างน้อย 15–20px
- [ ] เพิ่ม visual feedback ตอนกดปุ่ม
- [ ] ตรวจปุ่มไม่ชิดขอบจอเกินไป
- [ ] ตรวจ 915×412
- [ ] ตรวจ 800×360
- [ ] กัน browser scroll
- [ ] กัน double tap zoom
- [ ] กัน touchmove ลากหน้าเว็บ
- [ ] เพิ่ม regression mobile input
- [ ] ทดสอบ Attack + Skill ระหว่างเดิน

Optional:

- [ ] ทดลอง Dynamic Joystick แบบไม่เปิด default
- [ ] เก็บผลทดสอบว่า Dynamic ดีกว่า fixed จริงไหม

Definition of Done:

- [ ] กดปุ่มง่ายขึ้น
- [ ] ไม่มีปุ่มซ้อน
- [ ] joystick ไม่แย่ง skill input
- [ ] mobile ยังเล่นได้

---

## PHASE 4D-B — Combat Text + System Banner ⛔

**เป้าหมาย:** ลด visual noise และทำให้ข้อความสำคัญเห็นชัดกว่า floating text

Dolist:

- [ ] แยกชนิด combat text
- [ ] normal damage ใช้สีอ่านง่าย
- [ ] skill damage ใช้สีแยกจาก normal
- [ ] protected / blocked ใช้ข้อความสั้น
- [ ] ป้องกัน -0 damage text
- [ ] ทำ System Banner สำหรับข้อความสำคัญ
- [ ] Gate Breached ใช้ banner
- [ ] Core is open ใช้ banner
- [ ] จำกัด banner ไม่ให้ซ้อนกันเกิน 1 อัน
- [ ] banner ค้าง 2 วินาทีแล้วหาย
- [ ] floating text ไม่บังตัวละครหลัก
- [ ] mobile 800×360 ไม่รก
- [ ] เพิ่ม regression test no spam
- [ ] เพิ่ม regression test no snake_case

Definition of Done:

- [ ] combat text อ่านง่าย
- [ ] objective message เด่น
- [ ] ไม่มี visual spam
- [ ] ไม่มีข้อความ debug

---

## PHASE 4E-A — EXP / Gold / Level Foundation ⛔

**เป้าหมาย:** เริ่ม match-contained growth ตามเอกสารต้นแบบ

Dolist:

- [ ] เพิ่ม EXP state
- [ ] เพิ่ม Gold state
- [ ] เพิ่ม Level state
- [ ] เพิ่ม level curve
- [ ] เพิ่ม max level 15
- [ ] ยึด objective แล้วได้ EXP/Gold
- [ ] ทำ gate damage threshold reward
- [ ] ทำ capture reward
- [ ] ทำ passive objective tick แบบง่าย
- [ ] HUD แสดง Level
- [ ] HUD แสดง Gold
- [ ] จบ match แล้ว reset EXP/Gold/Level
- [ ] เพิ่ม regression test level up
- [ ] เพิ่ม regression test gold reward
- [ ] เพิ่ม regression test reset

ยังไม่ทำ:

- ยังไม่ทำ shop เต็ม
- ยังไม่ทำ active item
- ยังไม่ทำ assist system ลึก
- ยังไม่ทำ permanent progression

Definition of Done:

- [ ] ผู้เล่นโตใน match ได้
- [ ] objective ให้ reward จริง
- [ ] reset หลังจบ match

---

## PHASE 4E-B — Shop / Item MVP ⛔

**เป้าหมาย:** ให้ Gold มีประโยชน์จริง

Dolist:

- [ ] สร้าง Shop panel placeholder
- [ ] เปิด shop ได้
- [ ] ซื้อ item ได้
- [ ] Gold ลดจริง
- [ ] Item เพิ่ม stat จริง
- [ ] เพิ่ม Iron Sword
- [ ] เพิ่ม Chain Armor
- [ ] เพิ่ม Swift Boots
- [ ] เพิ่ม War Axe หรือ Siege Codex
- [ ] แสดง item ที่ซื้อแล้ว
- [ ] reset item เมื่อเริ่ม match ใหม่
- [ ] เพิ่ม regression test buy item
- [ ] เพิ่ม regression test stat changes
- [ ] เพิ่ม regression test reset

ยังไม่ทำ:

- ยังไม่ทำ active item
- ยังไม่ทำ Repair Kit
- ยังไม่ทำ Siege Bomb
- ยังไม่ทำ item tree
- ยังไม่ทำ shop art

Definition of Done:

- [ ] ซื้อของได้
- [ ] stat เปลี่ยนจริง
- [ ] ไม่มี crash
- [ ] mobile เปิดปิด shop ได้

---

## PHASE 4F-A — Bot AI Waypoint Foundation ⛔

**เป้าหมาย:** ทำให้เกมเล่นคนเดียวแบบ 5v5 local ได้

Dolist:

- [ ] เพิ่ม Bot entity
- [ ] Spawn bot ฝั่ง Blue 4 ตัว
- [ ] Spawn bot ฝั่ง Red 5 ตัว
- [ ] รวมผู้เล่นเป็น Blue team รวม 5 คน
- [ ] เพิ่ม bot role: attacker
- [ ] เพิ่ม bot role: defender
- [ ] เพิ่ม bot role: capturer
- [ ] เพิ่ม bot role: support placeholder
- [ ] เพิ่ม bot role: roamer placeholder
- [ ] เพิ่ม waypoint หลัก
- [ ] bot เดินตาม waypoint ได้
- [ ] bot ตี enemy ได้
- [ ] bot ตี gate ได้
- [ ] bot ตี core ได้เมื่อเปิด
- [ ] bot ตายและ respawn ได้
- [ ] bot ไม่ friendly fire
- [ ] เพิ่ม bot update interval 750ms
- [ ] เพิ่ม regression test bot spawn count
- [ ] เพิ่ม regression test bot can move
- [ ] เพิ่ม regression test bot can damage objective

ยังไม่ทำ:

- ห้ามทำ A* pathfinding
- ห้ามทำ multiplayer
- ห้ามทำ team strategy ซับซ้อน
- ห้ามทำ skill AI เต็ม

Definition of Done:

- [ ] มี 5v5 local
- [ ] bot เดินเอง
- [ ] bot ทำให้สนามรบมีชีวิต
- [ ] match ดำเนินต่อได้โดยไม่มี crash

---

## PHASE 4F-B — Bot Objective Priority ⛔

**เป้าหมาย:** ทำให้ bot เล่น objective ไม่ใช่เดินมั่ว

Dolist:

- [ ] ถ้า HP ต่ำกว่า 25% ให้ถอย
- [ ] ถ้า ally ใกล้ตายและ heal ได้ ให้ช่วย
- [ ] ถ้ามี enemy ใกล้และสู้ได้ ให้โจมตี
- [ ] ถ้ามี objective contested ให้ contest
- [ ] ถ้า enemy gate ยังอยู่ ให้ไปตี gate
- [ ] ถ้า enemy core exposed ให้ไปตี core
- [ ] ถ้าเสีย resource camp ให้ไปยึดคืน
- [ ] role waypoint fallback
- [ ] defender กลับบ้านเมื่อ core/gate โดนตี
- [ ] capturer ให้ความสำคัญกับ resource/watchtower
- [ ] attacker ให้ความสำคัญกับ gate/core
- [ ] เพิ่ม regression bot priority
- [ ] เพิ่ม 10-minute bot simulation test

Definition of Done:

- [ ] bot ตัดสินใจตาม objective
- [ ] bot ไม่ติด loop โง่
- [ ] เกมเล่นคนเดียวได้สนุกขึ้น

---

## PHASE 5A — War Action System ⛔

**เป้าหมาย:** สร้างปุ่มเอกลักษณ์ของเกมสงครามแคลน

Dolist:

- [ ] เพิ่ม War Action context detector
- [ ] ใกล้ capture point → แสดง Capture
- [ ] ใกล้ enemy gate → แสดง Heavy Attack Gate
- [ ] ใกล้ friendly gate → แสดง Repair Gate placeholder
- [ ] ใกล้ Siege Ruins → แสดง Capture Siege Ruins
- [ ] ไม่มี target → แสดง No Action
- [ ] กด War Action แล้วเริ่ม progress
- [ ] progress bar ทำงาน
- [ ] เดินออกจากวงแล้ว cancel
- [ ] โดน damage/stun แล้ว cancel ถ้ามีระบบรองรับ
- [ ] mobile ปุ่ม War Action ไม่ทับ attack/skill
- [ ] เพิ่ม regression context switching
- [ ] เพิ่ม regression progress cancel

ยังไม่ทำ:

- ยังไม่ทำ Bomb
- ยังไม่ทำ Repair Kit economy
- ยังไม่ทำ Revive
- ยังไม่ทำ downed state

Definition of Done:

- [ ] ปุ่ม War Action เปลี่ยนตามสิ่งใกล้ตัว
- [ ] กดแล้วเกิด action จริง
- [ ] ไม่ทำให้ปุ่มมือถือรก

---

## PHASE 5B — Full HUD MVP ⛔

**เป้าหมาย:** ให้ผู้เล่นเข้าใจสถานะเกมทั้งหมดในจอมือถือ

Dolist:

- [ ] แสดง HP
- [ ] แสดง Mana
- [ ] แสดง Level
- [ ] แสดง Gold
- [ ] แสดง Timer
- [ ] แสดง Score
- [ ] แสดง Gate/Core HP
- [ ] แสดง capture status
- [ ] แสดง skill cooldown
- [ ] แสดง mana warning
- [ ] แสดง War Action hint
- [ ] แสดง objective prompt
- [ ] จำกัด visual noise
- [ ] mobile 800×360 ไม่รก
- [ ] เพิ่ม HUD regression

Definition of Done:

- [ ] ผู้เล่นรู้ว่าต้องทำอะไรต่อ
- [ ] mobile อ่านได้
- [ ] ไม่มี UI บังนิ้วโป้ง
- [ ] ไม่มี internal key

---

## PHASE 5C — 10-Minute Stability MVP ⛔

**เป้าหมาย:** ยืนยันว่า MVP เล่นต่อเนื่องได้จริง

Dolist:

- [ ] เปิด match 10 นาที
- [ ] bot 5v5 ทำงานต่อเนื่อง
- [ ] objectives reset ไม่พัง
- [ ] no crash
- [ ] no serious console error
- [ ] object count ไม่เพิ่มไม่หยุด
- [ ] projectile cleanup ทำงาน
- [ ] combat text cleanup ทำงาน
- [ ] Menu → Match → Result → Menu loop ผ่าน
- [ ] mobile landscape ผ่าน
- [ ] FPS ยังรับได้
- [ ] เขียน final MVP stability report

Definition of Done:

- [ ] เล่นต่อเนื่อง 10 นาทีได้
- [ ] พร้อมทำ MVP demo
- [ ] พร้อมตัดสินใจว่าจะไป multiplayer หรือ polish ต่อ

---

## Global Guardrails — สิ่งที่ห้ามทำก่อน Local MVP เสถียร

These remain forbidden until the local MVP (through Phase 5C) is stable:

- ห้ามทำ online multiplayer
- ห้ามทำ login/account
- ห้ามทำ clan system จริง
- ห้ามทำ ranking/matchmaking
- ห้ามทำ payment/skins
- ห้ามทำ 3D
- ห้ามทำ server authoritative
- ห้ามทำ asset final ใหญ่
- ห้ามทำ minimap/fog เต็มระบบก่อน bot/objective/economy เสถียร

---

## Phase Dependency Map

```
4B-C Live Verify ✅
   └─> 4C-A Capture Foundation 🟡 (spec: PR #28)
          ├─> 4C-B Siege Ruins Gate Bonus
          └─> 4C-C Score + Timer Win
                 └─> 4D-A Mobile Ergonomics
                        └─> 4D-B Combat Text + Banner
                               └─> 4E-A EXP/Gold/Level
                                      └─> 4E-B Shop/Item MVP
                                             └─> 4F-A Bot Waypoint (5v5)
                                                    └─> 4F-B Bot Objective Priority
                                                           └─> 5A War Action
                                                                  └─> 5B Full HUD MVP
                                                                         └─> 5C 10-Min Stability MVP
```

Each arrow is a hard gate: a phase opens only after its predecessor is merged,
verified, and signed off. No phase may begin work behind a flag "for later."

---

## References

- `docs/phase-4c-a-objective-capture-acceptance.md` — 4C-A acceptance (PR #28)
- `docs/phase-4c-a-scope-guard.md` — 4C-A scope guard (PR #28)
- `docs/phase-4b-b-objective-clarity-acceptance.md` — completed predecessor
- `docs/phase-4b-b-scope-guard.md` — completed predecessor scope guard
- `docs/map-layout-spec.md` — map zones and objective roles
- `docs/objective-placement-spec.md` — objective placement / radius reference
