# Level Design Review — Phase 4A Map Visual Runtime

> **Agent C review gate** for Phase 4A (Map Visual Runtime Foundation).
> Judgment criterion: **"Will the player understand the battlefield?"** — not
> "Does the code compile?"
>
> **Status:** Pre-merge design review framework + baseline assessment against
> current repo state (assets ready, runtime not yet integrated on base branch).
>
> References: `docs/map-layout-spec.md`, `docs/objective-placement-spec.md`,
> `docs/map-visual-integration-brief.md`, `docs/map-environment-asset-manifest.md`.

---

## Review verdict (baseline — before Agent A PR lands)

| Question | Baseline answer | Confidence |
|---|---|---|
| แผนที่อ่านออกไหม? | **ยังไม่อ่านออก** — Match ใช้สีพื้น + วงกลม debug ไม่มี route terrain | N/A until 4A PR |
| 3 route สื่อสารชัดไหม? | **Asset พร้อม** — tile แยก pattern ชัด; **layout spec เพิ่ง lock** | High for art, pending placement |
| Visual noise เยอะเกินไหม? | **เสี่ยงปานกลาง** ถ้าใส่ arrows + debug text + tiles พร้อมกัน | Mitigate in 4A scope |
| พร้อมต่อ Phase 4B ไหม? | **พร้อมในเชิง design** หลัง 4A ผ่าน L1–L9; **ยังไม่พร้อม merge 4B บน base ปัจจุบัน** | Conditional |
| มีจุดไหนควรแก้ก่อน merge? | ดู §Blockers และ §Pre-merge checklist ด้านล่าง | — |

**Recommendation:** อนุมัติ merge Phase 4A เมื่อผ่าน acceptance criteria L1–L9 **และ** ไม่มี blocker ด้านล่าง. ห้ามเริ่ม 4B objective icons ใน PR เดียวกับ 4A.

---

## 1. Design Goal

ตรวจว่า Phase 4A ทำให้ผู้เล่น **อ่านสนามรบ siege 3 เส้นทาง** ได้จริง โดยไม่เพิ่ม gameplay ใหม่ — เป็นรากฐาน visual ก่อน objective loop ใน 4B.

---

## 2. Player Experience

### สิ่งที่ผู้เล่นต้องเข้าใจหลัง 4A (ยังไม่ต้องรู้วิธีชนะ)

1. **ทิศทาง:** ล่าง = ฐานเรา (น้ำเงิน), บน = ศัตรู (แดง).
2. **เส้นทางหลัก:** แนวกลาง สีอุ่น กว้าง — ทางที่ทับกันตรงๆ.
3. **เส้นทางสูง:** ซ้าย หินสูง — รู้สึกได้เปรียบที่สูง (ยังไม่มี modifier).
4. **เส้นทางเงา:** ขวา มืดแคบ — รู้สึกเป็นทางลัดลอบ (ยังไม่มี stealth).
5. **จุดปะทะ:** กลางแผนที่ (ruins / crossing) เป็นที่ทุกเส้นทางมาบรรจบ.

### 3 นาทีแรก (design target)

| เวลา | ประสบการณ์ที่ต้องการ |
|---|---|
| 0:00–0:30 | เห็น spawn platform + main path ชัด — เดินตรงไปได้โดยไม่สงสัย |
| 0:30–1:30 | เจอ fork แรก — ซ้ายสูง / ขวามืด แตกต่างจากกลาง |
| 1:30–3:00 | ถึง mid crossing หรือใกล้ ruins — รู้ว่า "นี่คือกลางแผนที่" |

---

## 3. Layout / System Rules

### 3.1 สิ่งที่ Phase 4A ต้องสะท้อน (จาก map-layout-spec)

- Main corridor: x ≈ 1300–1700, tile `main_route_tile`
- High ground: x ≈ 600–1050, tile `high_ground_tile` + ramps
- Shadow: x ≈ 1950–2400, tile `shadow_route_tile` + sewer IO
- Junctions: `road_crossing` ที่ y ≈ 3550, 2100, 650
- Gate chokes: y = 3200 / 1000 พร้อม wall art สอดคล้องช่อง collision

### 3.2 Asset readiness (Agent B — ผ่านแล้ว)

| Asset group | Readability | Notes |
|---|---|---|
| Route tiles (3) | ✅ แยก pattern ชัด | tan wear / stone plateau / dark brick |
| `road_crossing` | ✅ สามทางในชิ้นเดียว | ใช้เป็นสัญลักษณ์ mid ได้ดี |
| Ramps + sewer IO | ✅ สื่อ transition | ต้องหมุน/วางทิศถูก |
| Base/spawn floors | ✅ team hue ชัด | คู่กับ objective pack ใน 4B |
| Guide overlays | ⚠️ ใช้เท่าที่จำเป็น | มากเกิน = noise |

### 3.3 สิ่งที่ยังเป็น placeholder (ก่อน 4A)

จาก `MatchScene.drawGround()` / `drawMarkers()`:

- พื้น `#182230` ทึบ — ไม่มี route
- Objective เป็นวงกลม + **text label** — noise สูงเมื่อมี tile
- ไม่มี wall art — gate choke อ่านยาก

---

## 4. MVP Scope

### ต้องมีใน Phase 4A PR

- [ ] Tile terrain แทนสีพื้นเดียว
- [ ] 3 route types วางตาม spec
- [ ] Base floor + spawn platform สองฝั่ง
- [ ] Gate line wall art (อย่างน้อย stone segments)
- [ ] 3× road crossing junction
- [ ] `registerWorldObject` / camera split ถูกต้อง
- [ ] ไม่มี memory leak หลัง Menu ↔ Match ×3

### ห้ามรวมใน Phase 4A

- Objective SVG / capture / gate HP
- Pathfinding / elevation / stealth
- Minimap, bots, economy
- ลบ debug overlay ทั้งหมด (ได้ใน 4B)

---

## 5. Deferred

| รายการ | Phase | เหตุผล |
|---|---|---|
| Objective icons | 4B | แยก PR ชัด |
| Gate/core damage loop | 4C | ต้องการ objective runtime |
| Forward camp / watchtower / resource gameplay | 4.x+ | ไม่ใช่ win loop แรก |
| Tutorial arrow system เต็มรูปแบบ | Post-MVP | ใช้แค่ 3–5 ลูกช่วง spawn พอ |
| Collision ตาม wall art | 4.x | art ≠ physics ใน 4A |

---

## 6. Implementation Brief for Agent A

### Checklist สำหรับ PR review (Agent C จะใช้ตรวจ)

1. **Route width hierarchy:** main > high > shadow (ไม่เท่ากันทั้งแผนที่).
2. **Junction placement:** อย่างน้อย mid crossing ที่ (1500, 2100) ตรง ruins marker.
3. **Gate alignment:** ช่องประตู art ตรง x 1140–1860 ที่ y gate.
4. **Depth:** tiles ไม่บัง player/VFX; markers ไม่บัง UI.
5. **Scale:** tiles ~128 px step บน mobile ไม่ moiré เกินไป.
6. **Debug labels:** ถ้ายังแสดง — ลด opacity หรือซ่อนเมื่อ zoom out.
7. **Arrows:** ถ้ามี — จำกัดช่วง y > 3550 และ fade หลังออกจาก base.
8. **Separate module:** map visual แยกจาก combat — rollback ง่าย.

### สิ่งที่ Agent A **ไม่ต้อง**ทำใน 4A

- แก้ `map-small-twin-fortress.ts` marker coordinates (ยกเว้นมี bug ชัด)
- เพิ่ม gameplay modifier บน high/shadow
- โหลด `public/assets/objectives/**`

---

## 7. Asset Brief for Agent B

**ไม่ต้องสร้าง asset ใหม่สำหรับ 4A** เว้นแต่ playtest fail:

| เงื่อนไขขอ revision | Asset |
|---|---|
| Main กลืนกับ neutral ground | `main_route_tile.svg` — เพิ่ม contrast wear |
| High ground ไม่รู้สึกสูง | `high_ground_tile.svg` — เข้ม shadow ขอบใต้ |
| Sewer entrance มองไม่เห็นที่ 48px | `sewer_entrance.svg` — grate หนาขึ้น |

---

## 8. Risk

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Debug text + tiles** = อ่านยาก | High | ซ่อน/จาง label ใน 4A; ลบใน 4B |
| R2 | **สาม route กว้างเท่ากัน** | High | บังคับ width band ใน layout spec |
| R3 | **Arrows ค้างตลอดแมตช์** | Med | Time-box หรือ distance trigger |
| R4 | **Wall art ไม่ตรง collision** | High | QA เดินหา "ghost wall" / false gap |
| R5 | **Tile บัง combat VFX** | Med | depth -50 ground, VFX ยังบน player |
| R6 | **รวม 4B objective ใน PR 4A** | High | Product Director reject — แยก phase |
| R7 | **Mage purple vs sewer purple** | Low | sewer ใช้ `#1e1a2e` brick ไม่ใช่ skill purple |
| R8 | **ไม่มี mid crossing** | High | ผู้เล่นไม่รู้จุดปะทะกลางแผนที่ |

---

## 9. Acceptance Criteria

### Blockers (ต้องผ่านก่อน merge)

| ID | Test | Method |
|---|---|---|
| **B1** | Main route อ่านออกจาก spawn โดยไม่อ่านข้อความ | Playtest 915×412, ส่งสกรีนช็อต |
| **B2** | แยก 3 tile types ได้ใน screenshot เดียวที่ mid | Visual compare |
| **B3** | UI controls ไม่ถูกบัง | TC เดียวกับ 3B-B3 mobile matrix |
| **B4** | ไม่ leak tiles หลัง Menu ↔ Match ×3 | Regression |
| **B5** | ไม่มี objective gameplay / damage แอบแฝง | Code scope review |

### Should-pass (แนะนำแก้ก่อน merge ถ้า fail)

| ID | Test |
|---|---|
| S1 | `road_crossing` ที่ y≈2100 |
| S2 | Base floor blue/red แยกฝั่งชัด |
| S3 | Gate wall art สอดคล้องช่องเดิน |
| S4 | Ramps บน high-ground flank ซ้าย |
| S5 | Sewer entrance บน shadow flank ขวา |

### Phase 4B readiness (หลัง 4A merge)

| ID | Gate |
|---|---|
| P4B-1 | L1–L9 ผ่านครบ |
| P4B-2 | `objective-placement-spec` coordinates ไม่เปลี่ยน |
| P4B-3 | Agent A ยืนยัน anchor point สำหรับ objective sprites |
| P4B-4 | แผนถอด `drawMarkers()` text ใน PR 4B |

---

## Appendix A — Phase 4A PR review worksheet

เมื่อ Agent A ส่ง PR ให้กรอก:

```
PR: _______________  Branch: _______________  Date: _______________

| Criterion | Pass | Fail | Notes |
|-----------|------|------|-------|
| L1 Main obvious at spawn | | | |
| L2 L=high, R=shadow | | | |
| L3 Mid crossing | | | |
| L4 Team base floors | | | |
| L5 Gate art = gap | | | |
| L6 Mobile 3-tile read | | | |
| L7 UI safe | | | |
| L8 No leak | | | |
| L9 VFX visible | | | |

Blockers: _______________
Defer to 4B: _______________
Agent C verdict: [ ] Approve merge  [ ] Revise  [ ] Block
```

---

## Appendix B — Current repo snapshot (review date)

| Layer | State |
|---|---|
| Map data (`map-small-twin-fortress.ts`) | ✅ Markers + walls defined |
| Map environment assets (26 SVG) | ✅ Merged PR #15 |
| Objective assets | ✅ Merged PR #13 |
| Map visual runtime | ❌ Not on base branch |
| Combat / mobile | ✅ Phase 3B-B3 |

**สรุป:** Design spec และ asset **พร้อมรับ implementation**. การ merge Phase 4A ควรถูกตัดสินจาก playtest ตาม L1–L9 ไม่ใช่จาก asset presence เท่านั้น.
