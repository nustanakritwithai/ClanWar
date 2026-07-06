import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { HeroClassId } from '../game/types';

// Phase 6F: shared animated character for player + bots.
//
// Base model: RobotExpressive.glb — CC0 by Tomás Laulhé (quaternius.com),
// glTF conversion by Don McCurdy; shipped with the three.js examples. One
// model, cloned per actor via SkeletonUtils so each instance animates
// independently; materials are cloned per instance so team tint and hit
// flashes never bleed between actors. Class identity comes from a primitive
// prop (shield/sword/bow/staff/halo) + an accent tint.

const MODEL_URL = 'assets/models/RobotExpressive.glb';
/** Desired world height (sim units). The 6A capsule stood ~108 tall. */
const TARGET_HEIGHT = 132;
/** RobotExpressive faces +Z at rest; our views point +X at facing=0. */
const FORWARD_FIX_Y = -Math.PI / 2;

export type CharacterClip =
  | 'Idle' | 'Walking' | 'Running' | 'Dance' | 'Death' | 'Jump'
  | 'No' | 'Punch' | 'Sitting' | 'Standing' | 'ThumbsUp' | 'Wave' | 'Yes'
  | 'WalkJump';

let gltfPromise: Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[]; scale: number }> | null = null;

/** Load + measure the base model once. Rejects on network/parse failure —
 * callers fall back to the primitive capsule look. */
export function loadCharacterBase(): Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[]; scale: number }> {
  if (!gltfPromise) {
    gltfPromise = new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const height = Math.max(0.001, box.max.y - box.min.y);
      return { scene: gltf.scene, clips: gltf.animations, scale: TARGET_HEIGHT / height };
    });
  }
  return gltfPromise;
}

export interface CharacterHandle {
  /** Attach this to the view group; position/rotation are the caller's job. */
  group: THREE.Group;
  /** Set the looping base clip (Idle/Running); no-op if already playing. */
  playBase(name: CharacterClip, timeScale?: number): void;
  /** Fire a one-shot clip (Punch/Wave/Jump/Dance); base resumes after. */
  playOnce(name: CharacterClip, timeScale?: number): void;
  /** Hold a clip at its final pose (Death). Cleared by playBase(). */
  playAndHold(name: CharacterClip): void;
  /** Emissive flash across all body materials (hurt/windup telegraphs). */
  setEmissive(color: number, intensity: number): void;
  update(dt: number): void;
}

const CLASS_ACCENT: Record<HeroClassId, number> = {
  guardian: 0x94a3b8,
  warrior: 0xf59e0b,
  ranger: 0x22c55e,
  mage: 0xa855f7,
  priest: 0xfde68a,
};

export function createCharacter(
  base: { scene: THREE.Group; clips: THREE.AnimationClip[]; scale: number },
  teamTint: number,
  classId: HeroClassId,
): CharacterHandle {
  const group = new THREE.Group();

  const model = SkeletonUtils.clone(base.scene);
  model.scale.setScalar(base.scale);
  model.rotation.y = FORWARD_FIX_Y;
  group.add(model);

  // Per-instance materials + team tint. RobotExpressive's "Main" material is
  // the body shell — lerp it toward the team color; keep dark trim as-is.
  const materials: THREE.MeshStandardMaterial[] = [];
  const tint = new THREE.Color(teamTint);
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true; // no-op unless the high tier enables shadow maps
    const src = child.material as THREE.MeshStandardMaterial;
    const mat = src.clone();
    child.material = mat;
    if (mat instanceof THREE.MeshStandardMaterial) {
      materials.push(mat);
      if (mat.name === 'Main') {
        mat.color.lerp(tint, 0.75);
      } else if (mat.name === 'Grey') {
        mat.color.lerp(tint, 0.25);
      }
    }
  });

  group.add(buildClassProp(classId));

  // --- animation ---
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const clip of base.clips) {
    actions.set(clip.name, mixer.clipAction(clip));
  }

  let baseAction: THREE.AnimationAction | null = null;
  let baseName = '';
  let oneShot: THREE.AnimationAction | null = null;
  let holding = false;

  function startBase(name: CharacterClip, timeScale = 1): void {
    const next = actions.get(name);
    if (!next) return;
    if (baseName === name && !holding) {
      if (baseAction) baseAction.timeScale = timeScale;
      return;
    }
    holding = false;
    next.reset();
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.timeScale = timeScale;
    next.play();
    if (baseAction && baseAction !== next) baseAction.crossFadeTo(next, 0.22, false);
    baseAction = next;
    baseName = name;
  }

  mixer.addEventListener('finished', (e) => {
    if (e.action === oneShot && !holding) {
      // One-shot ended — blend back to the looping base.
      oneShot = null;
      if (baseAction) {
        baseAction.reset();
        baseAction.play();
        e.action.crossFadeTo(baseAction, 0.18, false);
      }
    }
  });

  return {
    group,
    playBase: startBase,
    playOnce(name: CharacterClip, timeScale = 1): void {
      const action = actions.get(name);
      if (!action || holding) return;
      oneShot = action;
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = timeScale;
      action.play();
      if (baseAction) baseAction.crossFadeTo(action, 0.1, false);
    },
    playAndHold(name: CharacterClip): void {
      const action = actions.get(name);
      if (!action) return;
      holding = true;
      oneShot = null;
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      if (baseAction && baseAction !== action) baseAction.crossFadeTo(action, 0.15, false);
      baseAction = action;
      baseName = name;
    },
    setEmissive(color: number, intensity: number): void {
      for (const mat of materials) {
        mat.emissive.set(color);
        mat.emissiveIntensity = intensity;
      }
    },
    update(dt: number): void {
      mixer.update(dt);
    },
  };
}

/** Low-poly class prop so the five classes read at a glance. Positioned near
 * the right hand / above the head; flat-shaded to match the world style. */
function buildClassProp(classId: HeroClassId): THREE.Object3D {
  const accent = CLASS_ACCENT[classId];
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: accent, flatShading: true, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x374151, flatShading: true, roughness: 0.7 });

  switch (classId) {
    case 'guardian': {
      // Round shield on the left arm.
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 4, 10), mat);
      shield.rotation.z = Math.PI / 2;
      shield.position.set(6, 58, -26);
      g.add(shield);
      break;
    }
    case 'warrior': {
      // Sword at the right hand: blade + guard.
      const blade = new THREE.Mesh(new THREE.BoxGeometry(5, 42, 2), mat);
      blade.position.set(14, 66, 26);
      blade.rotation.z = -0.35;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 4), dark);
      guard.position.set(21, 48, 26);
      guard.rotation.z = -0.35;
      g.add(blade, guard);
      break;
    }
    case 'ranger': {
      // Bow arc held to the side.
      const bow = new THREE.Mesh(new THREE.TorusGeometry(20, 2, 6, 14, Math.PI), mat);
      bow.position.set(10, 58, 26);
      bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
      g.add(bow);
      break;
    }
    case 'mage': {
      // Staff with a floating orb.
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 56, 6), dark);
      staff.position.set(10, 52, 26);
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(7),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6, flatShading: true }),
      );
      orb.position.set(10, 84, 26);
      g.add(staff, orb);
      break;
    }
    case 'priest': {
      // Halo above the head.
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(14, 2, 6, 18),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.7, flatShading: true }),
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 128, 0);
      g.add(halo);
      break;
    }
  }
  return g;
}
