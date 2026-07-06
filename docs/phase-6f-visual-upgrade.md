# Phase 6F — Visual Upgrade: animated GLTF characters + particles + Phaser removed

> Status: **IMPLEMENTED — 7/7 6F checks + 28/28 6E regression pass, Phaser out of the bundle**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Previous slice: [phase-6e-match-loop-3d.md](phase-6e-match-loop-3d.md)

## What this phase delivers

### 1. Animated GLTF characters
- **Asset:** `public/assets/models/RobotExpressive.glb` — **CC0 by Tomás Laulhé
  (quaternius.com), glTF conversion by Don McCurdy**; shipped with the three.js
  examples. (The planned 5-class CC0 packs — KayKit/Quaternius — are only
  distributed via Google Drive/out-of-scope GitHub repos, unreachable from this
  environment; the user chose this model as the shared base.)
- **`render3d/CharacterModel.ts`**: loads the glb once, clones per actor with
  `SkeletonUtils` (independent `AnimationMixer` each), clones materials per
  instance for team tint (player blue / bots red) + emissive flashes, and
  attaches a low-poly class prop: guardian shield, warrior sword, ranger bow,
  mage staff+orb, priest halo. Crossfaded clip control: looping base
  (`playBase`), one-shots that return to base (`playOnce`), and held poses
  (`playAndHold`).
- Clip mapping: Idle ↔ Running (move), Punch (attack — player normal attack +
  bot swing on windup→recovery), Wave (skill cast), Death (held; bots),
  Jump (respawn), Dance (player on victory).
- The 6A capsule remains as an automatic fallback if the model fails to load.

### 2. Map atmosphere
Base banners (waving flags, blue/red) flanking each fortress entrance and
emissive lamp posts along the main route (no extra PointLights — mobile
budget). Trees/rocks were already `InstancedMesh` from 6B.

### 3. Particle VFX
One pooled additive `THREE.Points` cloud (fixed 500-particle budget, zero
per-effect allocation; fading = vertex-color → black under additive
blending): hit sparks, impact debris, rising heal sparkles, projectile
trails, and a big `destroyBurst` for gate/core destruction.

### 4. Phaser removed
- Deleted the whole 2D runtime: `main2d.ts`, `game/config.ts`, `scenes/`,
  `ui/`, `theme/`, `entities/`, and the 10 Phaser-coupled systems whose logic
  had been ported into `sim/` during 6C–6E.
- Kept (pure TS): `data/`, `ai/`, `combat/`, `controllers/`, `sim/`,
  `systems/CombatSystem`, `systems/SkillRuntimeSystem` (its 2D-only
  `tryUseSkill(player)` overload removed).
- Type homes moved without value changes: `BotState` → `types.ts`,
  `NormalAttackProjectileKind` → `controllers/BotPlayerController.ts`.
- `npm uninstall phaser`; `main.ts` always boots 3D (`?renderer=2d` links
  safely land in the 3D game).

## Bundle impact

| | before (6E) | after (6F) |
|---|---|---|
| JS payload | main2d 1,612 KB + boot3d 556 KB | **boot3d 712 KB** (gzip 186 KB) |
| deps | phaser + three | **three only** |

## Verified (Playwright, dev build)
- 7/7 6F checks: 3D boots on bare URL and on legacy `?renderer=2d`; movement,
  attack, and Fireball (118 dmg — unchanged math) work with the character
  model; bot dies (Death clip) and respawns (Jump); 4-bot encounter renders.
- 28/28 Phase 6E match-loop regression suite re-passed unchanged (sim
  untouched except the `BotState` type move).
- `npm run build` clean; no `phaser`/`main2d` chunk in `dist/`.

## Next
6G — Performance & Release: quality tiers (shadows/pixel-ratio/particles),
real-device mobile checklist, fps/memory measurement, final README/status.
