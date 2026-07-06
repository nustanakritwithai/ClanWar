import * as THREE from 'three';
import { COLORS, PLAYER_RADIUS } from '../game/constants';
import type { PlayerSimState } from '../game/sim/MatchSim';
import type { CharacterHandle } from './CharacterModel';

// Phase 6F: the player is an animated GLTF character (RobotExpressive, CC0)
// tinted team blue with a class prop. Until the model resolves — or if it
// fails to load — the 6A capsule stays as the fallback body, so the game is
// playable on a broken/slow asset path.

const BODY_LENGTH = 42;
const BODY_CENTER_Y = BODY_LENGTH / 2 + PLAYER_RADIUS;

export class PlayerView {
  public readonly group: THREE.Group;

  private readonly bob: THREE.Group;
  private readonly capsule: THREE.Group;
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private character: CharacterHandle | null = null;
  private walkPhase = 0;
  private hurtRemaining = 0;
  private moveSpeedRef = 190;

  constructor() {
    this.group = new THREE.Group();
    this.bob = new THREE.Group();
    this.group.add(this.bob);

    // --- fallback capsule (visible until the GLTF is attached) ---
    this.capsule = new THREE.Group();
    this.bob.add(this.capsule);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.blue,
      flatShading: true,
      roughness: 0.65,
    });
    this.bodyMat = bodyMat;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(PLAYER_RADIUS, BODY_LENGTH, 3, 10), bodyMat);
    body.position.y = BODY_CENTER_Y;
    this.capsule.add(body);

    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.5 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(9, 22, 6), beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(PLAYER_RADIUS + 8, BODY_CENTER_Y + 10, 0);
    this.capsule.add(beak);

    // Hitbox ring on the ground = exact collision radius.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(PLAYER_RADIUS - 3, PLAYER_RADIUS, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1;
    this.group.add(ring);
  }

  /** Swap the capsule for the loaded GLTF character (Phase 6F). */
  public attachCharacter(character: CharacterHandle): void {
    this.character = character;
    this.bob.add(character.group);
    this.capsule.visible = false;
    character.playBase('Idle');
  }

  /** Brief red flash when the player takes a hit. */
  public hurtFlash(): void {
    this.hurtRemaining = 0.14;
  }

  /** Normal attack fired — swing. */
  public onAttack(): void {
    this.character?.playOnce('Punch', 1.6);
  }

  /** Skill cast — flourish. */
  public onCast(): void {
    this.character?.playOnce('Wave', 1.8);
  }

  /** Match won — celebrate. */
  public onVictory(): void {
    this.character?.playAndHold('Dance');
  }

  /**
   * Place the view at the interpolated sim position. `alpha` blends between
   * the previous and current fixed tick; `dt` drives animation.
   */
  public sync(p: PlayerSimState, alpha: number, dt: number): void {
    this.moveSpeedRef = p.moveSpeed;

    if (this.hurtRemaining > 0) {
      this.hurtRemaining -= dt;
      this.bodyMat.emissive.set(0xef4444);
      this.bodyMat.emissiveIntensity = 0.6;
      this.character?.setEmissive(0xef4444, 0.6);
    } else {
      this.bodyMat.emissiveIntensity = 0;
      this.character?.setEmissive(0x000000, 0);
    }

    const x = p.prevX + (p.x - p.prevX) * alpha;
    const y = p.prevY + (p.y - p.prevY) * alpha;
    this.group.position.set(x, 0, y);
    this.bob.rotation.y = -p.facingAngle;

    if (this.character) {
      this.character.playBase(p.moving ? 'Running' : 'Idle', p.moving ? this.moveSpeedRef / 190 : 1);
      this.character.update(dt);
      this.bob.position.y = 0;
      return;
    }

    // Fallback capsule: light bounce while moving.
    if (p.moving) {
      this.walkPhase += dt * 11;
      this.bob.position.y = Math.abs(Math.sin(this.walkPhase)) * 6;
    } else {
      this.walkPhase = 0;
      this.bob.position.y *= Math.max(0, 1 - dt * 12);
    }
  }
}
