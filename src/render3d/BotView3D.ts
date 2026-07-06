import * as THREE from 'three';
import type { BotSnapshot } from '../game/sim/SimBot';
import type { CombatTextLayer } from './CombatTextLayer';
import { createCharacter, type CharacterHandle } from './CharacterModel';

// Phase 6D/6F: view for the AI enemy bots. 6F upgrades each bot from a red
// capsule to an animated GLTF character (red team tint + class prop); the
// capsule remains as the fallback body when the model hasn't loaded. Views
// are diffed against the sim's bot snapshots by id every frame.

const ENEMY_RED = 0xdc2626;
const ENEMY_TINT = 0xff5a5a;
const WINDUP = 0xf59e0b;
const BODY_LEN = 42;
const BODY_CY = BODY_LEN / 2 + 22;
const HP_W = 54;

type CharacterBase = Parameters<typeof createCharacter>[0];

interface BotVisual {
  group: THREE.Group;
  tip: THREE.Group;
  capsule: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  character: CharacterHandle | null;
  hpFill: THREE.Sprite;
  label: { set(t: string): void; setPosition(x: number, y: number): void; remove(): void };
  lastHp: number;
  lastState: string;
  lastDead: boolean;
  flash: number;
}

export class BotView3D {
  public readonly group = new THREE.Group();
  private readonly views = new Map<string, BotVisual>();
  private readonly combatText: CombatTextLayer;
  private characterBase: CharacterBase | null = null;

  constructor(combatText: CombatTextLayer) {
    this.combatText = combatText;
  }

  /** Provide the loaded GLTF base. Existing capsule views are torn down and
   * rebuilt as characters on the next sync (cheap: a handful of bots). */
  public setCharacterBase(base: CharacterBase): void {
    this.characterBase = base;
    for (const [id, v] of this.views) {
      this.group.remove(v.group);
      v.label.remove();
      this.views.delete(id);
    }
  }

  public sync(bots: readonly BotSnapshot[], alpha: number, dt: number): void {
    const seen = new Set<string>();

    for (const bot of bots) {
      seen.add(bot.id);
      let v = this.views.get(bot.id);
      if (!v) {
        v = this.create(bot);
        this.views.set(bot.id, v);
        this.group.add(v.group);
      }

      const x = bot.prevX + (bot.x - bot.prevX) * alpha;
      const z = bot.prevY + (bot.y - bot.prevY) * alpha;
      const moving = Math.hypot(bot.x - bot.prevX, bot.y - bot.prevY) > 0.05;
      v.group.position.set(x, 0, z);
      v.tip.rotation.y = -bot.facingAngle;
      v.label.setPosition(x, z);

      if (bot.currentHp < v.lastHp) v.flash = 0.14;
      v.lastHp = bot.currentHp;

      // HP bar width + color.
      const ratio = Math.max(0, bot.currentHp / bot.maxHp);
      v.hpFill.scale.x = Math.max(0.001, HP_W * ratio);
      v.hpFill.position.x = -(HP_W * (1 - ratio)) / 2;
      (v.hpFill.material as THREE.SpriteMaterial).color.set(ratio > 0.5 ? ENEMY_RED : ratio > 0.25 ? 0xf97316 : 0xfca5a5);

      // Emissive: hit flash (white) beats wind-up telegraph (amber pulse).
      let em = 0x000000;
      let emI = 0;
      if (v.flash > 0) {
        v.flash -= dt;
        em = 0xffffff; emI = 0.7;
      } else if (bot.state === 'windup') {
        em = WINDUP; emI = 0.4 + 0.3 * Math.sin(performance.now() / 60);
      }
      v.bodyMat.emissive.set(em);
      v.bodyMat.emissiveIntensity = emI;
      v.character?.setEmissive(em, emI);

      // Animation state machine (character path).
      if (v.character) {
        if (bot.dead && !v.lastDead) {
          v.character.playAndHold('Death');
        } else if (!bot.dead && v.lastDead) {
          v.character.playBase('Idle');
          v.character.playOnce('Jump', 1.4);
        } else if (!bot.dead) {
          // Swing resolved this frame: windup → recovery.
          if (v.lastState === 'windup' && bot.state === 'recovery') {
            v.character.playOnce('Punch', 1.6);
          }
          v.character.playBase(moving ? 'Running' : 'Idle');
        }
        v.character.update(dt);
        v.tip.rotation.z = 0;
        v.group.scale.setScalar(bot.dead ? Math.max(0.72, v.group.scale.x - dt * 0.5) : 1);
      } else {
        // Fallback capsule: death tip-over + shrink.
        const targetTilt = bot.dead ? 1.3 : 0;
        v.tip.rotation.z += (targetTilt - v.tip.rotation.z) * Math.min(1, dt * 9);
        const targetScale = bot.dead ? 0.6 : 1;
        const cur = v.group.scale.x;
        v.group.scale.setScalar(cur + (targetScale - cur) * Math.min(1, dt * 8));
      }

      v.lastState = bot.state;
      v.lastDead = bot.dead;
      v.label.set(bot.dead ? '' : `${bot.name}`);
      v.hpFill.visible = !bot.dead;
    }

    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.group.remove(v.group);
      v.label.remove();
      this.views.delete(id);
    }
  }

  private create(bot: BotSnapshot): BotVisual {
    const group = new THREE.Group();
    const tip = new THREE.Group();
    group.add(tip);

    const capsule = new THREE.Group();
    tip.add(capsule);

    const bodyMat = new THREE.MeshStandardMaterial({ color: ENEMY_TINT, flatShading: true, roughness: 0.6 });

    let character: CharacterHandle | null = null;
    if (this.characterBase) {
      character = createCharacter(this.characterBase, ENEMY_TINT, bot.classId);
      tip.add(character.group);
      character.playBase('Idle');
      capsule.visible = false;
    }

    // Fallback capsule body (hidden when the character is present).
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(bot.radius, BODY_LEN, 3, 10), bodyMat);
    body.position.y = BODY_CY;
    capsule.add(body);

    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(9, 22, 6),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, flatShading: true }),
    );
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(bot.radius + 8, BODY_CY + 10, 0);
    capsule.add(beak);

    if (bot.isRanged) {
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(7),
        new THREE.MeshStandardMaterial({ color: 0xfca5a5, emissive: 0xef4444, emissiveIntensity: 0.5, flatShading: true }),
      );
      orb.position.set(bot.radius + 2, BODY_CY + 34, 0);
      capsule.add(orb);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(bot.radius - 3, bot.radius, 28),
      new THREE.MeshBasicMaterial({ color: ENEMY_RED, transparent: true, opacity: 0.5 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1;
    group.add(ring);

    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x3f1d1d, transparent: true, opacity: 0.9 }));
    bg.scale.set(HP_W + 4, 8, 1);
    bg.position.y = 128;
    group.add(bg);
    const hpFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: ENEMY_RED }));
    hpFill.scale.set(HP_W, 5, 1);
    hpFill.position.y = 128;
    group.add(hpFill);

    const label = this.combatText.createLabel(bot.x, bot.y, 148, { color: '#fecaca', background: 'rgba(127,29,29,0.8)' });

    return {
      group, tip, capsule, bodyMat, character, hpFill, label,
      lastHp: bot.currentHp, lastState: bot.state, lastDead: bot.dead, flash: 0,
    };
  }
}
