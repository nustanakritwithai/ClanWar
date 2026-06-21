import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../constants';
import { testMeleeArc } from '../combat/HitShapes';
import type { ActionKey, DamageResult, HeroClassId, HeroStats, SkillDefinition } from '../types';
import type { Player } from '../entities/Player';
import { getHero } from '../data/heroes';
import { BotPlayer, type BotState } from '../entities/BotPlayer';
import {
  BOT_PLAYER,
  BOT_PLAYER_DIFFICULTY_PROFILES,
  BOT_RANGED_SPACING,
  BOT_SKILL,
  DEFAULT_BOT_DIFFICULTY,
  type BotPlayerConfig,
  type BotDifficulty,
  type BotDifficultyProfile,
  type RangedSpacingProfile,
} from '../data/bot-player-config';
import { BotBrain, type BotGoal, type BotBrainSnapshot } from '../ai/BotBrain';
import { buildPerception } from '../ai/BotPerception';
import { BOT_BRAIN_CONFIG } from '../data/bot-brain-config';
import { SkillRuntimeSystem } from './SkillRuntimeSystem';
import { BotPlayerController, type BotIntent, type BotAttackKind } from '../controllers/BotPlayerController';
import {
  isRangedNormalAttackClass,
  normalAttackProjectileKind,
  showNormalAttackProjectile,
  showSkillCastFlash,
  showSlashArc,
  showHealBurst,
  showHealSpark,
  type NormalAttackProjectileKind,
} from '../ui/CombatVfx';

/** Player-facing enemy label per class (no snake_case / debug strings). */
const CLASS_DISPLAY_NAME: Record<HeroClassId, string> = {
  guardian: 'Enemy Guardian',
  warrior: 'Enemy Warrior',
  ranger: 'Enemy Ranger',
  mage: 'Enemy Mage',
  priest: 'Enemy Priest',
};

export interface BotSystemHooks {
  /** Keep bot world objects off the fixed UI camera layer. */
  registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;
  /** Live player reference for detection, chase, and damage. */
  getPlayer: () => Player;
  /** Bot landed a melee hit on the player — show feedback + update HUD. */
  onBotHitPlayer: (result: DamageResult, x: number, y: number) => void;
  /** False when the match is resolved / not in progress — freezes bot AI. */
  isMatchActive: () => boolean;
}

export interface BotSnapshot {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armor: number;
  attack: number;
  classId: HeroClassId;
  attackKind: BotAttackKind;
  projectileKind: NormalAttackProjectileKind | null;
  state: BotState;
  goal: BotGoal;
  dead: boolean;
  detectionRange: number;
  attackRange: number;
  moveSpeed: number;
  speed: number;
  difficulty: BotDifficulty;
  respawnDelayMs: number;
  spawnX: number;
  spawnY: number;
}

export interface BotDifficultyInfo {
  difficulty: BotDifficulty;
  available: BotDifficulty[];
  classId: HeroClassId;
  baseAttack: number; // class baseline (no difficulty)
  effectiveAttack: number;
  effectiveMoveSpeed: number;
  effectiveWindupMs: number;
  effectiveCooldownMs: number;
}

export interface PlayerMeleeHitResult {
  result: DamageResult;
  x: number;
  y: number;
}

/**
 * BotUnit — runtime for ONE AI-controlled player (Phase 5B-1).
 *
 * This is the per-bot brain/combat lifecycle that was `BotPlayerSystem` through
 * Phase 5A; in 5B-1 it was extracted unchanged so a {@link BotPlayerSystem}
 * *manager* can own a collection of these. Each unit has its own id, class,
 * spawn point, brain, controller, cooldown/skill runtime, mana pool, and HP —
 * units never share runtime state.
 *
 * Its stat baseline is read BY VALUE from the shared player class table
 * (`getHero(classId)`) and difficulty applies bot-only multipliers on top.
 * Player stats and the player damage formula are untouched.
 *
 * Flow: build perception → {@link BotBrain} chooses a goal → {@link BotPlayerController}
 * converts the goal to a {@link BotIntent} → this unit executes the intent with
 * the shared movement/attack verbs. The combat sub-sequence (wind-up → attack →
 * recovery) runs to completion.
 *
 * Scope guard: per-bot rule-based brain (no LLM/ML), no objective/Gate/Core AI,
 * no shared squad targeting, no commander.
 */
export class BotUnit {
  /** Mutable so a debug class-swap can rebuild the entity (test hook). */
  public bot!: BotPlayer;
  public readonly id: string;

  private readonly scene: Phaser.Scene;
  private readonly hooks: BotSystemHooks;
  private readonly cfg: BotPlayerConfig;
  private classId: HeroClassId;
  private classStats!: HeroStats;
  private attackRange!: number;
  private readonly brain: BotBrain;
  private readonly controller: BotPlayerController;

  private difficulty: BotDifficulty;
  private profile: BotDifficultyProfile;

  private facingAngle = 0;
  private windupTimer = 0;
  private recoveryTimer = 0;
  private cooldownTimer = 0;

  // Class skill (Phase 5A-7) — reuses the shared player skill runtime + SKILLS.
  private skillRuntime!: SkillRuntimeSystem;
  private classSkill: SkillDefinition | undefined;
  private readonly skillAction: ActionKey = BOT_SKILL.action;
  private skillMana = 0;
  private skillMaxMana = 0;
  /** Skill currently being wound up (resolves at the end of the wind-up). */
  private castingSkill: SkillDefinition | null = null;
  // Debug/QA mirror of the last cast (proves shared source + shared damage path).
  private skillCastCount = 0;
  private lastSkillCast: { skillId: string; rawAmount: number; applied: number; heal: boolean } | null = null;

  // Respawn
  private respawnTimer = 0;
  private respawnArmed = false;

  // Patrol
  private patrolTarget: { x: number; y: number };
  private patrolPauseTimer = 0;
  private stuckTimer = 0;
  private lastPatrolX = 0;
  private lastPatrolY = 0;

  // Brain-driven stuck detection (separate from patrol's local guard)
  private stuckAccumMs = 0;
  private lastStuckX = 0;
  private lastStuckY = 0;
  private stuck = false;
  private debugStuckOverride: boolean | null = null;

  constructor(
    scene: Phaser.Scene,
    hooks: BotSystemHooks,
    cfg: BotPlayerConfig = BOT_PLAYER,
    difficulty: BotDifficulty = DEFAULT_BOT_DIFFICULTY,
    id = 'bot-0',
  ) {
    this.scene = scene;
    this.hooks = hooks;
    this.cfg = cfg;
    this.id = id;
    this.classId = cfg.classId;
    this.difficulty = difficulty;
    this.profile = BOT_PLAYER_DIFFICULTY_PROFILES[difficulty];

    this.brain = new BotBrain(BOT_BRAIN_CONFIG);
    this.controller = new BotPlayerController();
    this.buildBot(cfg.classId);
    this.patrolTarget = { x: cfg.spawn.x, y: cfg.spawn.y };
    this.resetPatrol();
  }

  /**
   * (Re)build the bot entity for a playable class. Stat baseline is read BY
   * VALUE from the shared player class table; the same sprite resolver the human
   * uses gives the class visual identity (BotPlayer applies the red treatment).
   */
  private buildBot(classId: HeroClassId): void {
    this.classId = classId;
    this.classStats = { ...getHero(classId).stats };
    this.attackRange = this.classStats.attackRange;

    // Class skill (Phase 5A-7): build a SkillRuntimeSystem for this class — the
    // SAME runtime + SKILLS source the human player uses — and cache the
    // signature slot skill. The bot's mana pool is seeded BY VALUE from the class
    // baseline (bot-only; the player's mana is never touched).
    this.skillRuntime = new SkillRuntimeSystem(classId);
    this.classSkill = this.skillRuntime.getSkillForAction(this.skillAction);
    this.skillMaxMana = this.classStats.mana;
    this.skillMana = this.classStats.mana;
    this.castingSkill = null;

    this.bot = new BotPlayer(
      this.scene,
      {
        classId,
        name: CLASS_DISPLAY_NAME[classId] ?? this.cfg.name,
        maxHp: Math.max(1, Math.round(this.classStats.hp * this.profile.hpMul)),
        armor: this.classStats.armor,
        radius: this.cfg.radius,
        spawn: { x: this.cfg.spawn.x, y: this.cfg.spawn.y },
      },
      (o) => this.hooks.registerWorldObject(o),
    );
  }

  // --- effective (class baseline × difficulty) stats — bot-only ---
  private get effMoveSpeed(): number {
    return this.classStats.moveSpeed * this.profile.speedMul;
  }
  private get effAttack(): number {
    return Math.max(1, Math.round(this.classStats.attack * this.profile.attackMul));
  }
  private get effWindupMs(): number {
    return this.cfg.windupMs * this.profile.windupMul;
  }
  private get effCooldownMs(): number {
    return this.cfg.attackCooldownMs * this.profile.cooldownMul;
  }

  // --- ranged class awareness (Phase 5A-5) ---
  private get attackKind(): BotAttackKind {
    return isRangedNormalAttackClass(this.classId) ? 'ranged' : 'melee';
  }
  private get projectileKind(): NormalAttackProjectileKind | null {
    return normalAttackProjectileKind(this.classId);
  }
  /** Detection scales up for ranged so the bot can engage from its class range. */
  private get effDetectionRange(): number {
    return Math.max(this.cfg.detectionRange, this.attackRange + 80);
  }
  private get effLeashRange(): number {
    return Math.max(this.cfg.leashRange, this.attackRange + 180);
  }
  /** Class spacing profile (Phase 5A-6) — null for melee classes. */
  private get rangedSpacing(): RangedSpacingProfile | null {
    return BOT_RANGED_SPACING[this.classId] ?? null;
  }

  // --- class skill awareness (Phase 5A-7) ---
  /** The class skill deals damage (offensive) vs. heals (defensive support). */
  private get skillIsOffensive(): boolean {
    return this.classSkill?.damage !== undefined;
  }
  /** Cast range for the class skill (its own range, else the class attack range). */
  private get skillRange(): number {
    return this.classSkill?.range ?? this.attackRange;
  }
  /** A class skill exists and its cooldown + mana are ready right now. */
  private get skillReady(): boolean {
    return !!this.classSkill && this.skillRuntime.canUseSkill(this.skillAction, this.skillMana);
  }

  public update(deltaMs: number): void {
    this.bot.update(deltaMs);
    const now = this.scene.time.now;

    if (this.bot.isDead()) {
      this.bot.body.setVelocity(0, 0);
      if (!this.respawnArmed) {
        this.respawnTimer = this.cfg.respawnDelayMs;
        this.respawnArmed = true;
      }
      if (this.hooks.isMatchActive()) {
        this.respawnTimer -= deltaMs;
        if (this.respawnTimer <= 0) this.respawnBot(now);
      }
      return;
    }

    if (!this.hooks.isMatchActive()) {
      this.bot.body.setVelocity(0, 0);
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaMs);

    // Class skill (Phase 5A-7): advance the shared cooldown runtime and regen the
    // bot-only mana pool so the skill becomes available like a player's would.
    const deltaSeconds = deltaMs / 1000;
    this.skillRuntime.update(deltaSeconds);
    this.skillMana = Math.min(this.skillMaxMana, this.skillMana + BOT_SKILL.manaRegenPerSecond * deltaSeconds);

    const player = this.hooks.getPlayer();

    // 1) Perceive → think (brain is a pure advisor).
    const spacing = this.rangedSpacing;
    const perception = buildPerception({
      botX: this.bot.x,
      botY: this.bot.y,
      playerX: player.x,
      playerY: player.y,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
      detectionRange: this.effDetectionRange,
      attackRange: this.attackRange,
      leashRange: this.effLeashRange,
      isRanged: this.attackKind === 'ranged',
      dangerCloseRange: spacing?.dangerCloseRange ?? 0,
      preferredMinRange: spacing?.preferredMinRange ?? 0,
      preferredMaxRange: spacing?.preferredMaxRange ?? 0,
      hpRatio: this.bot.currentHp / this.bot.maxHp,
      cooldownReady: this.cooldownTimer <= 0,
      isStuck: this.debugStuckOverride ?? this.stuck,
      state: this.bot.state,
      matchActive: true,
      prevDistanceToPlayer: this.brain.memory.prevDistanceToPlayer,
      motionDeadband: BOT_BRAIN_CONFIG.motionDeadband,
      skillReady: this.skillReady,
      skillIsOffensive: this.skillIsOffensive,
      skillRange: this.skillRange,
      defensiveHpRatio: BOT_SKILL.defensiveHpRatio,
    });
    this.brain.tick(perception, now, deltaMs);

    // 2) The combat sub-sequence runs to completion regardless of the goal.
    if (this.bot.state === 'windup') {
      this.bot.body.setVelocity(0, 0);
      this.windupTimer -= deltaMs;
      if (this.windupTimer <= 0) {
        this.bot.hideWindupCue();
        if (this.castingSkill) {
          // Class skill resolves through the shared skill/combat pipeline. A
          // whiffed offensive skill records a miss (like a basic attack) so the
          // recovery rhythm is preserved.
          const hit = this.resolveSkillCast(player, this.castingSkill);
          this.castingSkill = null;
          this.brain.memory.recordAttack(now);
          if (!hit) this.brain.memory.recordMissedAttack(now);
        } else {
          // Ranged classes fire a visual-only normal-attack projectile when the
          // shot resolves. Damage stays on the shared melee-arc/CombatSystem path.
          this.fireRangedProjectile(player);
          const hit = this.resolveAttack(player);
          this.brain.memory.recordAttack(now);
          if (!hit) this.brain.memory.recordMissedAttack(now);
        }
        this.bot.state = 'recovery';
        this.recoveryTimer = this.cfg.recoveryMs;
        this.cooldownTimer = this.effCooldownMs;
      }
      this.updateStuck(deltaMs, false);
      return;
    }

    if (this.bot.state === 'recovery') {
      this.bot.body.setVelocity(0, 0);
      this.recoveryTimer -= deltaMs;
      if (this.recoveryTimer <= 0) this.bot.state = 'idle';
      this.updateStuck(deltaMs, false);
      return;
    }

    // 3) Brain goal → controller intent → execute with shared verbs.
    const intent = this.controller.intentFor(this.brain.currentGoal(), perception, {
      playerX: player.x,
      playerY: player.y,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
      investigateTarget: this.brain.investigateTarget(),
      attackKind: this.attackKind,
      projectileKind: this.projectileKind,
      skillId: this.classSkill?.id ?? null,
    });
    this.executeIntent(intent, perception, player, deltaMs);
  }

  private executeIntent(intent: BotIntent, p: ReturnType<typeof buildPerception>, player: Player, deltaMs: number): void {
    switch (intent.kind) {
      case 'engage': {
        this.bot.state = 'chase';
        if (p.playerInAttackRange) {
          this.bot.body.setVelocity(0, 0);
          this.facingAngle = p.angleToPlayer;
          if (intent.basicAttack && this.cooldownTimer <= 0) {
            this.bot.state = 'windup';
            this.windupTimer = this.effWindupMs;
            this.bot.showWindupCue(this.effWindupMs);
          }
          this.updateStuck(deltaMs, false);
        } else {
          this.seekTo(player.x, player.y, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        }
        break;
      }

      case 'seek': {
        this.bot.state = 'idle';
        const tx = intent.targetX ?? this.bot.x;
        const ty = intent.targetY ?? this.bot.y;
        if (Math.hypot(this.bot.x - tx, this.bot.y - ty) > BOT_BRAIN_CONFIG.investigateArriveRadius) {
          this.seekTo(tx, ty, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        } else {
          this.bot.body.setVelocity(0, 0); // scanning / arrived
          this.updateStuck(deltaMs, false);
        }
        break;
      }

      case 'patrol': {
        this.bot.state = 'idle';
        this.patrol(deltaMs);
        this.updateStuck(deltaMs, false);
        break;
      }

      case 'cast_skill': {
        // Cast the class signature skill like a player: face the target, plant,
        // and start a telegraphed wind-up. The cast resolves through the shared
        // skill/combat pipeline when the wind-up completes (see update()).
        this.bot.state = 'chase';
        this.bot.body.setVelocity(0, 0);
        this.facingAngle = p.angleToPlayer;
        // The skill has its own cooldown (skillReady), decoupled from the basic
        // attack timer, so it can weave in while the auto is recharging.
        if (this.classSkill && this.skillReady) {
          this.castingSkill = this.classSkill;
          this.bot.state = 'windup';
          this.windupTimer = this.effWindupMs;
          this.bot.showWindupCue(this.effWindupMs);
        }
        this.updateStuck(deltaMs, false);
        break;
      }

      case 'kite': {
        // Ranged spacing: backpedal away from the player. The brain only chooses
        // this while reloading (attack_player outranks it), so no fire here; if
        // the cooldown frees up the goal flips to attack_player next tick.
        this.bot.state = 'chase';
        const fx = intent.targetX ?? player.x;
        const fy = intent.targetY ?? player.y;
        this.kiteAwayFrom(fx, fy, player.moveSpeed);
        this.updateStuck(deltaMs, true);
        break;
      }

      case 'hold': {
        // Ranged hold-and-fire (basicAttack) stays put and swings when in range +
        // cooldown ready; it never chases. Melee/no-attack holds are unchanged.
        if (intent.basicAttack && p.playerInAttackRange) {
          this.bot.state = 'chase';
          this.bot.body.setVelocity(0, 0);
          this.facingAngle = p.angleToPlayer;
          if (this.cooldownTimer <= 0) {
            this.bot.state = 'windup';
            this.windupTimer = this.effWindupMs;
            this.bot.showWindupCue(this.effWindupMs);
          }
          this.updateStuck(deltaMs, false);
        } else {
          this.bot.state = 'idle';
          this.bot.body.setVelocity(0, 0);
          this.updateStuck(deltaMs, false);
        }
        break;
      }

      default: {
        this.bot.state = 'idle';
        this.bot.body.setVelocity(0, 0);
        this.updateStuck(deltaMs, false);
        break;
      }
    }
  }

  /** Seek a world point, clamped so the bot is never unfairly faster than the player. */
  private seekTo(tx: number, ty: number, playerMoveSpeed: number): void {
    const angle = Math.atan2(ty - this.bot.y, tx - this.bot.x);
    const cap = playerMoveSpeed * this.profile.maxPlayerSpeedRatio;
    const v = Math.min(this.effMoveSpeed, cap);
    this.bot.body.setVelocity(Math.cos(angle) * v, Math.sin(angle) * v);
    this.facingAngle = angle;
  }

  /**
   * Kite: move directly away from (fx,fy) while keeping the aim toward it. Speed
   * is the class kite multiplier, still fairness-clamped to the player's speed so
   * the bot can never outrun the player. Off-leash / stuck is handled by the
   * brain (return_to_spawn outranks kite), so this stays a simple backpedal.
   */
  private kiteAwayFrom(fx: number, fy: number, playerMoveSpeed: number): void {
    const away = Math.atan2(this.bot.y - fy, this.bot.x - fx);
    const mul = this.rangedSpacing?.kiteSpeedMul ?? 1;
    const cap = playerMoveSpeed * this.profile.maxPlayerSpeedRatio;
    const v = Math.min(this.effMoveSpeed * mul, cap);
    this.bot.body.setVelocity(Math.cos(away) * v, Math.sin(away) * v);
    // Keep facing the player so the next shot / telegraph aims correctly.
    this.facingAngle = Math.atan2(fy - this.bot.y, fx - this.bot.x);
  }

  /** Brain-facing stuck detection: trying to move but barely displacing. */
  private updateStuck(deltaMs: number, moving: boolean): void {
    if (!moving) {
      this.stuck = false;
      this.stuckAccumMs = 0;
      this.lastStuckX = this.bot.x;
      this.lastStuckY = this.bot.y;
      return;
    }
    const moved = Math.hypot(this.bot.x - this.lastStuckX, this.bot.y - this.lastStuckY);
    this.stuckAccumMs = moved < 4 ? this.stuckAccumMs + deltaMs : 0;
    this.stuck = this.stuckAccumMs > 600;
    this.lastStuckX = this.bot.x;
    this.lastStuckY = this.bot.y;
  }

  /** Short idle saunter around the spawn anchor so the bot never stands frozen. */
  private patrol(deltaMs: number): void {
    if (this.patrolPauseTimer > 0) {
      this.patrolPauseTimer -= deltaMs;
      this.bot.body.setVelocity(0, 0);
      return;
    }

    const pdx = this.patrolTarget.x - this.bot.x;
    const pdy = this.patrolTarget.y - this.bot.y;
    const pdist = Math.hypot(pdx, pdy);

    if (pdist < 12) {
      this.bot.body.setVelocity(0, 0);
      this.patrolPauseTimer = Phaser.Math.Between(this.cfg.patrolPauseMinMs, this.cfg.patrolPauseMaxMs);
      this.patrolTarget = this.pickPatrolTarget();
      return;
    }

    const angle = Math.atan2(pdy, pdx);
    const speed = this.effMoveSpeed * this.cfg.patrolSpeedMul;
    this.bot.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.facingAngle = angle;

    const spawnDist = Math.hypot(this.bot.x - this.cfg.spawn.x, this.bot.y - this.cfg.spawn.y);
    if (spawnDist > this.cfg.patrolRadius * 1.6) {
      this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
    }

    const moved = Math.hypot(this.bot.x - this.lastPatrolX, this.bot.y - this.lastPatrolY);
    this.stuckTimer = moved < 4 ? this.stuckTimer + deltaMs : 0;
    if (this.stuckTimer > 500) {
      this.stuckTimer = 0;
      this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
      this.patrolPauseTimer = this.cfg.patrolPauseMinMs;
    }
    this.lastPatrolX = this.bot.x;
    this.lastPatrolY = this.bot.y;
  }

  private pickPatrolTarget(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(30, this.cfg.patrolRadius);
    return {
      x: this.cfg.spawn.x + Math.cos(angle) * dist,
      y: this.cfg.spawn.y + Math.sin(angle) * dist,
    };
  }

  private resetPatrol(): void {
    this.patrolTarget = this.pickPatrolTarget();
    this.patrolPauseTimer = Phaser.Math.Between(200, 600);
    this.stuckTimer = 0;
    this.lastPatrolX = this.bot.x;
    this.lastPatrolY = this.bot.y;
    this.stuckAccumMs = 0;
    this.stuck = false;
    this.lastStuckX = this.bot.x;
    this.lastStuckY = this.bot.y;
  }

  private respawnBot(now: number): void {
    this.bot.reset();
    this.bot.showSpawnFeedback();
    this.respawnArmed = false;
    this.windupTimer = 0;
    this.recoveryTimer = 0;
    this.cooldownTimer = 0;
    this.castingSkill = null;
    this.skillMana = this.skillMaxMana;
    this.resetPatrol();
    this.brain.onRespawn(now);
  }

  /** Resolve a swing. Returns true if it connected. Damage only when in arc. */
  private resolveAttack(player: Player): boolean {
    this.bot.state = 'attack';
    const arc = testMeleeArc(
      this.bot.x,
      this.bot.y,
      this.facingAngle,
      player.x,
      player.y,
      PLAYER_RADIUS,
      this.attackRange,
      this.cfg.attackArcDegrees,
    );
    if (!arc.hit) return false;

    this.bot.showAttackFlash();
    const result = player.takeDamage(this.effAttack);
    this.hooks.onBotHitPlayer(result, player.x, player.y);
    return true;
  }

  /**
   * Fire the class normal-attack projectile for ranged BotPlayers (ranger →
   * arrow, mage → magic bolt, priest → holy bolt). Visual-only and auto-destroyed
   * by its tween — it never introduces a bot-only damage formula. Melee classes
   * spawn nothing.
   */
  private fireRangedProjectile(player: Player): void {
    const kind = this.projectileKind;
    if (!kind) return;
    const dist = Math.hypot(player.x - this.bot.x, player.y - this.bot.y);
    const travel = Math.min(Math.max(dist, 1), this.attackRange);
    showNormalAttackProjectile(
      this.scene,
      this.bot.x,
      this.bot.y,
      this.facingAngle,
      travel,
      kind,
      (o) => this.hooks.registerWorldObject(o),
    );
  }

  /**
   * Resolve a class skill cast (Phase 5A-7, MVP). Cooldown + mana are consumed
   * through the SAME SkillRuntimeSystem the human uses; the *effect* uses the
   * shared combat path — offensive skills deal `skill.damage` via the shared
   * `player.takeDamage` (CombatSystem) formula, the priest heal restores
   * `skill.heal` from the shared SKILLS definition. No bot-only damage/heal
   * numbers exist anywhere here. VFX reuse the player's skill visuals.
   */
  private resolveSkillCast(player: Player, skill: SkillDefinition): boolean {
    const res = this.skillRuntime.tryUseSkillForCaster(this.skillAction, this.skillMana);
    if (!res.ok) return false; // cooldown/mana not actually ready — abort cleanly
    this.skillMana = Math.max(0, this.skillMana - skill.manaCost);

    const reg = (o: Phaser.GameObjects.GameObject) => this.hooks.registerWorldObject(o);
    showSkillCastFlash(this.scene, this.bot.x, this.bot.y, reg);
    this.bot.showAttackFlash();
    this.skillCastCount += 1;

    if (skill.damage !== undefined) {
      // Offensive: readable cast visual toward the player + shared-formula damage.
      // Ranged skills fire a DISTINCT skill bolt (its own tag/colour) so it reads
      // as a skill, not a normal shot, and never pollutes normal-attack projectile
      // counts. Melee skills show a slash arc.
      if (this.attackKind === 'ranged' && this.projectileKind) {
        const dist = Math.hypot(player.x - this.bot.x, player.y - this.bot.y);
        const travel = Math.min(Math.max(dist, 1), this.skillRange);
        this.showSkillProjectile(this.facingAngle, travel, this.projectileKind, reg);
      } else {
        showSlashArc(this.scene, this.bot.x, this.bot.y, this.facingAngle, reg);
      }
      const dist = Math.hypot(player.x - this.bot.x, player.y - this.bot.y);
      let applied = 0;
      if (dist <= this.skillRange + PLAYER_RADIUS) {
        const result = player.takeDamage(skill.damage);
        this.hooks.onBotHitPlayer(result, player.x, player.y);
        applied = result.finalDamage;
      }
      this.lastSkillCast = { skillId: skill.id, rawAmount: skill.damage, applied, heal: false };
      return applied > 0; // whiff ⇒ recorded as a miss by the caller
    }
    if (skill.heal !== undefined) {
      // Defensive: heal self with the shared SKILLS heal value + player heal VFX.
      const healed = this.bot.heal(skill.heal);
      showHealBurst(this.scene, this.bot.x, this.bot.y, reg);
      showHealSpark(this.scene, this.bot.x, this.bot.y, reg);
      this.lastSkillCast = { skillId: skill.id, rawAmount: skill.heal, applied: healed, heal: true };
    }
    return true; // a heal / support cast never counts as a miss
  }

  /**
   * Distinct readable skill bolt (Phase 5A-7). Tagged `botSkillProjectile` (NOT
   * the normal-attack tag) so a woven skill reads as its own thing and never
   * inflates normal-attack projectile counts. Visual-only + self-destroying; the
   * damage already resolved through the shared combat path in resolveSkillCast.
   */
  private showSkillProjectile(
    angle: number,
    travel: number,
    kind: NormalAttackProjectileKind,
    register: (o: Phaser.GameObjects.GameObject) => void,
  ): void {
    const color = kind === 'arrow' ? 0xfcd34d : kind === 'magic_bolt' ? 0xa78bfa : 0xfde68a;
    const startX = this.bot.x;
    const startY = this.bot.y;
    const bolt = this.scene.add.circle(startX, startY, 9, color, 0.95).setDepth(94);
    bolt.setStrokeStyle(2, 0xffffff, 0.85);
    bolt.setData('botSkillProjectile', kind);
    register(bolt);
    this.scene.tweens.add({
      targets: bolt,
      x: startX + Math.cos(angle) * travel,
      y: startY + Math.sin(angle) * travel,
      duration: Math.max(120, Math.min(360, travel * 1.1)),
      ease: 'Quad.easeIn',
      onComplete: () => bolt.destroy(),
    });
  }

  /** Player basic/melee attack against this bot. Returns null when it misses. */
  public tryPlayerMeleeHit(
    casterX: number,
    casterY: number,
    facingAngle: number,
    range: number,
    rawDamage: number,
  ): PlayerMeleeHitResult | null {
    if (this.bot.isDead()) return null;
    const arc = testMeleeArc(casterX, casterY, facingAngle, this.bot.x, this.bot.y, this.bot.radius, range);
    if (!arc.hit) return null;
    const result = this.bot.takeDamage(rawDamage);
    this.brain.memory.recordDamageTaken(this.scene.time.now);
    return { result, x: this.bot.x, y: this.bot.y };
  }

  public isBotAlive(): boolean {
    return !this.bot.isDead();
  }

  public getBotState(): BotState {
    return this.bot.state;
  }

  public getBotSnapshot(): BotSnapshot {
    return {
      id: this.id,
      x: this.bot.x,
      y: this.bot.y,
      hp: this.bot.currentHp,
      maxHp: this.bot.maxHp,
      armor: this.bot.armor,
      attack: this.effAttack,
      classId: this.bot.classId,
      attackKind: this.attackKind,
      projectileKind: this.projectileKind,
      state: this.bot.state,
      goal: this.brain.currentGoal(),
      dead: this.bot.isDead(),
      detectionRange: this.effDetectionRange,
      attackRange: this.attackRange,
      moveSpeed: this.effMoveSpeed,
      speed: Math.hypot(this.bot.body.velocity.x, this.bot.body.velocity.y),
      difficulty: this.difficulty,
      respawnDelayMs: this.cfg.respawnDelayMs,
      spawnX: this.cfg.spawn.x,
      spawnY: this.cfg.spawn.y,
    };
  }

  public getBrainSnapshot(): BotBrainSnapshot {
    return this.brain.snapshot();
  }

  public getDifficultyInfo(): BotDifficultyInfo {
    return {
      difficulty: this.difficulty,
      available: Object.keys(BOT_PLAYER_DIFFICULTY_PROFILES) as BotDifficulty[],
      classId: this.classId,
      baseAttack: this.classStats.attack,
      effectiveAttack: this.effAttack,
      effectiveMoveSpeed: this.effMoveSpeed,
      effectiveWindupMs: this.effWindupMs,
      effectiveCooldownMs: this.effCooldownMs,
    };
  }

  /** Bot class baseline stats (read by value from the player class table). */
  public getClassBaseline(): HeroStats {
    return { ...this.classStats };
  }

  /**
   * Debug/test-only: rebuild this bot as a different playable class
   * (warrior/ranger/mage/priest). The bot stays one instance; the brain
   * memory/plan and timers are reset.
   *
   * Note: the fortress-wall collider added by MatchScene is not re-attached to
   * the rebuilt body (the bot only patrols/fights in the open lane, away from
   * walls), so this is intended for tests / future class-select that constructs
   * fresh — not a mid-fight production swap.
   */
  public debugSetClass(classId: HeroClassId): void {
    this.bot.destroy();
    this.buildBot(classId);
    this.windupTimer = 0;
    this.recoveryTimer = 0;
    this.cooldownTimer = 0;
    this.resetPatrol();
    this.brain.onRespawn(this.scene.time.now);
  }

  /** Debug-only difficulty swap for headless regression (not player-facing). */
  public debugSetDifficulty(difficulty: BotDifficulty): void {
    if (!BOT_PLAYER_DIFFICULTY_PROFILES[difficulty]) return;
    this.difficulty = difficulty;
    this.profile = BOT_PLAYER_DIFFICULTY_PROFILES[difficulty];
  }

  /** Debug-only damage hook for headless regression (not player-facing). */
  public debugDamageBot(amount: number): DamageResult {
    return this.bot.takeDamage(amount);
  }

  /** Debug-only: force/clear the stuck flag for headless regression. */
  public debugSetStuck(value: boolean | null): void {
    this.debugStuckOverride = value;
  }

  /** Debug-only: prime the attack cooldown so kite/hold spacing is observable. */
  public debugSetCooldown(ms: number): void {
    this.cooldownTimer = Math.max(0, ms);
  }

  /**
   * Class skill identity (Phase 5A-7). Proves the bot reads its skill from the
   * shared SKILLS table via the same SkillRuntimeSystem the player uses — the
   * `skillId` matches the human's class slot skill exactly.
   */
  public getSkillInfo(): {
    action: ActionKey;
    skillId: string | null;
    skillName: string | null;
    source: string;
    offensive: boolean;
    isHeal: boolean;
    range: number;
    manaCost: number;
    cooldownTotal: number;
    cooldownRemaining: number;
    mana: number;
    ready: boolean;
  } {
    const skill = this.classSkill ?? null;
    return {
      action: this.skillAction,
      skillId: skill?.id ?? null,
      skillName: skill?.name ?? null,
      source: 'shared:SKILLS+SkillRuntimeSystem',
      offensive: this.skillIsOffensive,
      isHeal: skill?.heal !== undefined,
      range: this.skillRange,
      manaCost: skill?.manaCost ?? 0,
      cooldownTotal: this.skillRuntime.getCooldownTotal(this.skillAction),
      cooldownRemaining: this.skillRuntime.getCooldownRemaining(this.skillAction),
      mana: Math.round(this.skillMana),
      ready: this.skillReady,
    };
  }

  /** Last-cast mirror (Phase 5A-7) for QA — count + the raw shared-def amount. */
  public getSkillCastDebug(): {
    casts: number;
    lastSkillId: string | null;
    lastRawAmount: number | null;
    lastApplied: number | null;
    lastWasHeal: boolean | null;
  } {
    return {
      casts: this.skillCastCount,
      lastSkillId: this.lastSkillCast?.skillId ?? null,
      lastRawAmount: this.lastSkillCast?.rawAmount ?? null,
      lastApplied: this.lastSkillCast?.applied ?? null,
      lastWasHeal: this.lastSkillCast?.heal ?? null,
    };
  }

  /** Class ranged-spacing bands (Phase 5A-6) — null for melee classes. */
  public getRangedSpacingInfo(): {
    isRanged: boolean;
    attackRange: number;
    spacing: RangedSpacingProfile | null;
  } {
    return {
      isRanged: this.attackKind === 'ranged',
      attackRange: this.attackRange,
      spacing: this.rangedSpacing,
    };
  }

  /** Debug-only: teleport the bot body for headless regression. */
  public debugTeleportBot(x: number, y: number): void {
    this.bot.sprite.setPosition(x, y);
    this.bot.body.reset(x, y);
  }

  public destroy(): void {
    this.bot.destroy();
  }
}
