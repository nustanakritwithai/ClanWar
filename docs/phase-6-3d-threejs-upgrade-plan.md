# Phase 6 — แผนยกระดับเป็นเกม 3 มิติด้วย Three.js (Master Plan)

> สถานะ: **PLANNING** — เอกสารแผนแม่บท ยังไม่เริ่มเขียนโค้ด
> ฐานอ้างอิง: Phase 5B-2 (`bff8b6b`) — เกม 2D top-down บน Phaser 3 + Vite + TypeScript
> Branch พัฒนา: `claude/3d-game-threejs-36f1wj`

---

## 1. หลักการใหญ่: "2.5D" — จำลองเกมใน 2D เหมือนเดิม แต่ render เป็น 3D

การตัดสินใจสำคัญที่สุดของแผนนี้คือ **ไม่เปลี่ยน simulation ของเกมเลย**:

- โลกของเกมยังคงเป็นระนาบ 2D พิกัด `(x, y)` เท่าเดิมทุกอย่าง — การเดิน, ระยะสกิล,
  hit shapes (melee arc / projectile / AoE circle), การชนกำแพง, ระยะ capture
- Renderer ใหม่ (Three.js) ทำหน้าที่แค่ **แปลงพิกัด**: `2D (x, y)` → `3D (x, 0, z)`
  โดย `y` เดิมกลายเป็นแกน `z` และความสูง (`y` ใน 3D) ใช้เฉพาะงาน visual
  (ตัวละครยืนบนพื้น, กำแพงมีความสูง, projectile ลอยระดับอก)
- กล้องเป็น perspective มุมกดเฉียง (~50–60° จากแนวนอน) ตามหลังผู้เล่น
  ให้ความรู้สึก 3D เต็มตัวแต่ gameplay อ่านง่ายแบบ top-down เดิม

**ทำไมถึงเลือกทางนี้:** จากการสำรวจโค้ด ส่วน "สมองของเกม" แยกจาก Phaser อยู่แล้วเกือบหมด:

| เลเยอร์ | ไฟล์ | ผูกกับ Phaser? | ชะตากรรม |
|---|---|---|---|
| Data specs | `src/game/data/*` (heroes, skills, items, economy, map, bot configs) | ❌ pure TS | **ใช้ต่อ 100% ไม่แก้** |
| AI | `src/game/ai/*` (BotBrain, BotMemory, BotPerception) | ❌ pure TS | **ใช้ต่อ 100% ไม่แก้** |
| Combat math | `src/game/combat/HitShapes.ts`, damage formula ใน CombatSystem | ❌ pure math | **ใช้ต่อ 100% ไม่แก้** |
| Types | `src/game/types.ts` (MapDefinition, InputState, …) | ❌ pure TS | **ใช้ต่อ** |
| Systems | `systems/*` (Objective, Capture, SiegeBuff, MatchTimer, Projectile, BotUnit) | ผูกบางส่วน (~8–9 จุด/ไฟล์ ส่วนใหญ่คือการวาด) | **แยก logic ออกจากการวาด แล้วพอร์ต** |
| Entities / Scenes / UI / VFX | `entities/*`, `scenes/*`, `ui/*` | ✅ ผูกหนัก | **เขียน render layer ใหม่ด้วย Three.js + HTML HUD** |

สรุป: จากโค้ด ~8,000+ บรรทัด ส่วนที่ต้องเขียนใหม่จริงคือเปลือก render/UI (~40%)
ส่วน balance, AI, กติกา ทั้งหมดที่จูนมาตั้งแต่ Phase 3–5B **รอดทั้งหมด**

### แนวทางที่พิจารณาแล้วตัดทิ้ง

1. **Hybrid — Phaser วาด HUD ทับ canvas ของ Three.js**: ตัดทิ้ง เพราะแบก 2 engine
   (bundle ใหญ่, event/input ชนกัน, scale system ซ้อนกัน) — HUD ใช้ HTML/CSS ดีกว่า
   และเบากว่าบนมือถือ
2. **ย้ายไป physics 3D เต็มตัว (cannon-es / rapier)**: ตัดทิ้ง เกมนี้ไม่มีการกระโดด/
   ตกจากที่สูง/ฟิสิกส์ซับซ้อน — collision วงกลม-สี่เหลี่ยมที่มีอยู่เพียงพอและ
   deterministic กว่า
3. **react-three-fiber**: ตัดทิ้ง โปรเจกต์ไม่ได้ใช้ React การเพิ่มเข้ามาคือ scope creep

---

## 2. สถาปัตยกรรมเป้าหมาย

```
src/
  main.ts                    # bootstrap → AppStateMachine (แทน Phaser scene list)
  game/                      # ★ core เดิม — logic ล้วน ไม่ import three/phaser
    data/  ai/  combat/  types.ts
    sim/                     # (ใหม่) logic ที่สกัดออกจาก systems เดิม
      MatchSim.ts            # world state + fixed-tick update (ผู้เล่น บอท กระสุน objective)
      MovementSim.ts         # เดิน + ชนกำแพง (พอร์ตจาก arcade physics → circle-vs-rect เดิม)
      ...System.ts           # Objective/Capture/SiegeBuff/MatchTimer เวอร์ชัน logic-only
  render3d/                  # (ใหม่) เลเยอร์ Three.js — อ่าน state จาก sim เท่านั้น
    Renderer3D.ts            # WebGLRenderer, resize, render loop, quality tiers
    CameraRig.ts             # follow player, มุมกดเฉียง, ซูมได้
    MapBuilder.ts            # MapDefinition → terrain plane + walls + structures
    ActorView.ts             # ตัวละคร (primitive → GLTF), HP bar sprite, tint ทีม
    ProjectileView.ts  VfxView.ts  GroundMarkerView.ts   # decal/telegraph บนพื้น
    CombatTextView.ts        # เลข damage ลอย (CSS2DRenderer)
  ui-html/                   # (ใหม่) HUD ทั้งหมดเป็น HTML/CSS overlay
    hud.ts joystick.ts skill-buttons.ts screens/ (menu, class-select, result)
```

กติกา dependency ทางเดียว: `ui-html` → `sim` ← `render3d` และ **ห้าม** `sim` import
อะไรจาก `render3d`/`three` เด็ดขาด (บังคับให้ logic ทดสอบได้แบบ headless)

Loop หลัก: **fixed-tick simulation (60 Hz) + render ตาม rAF** — แยก tick จาก frame
เพื่อให้ balance คงเดิมบนจอ 120 Hz/มือถือช้า

---

## 3. ตารางแปลงเทคโนโลยี Phaser → Three.js

| ของเดิม (Phaser) | ของใหม่ | หมายเหตุ |
|---|---|---|
| Scene list (Boot/Menu/ClassSelect/Match/Result) | state machine + หน้าจอ HTML; Match เท่านั้นที่ใช้ WebGL | Menu/ClassSelect/Result เป็น DOM ล้วน — เร็ว, responsive, แปลง่าย |
| Arcade physics (velocity, collider) | `MovementSim` เอง: pos += dir·speed·dt แล้ว resolve ชน circle-vs-`WallRect` | กติกาการชนเหมือนเดิม; ไม่ต้องมี physics lib |
| Camera follow 2D | `CameraRig` perspective ตามผู้เล่น + lerp | เพิ่ม screen-shake ตอนโดนตีได้ในเฟสหลัง |
| SVG sprites (ตัวละคร/สกิล/UI) | ตัวละคร → GLTF; ไอคอนสกิล/UI → ใช้ SVG เดิมใน HTML HUD ได้เลย | asset UI เดิมรอดเกือบหมด |
| `CombatVfx` (arc, spark, burst) | particle/quad mesh + additive blending; AoE telegraph = วงบนพื้น (ring geometry / decal) | สเปกจังหวะเวลาใน phase-4d docs ใช้ต่อได้ |
| `CombatText` เลขลอย | `CSS2DRenderer` label ผูกกับ world position | คมชัดทุก DPI, จัดสไตล์ด้วย CSS |
| `VirtualJoystick`/`SkillButtons` (Phaser objects) | HTML touch overlay — พอร์ต logic เดิม (activePointers=3 → pointer events) | โครงสร้าง `InputState` ใน types.ts ใช้เดิมเป๊ะ |
| `MapRenderer` (SVG tiles) | `MapBuilder` สร้าง mesh จาก `MapDefinition` เดิม | แผนที่ twin-fortress เดิมคือ source of truth |
| Depth/sort layers | z-buffer จัดการให้เอง + `renderOrder` สำหรับ decal | ปัญหา depth-sort 2D หายไปเลย |

Dependencies ที่เปลี่ยน: **เพิ่ม `three`** (มี type ในตัว), ระหว่างทางคง `phaser` ไว้
จนผ่าน parity gate (ข้อ 5) แล้วค่อยถอดออกใน 6F

---

## 4. แผนแบ่งเฟสย่อย (ตามธรรมเนียม phase ของโปรเจกต์)

แต่ละเฟสจบแล้ว **เล่นได้จริงบนมือถือ + เดสก์ท็อป** และมี exit criteria ชัดเจน

### Phase 6A — Renderer Foundation (โครง 3D + เดินได้)
- เพิ่ม `three`, สร้าง `render3d/` + `sim/` + `ui-html/` + state machine แทน scene list
- พื้นเรียบขนาด `MapDefinition.width×height`, ผู้เล่นเป็น capsule เดินด้วย WASD +
  joystick HTML, กล้อง follow, กำแพงเป็นกล่องพร้อม collision เดิม
- เข้าผ่าน `?renderer=3d` — โหมด 2D เดิมยังเป็น default ใช้เทียบพฤติกรรม
- **Exit:** เดินรอบแมพใน 3D ชนกำแพงถูกต้องตรงกับ 2D, 60fps มือถือระดับกลาง

### Phase 6B — Map & Structures 3D
- `MapBuilder`: สามเส้นทาง (main / high ground / shadow), ฐานสองฝั่ง, gate, core,
  watchtower, siege ruins, resource camp, forward camp — เริ่มจาก primitive ที่อ่านรู้เรื่อง
  (สี/รูปทรงตาม `phase-4e-visual-design-spec.md`)
- แสง hemisphere + directional หนึ่งดวง, เงาเฉพาะ tier สูง
- **Exit:** เดินครบสามเส้นทาง จุด objective ครบทุกจุด ตรงพิกัดกับ map data เดิม

### Phase 6C — Combat Port (สู้ได้)
- พอร์ต Player/TrainingDummy/Projectile เข้าระบบ sim + view, สกิลทั้ง 5 คลาส
  (melee_arc / projectile / aoe_circle / heal) ผ่าน `HitShapes` เดิมไม่แก้สูตร
- Telegraph บนพื้น (attack cone, AoE ring), เลข damage แบบ CSS2D, HUD สกิล +
  cooldown เป็น HTML
- **Exit:** ตี dummy ครบทุกคลาสทุกสกิล ตัวเลข damage/mana/cooldown ตรงกับโหมด 2D

### Phase 6D — Bots ใน 3D
- ต่อ `BotBrain/Perception/Memory` เดิมเข้ากับ sim (ไม่แก้ AI) + พอร์ต executor
  จาก `BotUnit`/`BotPlayer` (แยก logic เดิน/โจมตีออกจากโค้ดวาด)
- รองรับ encounter preset (5B-1/5B-2 separation) ครบ
- **Exit:** สู้บอทครบทุกคลาส/ทุก encounter พฤติกรรมเทียบเท่าโหมด 2D

### Phase 6E — Objectives / Match Loop ครบวงจร (Parity Gate)
- พอร์ต Objective/Capture/SiegeBuff/MatchTimer (logic-only) + HUD timer/score/
  capture progress เป็น HTML + player guidance markers เป็นของ 3D (วงบนพื้น/ลูกศร)
- Result screen, respawn, win condition ครบ
- **Exit — Parity Gate:** เล่นแมตช์เต็มจนจบเงื่อนไขชนะ/แพ้ได้ ฟีเจอร์เท่าโหมด 2D ทุกข้อ
  ใน README "What works now" → จากนั้นสลับ 3D เป็น default

### Phase 6F — Visual Upgrade จริง (ถึงจะ "ดูเป็นเกม 3D")
- โมเดลตัวละคร GLTF + animation (idle/run/attack/cast/death) — เริ่มจาก CC0 pack
  (เช่น KayKit Adventurers / Quaternius) ให้ครบ 5 คลาส แล้วค่อย custom ภายหลัง
- แต่งแมพ: โมเดลป้อม/ประตู/ต้นไม้/หิน, พื้นผิว 3 โซนตาม art-style-guide
- VFX อัปเกรด: particle จริง, glow/bloom เฉพาะเครื่องแรง
- ถอด `phaser` ออกจาก dependencies, ลบโค้ด 2D runtime
- **Exit:** ตัวละครมีอนิเมชันครบ, แมพมีบรรยากาศ, bundle ไม่มี Phaser

### Phase 6G — Performance & Release
- Quality tiers (low/med/high): เงา, pixel ratio cap, particle budget
- ทดสอบมือถือจริงตาม checklist เดิม (fullscreen, multi-touch, PWA), วัด fps/memory
- อัปเดต README + `project-status.md`, deploy Render ตามเดิม (ยังเป็น static site)
- **Exit:** 60fps บนมือถือระดับกลาง / ≥30fps เครื่องเก่า, ผ่าน release checklist

**ลำดับความเสี่ยง:** 6A พิสูจน์เทคนิคก่อน (เสี่ยงสุด-เล็กสุด) → 6C/6D คืองานเนื้อเยอะสุด →
6F เป็นงาน asset ที่ตัด scope ได้โดยไม่กระทบ gameplay

---

## 5. Risk Register

| # | ความเสี่ยง | ผลกระทบ | แผนรับมือ |
|---|---|---|---|
| R1 | เพอร์ฟอร์แมนซ์มือถือ (draw calls, เงา, particle) | สูง | quality tiers ตั้งแต่ 6B, cap pixelRatio ≤2, เงาเฉพาะ tier สูง, instancing สำหรับ prop, วัด fps ทุกเฟส |
| R2 | พอร์ตแล้ว balance เพี้ยน (dt, การชน, ระยะ) | สูง | fixed-tick 60Hz, ใช้ HitShapes/สูตรเดิม byte-ต่อ-byte, คงโหมด 2D ไว้เทียบ side-by-side จนถึง parity gate 6E |
| R3 | ไม่มีทักษะ/เวลาทำโมเดล 3D | กลาง | 6A–6E ใช้ primitive ล้วน (เกมเล่นได้โดยไม่ต้องมีโมเดล), 6F เริ่มจาก CC0 pack |
| R4 | `MatchScene.ts` 1,164 บรรทัดพันกันแน่น แยกยาก | กลาง | สกัดเป็น `MatchSim` ทีละระบบตามเฟส 6C→6E ไม่ทำ big-bang; ทุกเฟสต้อง `npm run build` ผ่านและเล่นได้ |
| R5 | Scope creep (อยากได้กระโดด/กล้องหมุนอิสระ/ฟิสิกส์จริง) | กลาง | ล็อกกติกา 2.5D ในเอกสารนี้ — ฟีเจอร์ 3D เชิงกลไกใหม่ = phase 7+ เท่านั้น |
| R6 | Input มือถือถดถอย (multi-touch joystick + ปุ่ม) | กลาง | พอร์ต logic จาก `VirtualJoystick`/`SkillButtons` ตรง ๆ, ทดสอบตาม mobile checklist เดิมทุกเฟส |
| R7 | Bundle โตขึ้นชั่วคราวช่วงถือ 2 engine | ต่ำ | โหลดแบบ dynamic import แยก path 2D/3D; ถอด Phaser ที่ 6F |

---

## 6. สิ่งที่ต้องตัดสินใจ/ยืนยันก่อนเริ่ม 6A

1. **มุมกล้อง:** ตามหลังผู้เล่นมุมกดเฉียง (แนะนำ) หรือ isometric ล็อกทิศ — กระทบการวาง HUD และ guidance markers
2. **สไตล์อาร์ต 3D:** low-poly / stylized (แนะนำ — เข้ากับ CC0 pack และมือถือ) หรือ realistic
3. ยืนยันกติกา "2.5D ห้ามเพิ่มกลไก 3D ใหม่จนจบ 6G" เพื่อกัน scope creep

---

*เอกสารนี้คือแผนแม่บทของ Phase 6 — เฟสย่อยแต่ละอันจะมี spec/acceptance doc ของตัวเองตามธรรมเนียมเดิมเมื่อเริ่มลงมือ*
