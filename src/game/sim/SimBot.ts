import { PLAYER_RADIUS } from '../constants';
import { testMeleeArc } from '../combat/HitShapes';
import { CombatSystem } from '../systems/CombatSystem';
import { getHero } from '../data/heroes';
import { BotBrain } from '../ai/BotBrain';
import { buildPerception } from '../ai/BotPerception';
import { BOT_BRAIN_CONFIG } from '../data/bot-brain-config';
import { BotPlayerController, type BotAttackKind, type BotIntent } from '../controllers/BotPlayerController';
import { SkillRuntimeSystem } from '../systems/SkillRuntimeSystem';
import {
  BOT_PLAYER,
  BOT_PLAYER_DIFFICULTY_PROFILES,
  BOT_RANGED_SPACING,
  BOT_SKILL,
  DEFAULT_BOT_DIFFICULTY,
  type BotDifficulty,
  type BotDifficultyProfile,
  type BotPlayerConfig,
  type MultiBotSeparationConfig,
  type RangedSpacingProfile,
} from '../data/bot-player-config';
import type { BotState } from '../entities/BotPlayer';
import type { ActionKey, DamageResult, HeroClassId, HeroStats, SkillDefinition, WallRect } from '../types';
import { stepCircleMovement, type WorldBounds } from './MovementSim';

// Phase 6D: headless port of systems/BotUnit for the 3D renderer path.
//
// The *thinking* is unchanged: it reuses BotBrain, buildPerception,
// BotPlayerController, and SkillRuntimeSystem exactly as the 2D BotUnit does —
// only the *doing* is ported off Phaser. Instead of a Phaser Arcade body it
// keeps its own (x, y) and integrates movement through the same
// stepCircleMovement + WallRect collision the player uses (so the bot slides on
// walls identically). Instead of tween VFX it emits SimEvents the renderer
// draws. Stat baseline is read BY VALUE from the shared class table; difficulty
// multipliers are bot-only — player stats/formula are untouched.

/** Class label shown on the enemy nameplate (matches BotUnit). */
const CLASS_DISPLAY_NAME: Record<HeroClassId, string> = {
  guardian: 'Enemy Guardian',
  warrior: 'Enemy Warrior',
  ranger: 'Enemy Ranger',
  mage: 'Enemy Mage',
  priest: 'Enemy Priest',
};

const RANGED_CLASSES = new Set<HeroClassId>(['ranger', 'mage', 'priest']);

export type BotBoltKind = 'arrow' | 'magic_bolt' | 'holy_bolt';
function boltKind(classId: HeroClassId): BotBoltKind | null {
  switch (classId) {
    case 'ranger': return 'arrow';
    case 'mage': return 'magic_bolt';
    case 'priest': return 'holy_bolt';
    default: return null;
  }
}

/** Read-only view of a bot for the renderer + player-combat targeting. */
export interface BotSnapshot {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  radius: number;
  facingAngle: number;
  classId: HeroClassId;
  name: string;
  maxHp: number;
  currentHp: number;
  state: BotState;
  dead: boolean;
  isRanged: boolean;
}

/** Callbacks the owning MatchSim provides. */
export interface SimBotHooks {
  /** Bot landed a hit on the player — apply damage through the shared formula. */
  damagePlayer: (rawDamage: number, x: number, y: number) => void;
  /** Emit a transient combat effect for the renderer. */
  emit: (event: BotEmit) => void;
  /** Sim clock in ms (monotonic). */
  now: () => number;
}

/** Bot-side one-shot render events (merged into MatchSim's SimEvent stream). */
export type BotEmit =
  | { type: 'botCastFlash'; x: number; y: number }
  | { type: 'botSlash'; x: number; y: number; facing: number }
  | { type: 'botBolt'; x: number; y: number; facing: number; travel: number; kind: BotBoltKind; skill: boolean }
  | { type: 'botHeal'; x: number; y: number; amount: number }
  | { type: 'hitSpark'; x: number; y: number };

export class SimBot {
  public readonly id: string;
  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  public readonly radius: number;
  public facingAngle = 0;
  public state: BotState = 'idle';

  public readonly classId: HeroClassId;
  public readonly name: string;
  public maxHp: number;
  public currentHp: number;
  public readonly armor: number;
  public dead = false;

  private readonly cfg: BotPlayerConfig;
  private readonly hooks: SimBotHooks;
  private readonly profile: BotDifficultyProfile;
  private readonly classStats: HeroStats;
  private readonly attackRange: number;
  private readonly brain: BotBrain;
  private readonly controller: BotPlayerController;
  private readonly skillRuntime: SkillRuntimeSystem;
  private readonly classSkill: SkillDefinition | undefined;
  private readonly skillAction: ActionKey = BOT_SKILL.action;
  private skillMana: number;
  private readonly skillMaxMana: number;
  private castingSkill: SkillDefinition | null = null;

  // Desired velocity for this tick (px/s); integrated after separation.
  private vx = 0;
  private vy = 0;

  private windupTimer = 0;
  private recoveryTimer = 0;
  private cooldownTimer = 0;
  private respawnTimer = 0;
  private respawnArmed = false;

  private patrolTarget: { x: number; y: number };
  private patrolPauseTimer = 0;

  private stuckAccumMs = 0;
  private lastStuckX = 0;
  private lastStuckY = 0;
  private stuck = false;

  private sepVelX = 0;
  private sepVelY = 0;

  constructor(
    cfg: BotPlayerConfig,
    hooks: SimBotHooks,
    difficulty: BotDifficulty = DEFAULT_BOT_DIFFICULTY,
    id = 'bot-0',
  ) {
    this.cfg = cfg;
    this.hooks = hooks;
    this.id = id;
    this.classId = cfg.classId;
    this.name = CLASS_DISPLAY_NAME[cfg.classId] ?? cfg.name;
    this.profile = BOT_PLAYER_DIFFICULTY_PROFILES[difficulty];

    this.classStats = { ...getHero(cfg.classId).stats };
    this.attackRange = this.classStats.attackRange;
    this.armor = this.classStats.armor;
    this.maxHp = Math.max(1, Math.round(this.classStats.hp * this.profile.hpMul));
    this.currentHp = this.maxHp;

    this.skillRuntime = new SkillRuntimeSystem(cfg.classId);
    this.classSkill = this.skillRuntime.getSkillForAction(this.skillAction);
    this.skillMaxMana = this.classStats.mana;
    this.skillMana = this.classStats.mana;

    this.brain = new BotBrain(BOT_BRAIN_CONFIG);
    this.controller = new BotPlayerController();

    this.x = cfg.spawn.x;
    this.y = cfg.spawn.y;
    this.prevX = cfg.spawn.x;
    this.prevY = cfg.spawn.y;
    this.radius = cfg.radius;
    this.patrolTarget = this.pickPatrolTarget();
    this.lastStuckX = this.x;
    this.lastStuckY = this.y;
  }

  // --- effective (class baseline × difficulty) stats — bot-only ---
  private get effMoveSpeed(): number { return this.classStats.moveSpeed * this.profile.speedMul; }
  private get effAttack(): number { return Math.max(1, Math.round(this.classStats.attack * this.profile.attackMul)); }
  private get effWindupMs(): number { return this.cfg.windupMs * this.profile.windupMul; }
  private get effCooldownMs(): number { return this.cfg.attackCooldownMs * this.profile.cooldownMul; }

  private get isRanged(): boolean { return RANGED_CLASSES.has(this.classId); }
  private get attackKind(): BotAttackKind { return this.isRanged ? 'ranged' : 'melee'; }
  private get effDetectionRange(): number { return Math.max(this.cfg.detectionRange, this.attackRange + 80); }
  private get effLeashRange(): number { return Math.max(this.cfg.leashRange, this.attackRange + 180); }
  private get rangedSpacing(): RangedSpacingProfile | null { return BOT_RANGED_SPACING[this.classId] ?? null; }

  private get skillIsOffensive(): boolean { return this.classSkill?.damage !== undefined; }
  private get skillRange(): number { return this.classSkill?.range ?? this.attackRange; }
  private get skillReady(): boolean {
    return !!this.classSkill && this.skillRuntime.canUseSkill(this.skillAction, this.skillMana);
  }

  public snapshot(): BotSnapshot {
    return {
      id: this.id, x: this.x, y: this.y, prevX: this.prevX, prevY: this.prevY,
      radius: this.radius, facingAngle: this.facingAngle, classId: this.classId, name: this.name,
      maxHp: this.maxHp, currentHp: this.currentHp, state: this.state, dead: this.dead, isRanged: this.isRanged,
    };
  }

  /**
   * Think + resolve combat for this tick. Sets the desired velocity but does
   * NOT move — MatchSim applies separation, then calls integrate(). Faithful
   * port of BotUnit.update() sans Phaser body/VFX/scene clock.
   */
  public think(deltaMs: number, player: { x: number; y: number; moveSpeed: number }): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.vx = 0;
    this.vy = 0;
    const now = this.hooks.now();

    if (this.dead) {
      if (!this.respawnArmed) { this.respawnTimer = this.cfg.respawnDelayMs; this.respawnArmed = true; }
      this.respawnTimer -= deltaMs;
      if (this.respawnTimer <= 0) this.respawn(now);
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaMs);
    const deltaSeconds = deltaMs / 1000;
    this.skillRuntime.update(deltaSeconds);
    this.skillMana = Math.min(this.skillMaxMana, this.skillMana + BOT_SKILL.manaRegenPerSecond * deltaSeconds);

    // 1) Perceive → think (brain is a pure advisor).
    const spacing = this.rangedSpacing;
    const perception = buildPerception({
      botX: this.x, botY: this.y, playerX: player.x, playerY: player.y,
      spawnX: this.cfg.spawn.x, spawnY: this.cfg.spawn.y,
      detectionRange: this.effDetectionRange, attackRange: this.attackRange, leashRange: this.effLeashRange,
      isRanged: this.isRanged,
      dangerCloseRange: spacing?.dangerCloseRange ?? 0,
      preferredMinRange: spacing?.preferredMinRange ?? 0,
      preferredMaxRange: spacing?.preferredMaxRange ?? 0,
      hpRatio: this.currentHp / this.maxHp,
      cooldownReady: this.cooldownTimer <= 0,
      isStuck: this.stuck, state: this.state, matchActive: true,
      prevDistanceToPlayer: this.brain.memory.prevDistanceToPlayer,
      motionDeadband: BOT_BRAIN_CONFIG.motionDeadband,
      skillReady: this.skillReady, skillIsOffensive: this.skillIsOffensive,
      skillRange: this.skillRange, defensiveHpRatio: BOT_SKILL.defensiveHpRatio,
    });
    this.brain.tick(perception, now, deltaMs);

    // 2) The combat sub-sequence runs to completion regardless of the goal.
    if (this.state === 'windup') {
      this.windupTimer -= deltaMs;
      if (this.windupTimer <= 0) {
        if (this.castingSkill) {
          const hit = this.resolveSkillCast(player, this.castingSkill);
          this.castingSkill = null;
          this.brain.memory.recordAttack(now);
          if (!hit) this.brain.memory.recordMissedAttack(now);
        } else {
          this.fireRangedBolt(player, false);
          const hit = this.resolveAttack(player);
          this.brain.memory.recordAttack(now);
          if (!hit) this.brain.memory.recordMissedAttack(now);
        }
        this.state = 'recovery';
        this.recoveryTimer = this.cfg.recoveryMs;
        this.cooldownTimer = this.effCooldownMs;
      }
      this.updateStuck(deltaMs, false);
      return;
    }
    if (this.state === 'recovery') {
      this.recoveryTimer -= deltaMs;
      if (this.recoveryTimer <= 0) this.state = 'idle';
      this.updateStuck(deltaMs, false);
      return;
    }

    // 3) Brain goal → controller intent → execute with shared verbs.
    const intent = this.controller.intentFor(this.brain.currentGoal(), perception, {
      playerX: player.x, playerY: player.y, spawnX: this.cfg.spawn.x, spawnY: this.cfg.spawn.y,
      investigateTarget: this.brain.investigateTarget(),
      attackKind: this.attackKind, projectileKind: null, skillId: this.classSkill?.id ?? null,
    });
    this.executeIntent(intent, perception, player, deltaMs);
  }

  private executeIntent(
    intent: BotIntent,
    p: ReturnType<typeof buildPerception>,
    player: { x: number; y: number; moveSpeed: number },
    deltaMs: number,
  ): void {
    switch (intent.kind) {
      case 'engage': {
        this.state = 'chase';
        if (p.playerInAttackRange) {
          this.facingAngle = p.angleToPlayer;
          if (intent.basicAttack && this.cooldownTimer <= 0) this.beginWindup();
          this.updateStuck(deltaMs, false);
        } else {
          this.seekTo(player.x, player.y, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        }
        break;
      }
      case 'seek': {
        this.state = 'idle';
        const tx = intent.targetX ?? this.x;
        const ty = intent.targetY ?? this.y;
        if (Math.hypot(this.x - tx, this.y - ty) > BOT_BRAIN_CONFIG.investigateArriveRadius) {
          this.seekTo(tx, ty, player.moveSpeed);
          this.updateStuck(deltaMs, true);
        } else {
          this.updateStuck(deltaMs, false);
        }
        break;
      }
      case 'patrol': {
        this.state = 'idle';
        this.patrol(deltaMs);
        this.updateStuck(deltaMs, false);
        break;
      }
      case 'cast_skill': {
        this.state = 'chase';
        this.facingAngle = p.angleToPlayer;
        if (this.classSkill && this.skillReady) { this.castingSkill = this.classSkill; this.beginWindup(); }
        this.updateStuck(deltaMs, false);
        break;
      }
      case 'kite': {
        this.state = 'chase';
        this.kiteAwayFrom(intent.targetX ?? player.x, intent.targetY ?? player.y, player.moveSpeed);
        this.updateStuck(deltaMs, true);
        break;
      }
      case 'hold': {
        if (intent.basicAttack && p.playerInAttackRange) {
          this.state = 'chase';
          this.facingAngle = p.angleToPlayer;
          if (this.cooldownTimer <= 0) this.beginWindup();
          this.updateStuck(deltaMs, false);
        } else {
          this.state = 'idle';
          this.updateStuck(deltaMs, false);
        }
        break;
      }
      default: {
        this.state = 'idle';
        this.updateStuck(deltaMs, false);
        break;
      }
    }
  }

  private beginWindup(): void {
    this.state = 'windup';
    this.windupTimer = this.effWindupMs;
  }

  private seekTo(tx: number, ty: number, playerMoveSpeed: number): void {
    const angle = Math.atan2(ty - this.y, tx - this.x);
    const cap = playerMoveSpeed * this.profile.maxPlayerSpeedRatio;
    const v = Math.min(this.effMoveSpeed, cap);
    this.vx = Math.cos(angle) * v;
    this.vy = Math.sin(angle) * v;
    this.facingAngle = angle;
  }

  private kiteAwayFrom(fx: number, fy: number, playerMoveSpeed: number): void {
    const away = Math.atan2(this.y - fy, this.x - fx);
    const mul = this.rangedSpacing?.kiteSpeedMul ?? 1;
    const cap = playerMoveSpeed * this.profile.maxPlayerSpeedRatio;
    const v = Math.min(this.effMoveSpeed * mul, cap);
    this.vx = Math.cos(away) * v;
    this.vy = Math.sin(away) * v;
    this.facingAngle = Math.atan2(fy - this.y, fx - this.x);
  }

  private patrol(deltaMs: number): void {
    if (this.patrolPauseTimer > 0) { this.patrolPauseTimer -= deltaMs; return; }
    const pdx = this.patrolTarget.x - this.x;
    const pdy = this.patrolTarget.y - this.y;
    const pdist = Math.hypot(pdx, pdy);
    if (pdist < 12) {
      this.patrolPauseTimer = randBetween(this.cfg.patrolPauseMinMs, this.cfg.patrolPauseMaxMs);
      this.patrolTarget = this.pickPatrolTarget();
      return;
    }
    const angle = Math.atan2(pdy, pdx);
    const speed = this.effMoveSpeed * this.cfg.patrolSpeedMul;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.facingAngle = angle;

    const spawnDist = Math.hypot(this.x - this.cfg.spawn.x, this.y - this.cfg.spawn.y);
    if (spawnDist > this.cfg.patrolRadius * 1.6) {
      this.patrolTarget = { x: this.cfg.spawn.x, y: this.cfg.spawn.y };
    }
  }

  private pickPatrolTarget(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist = randBetween(30, this.cfg.patrolRadius);
    return { x: this.cfg.spawn.x + Math.cos(angle) * dist, y: this.cfg.spawn.y + Math.sin(angle) * dist };
  }

  private updateStuck(deltaMs: number, moving: boolean): void {
    if (!moving) {
      this.stuck = false; this.stuckAccumMs = 0;
      this.lastStuckX = this.x; this.lastStuckY = this.y;
      return;
    }
    const moved = Math.hypot(this.x - this.lastStuckX, this.y - this.lastStuckY);
    this.stuckAccumMs = moved < 4 ? this.stuckAccumMs + deltaMs : 0;
    this.stuck = this.stuckAccumMs > 600;
    this.lastStuckX = this.x; this.lastStuckY = this.y;
  }

  private respawn(now: number): void {
    this.dead = false;
    this.state = 'idle';
    this.currentHp = this.maxHp;
    this.x = this.cfg.spawn.x; this.y = this.cfg.spawn.y;
    this.prevX = this.x; this.prevY = this.y;
    this.respawnArmed = false;
    this.windupTimer = 0; this.recoveryTimer = 0; this.cooldownTimer = 0;
    this.castingSkill = null; this.skillMana = this.skillMaxMana;
    this.stuck = false; this.stuckAccumMs = 0;
    this.sepVelX = 0; this.sepVelY = 0;
    this.patrolTarget = this.pickPatrolTarget();
    this.brain.onRespawn(now);
  }

  /** Resolve a swing. Returns true if it connected. */
  private resolveAttack(player: { x: number; y: number }): boolean {
    this.state = 'attack';
    const arc = testMeleeArc(this.x, this.y, this.facingAngle, player.x, player.y, PLAYER_RADIUS, this.attackRange, this.cfg.attackArcDegrees);
    if (!arc.hit) return false;
    this.hooks.damagePlayer(this.effAttack, player.x, player.y);
    return true;
  }

  private fireRangedBolt(player: { x: number; y: number }, skill: boolean): void {
    const kind = boltKind(this.classId);
    if (!kind) return;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const travel = Math.min(Math.max(dist, 1), skill ? this.skillRange : this.attackRange);
    this.hooks.emit({ type: 'botBolt', x: this.x, y: this.y, facing: this.facingAngle, travel, kind, skill });
  }

  private resolveSkillCast(player: { x: number; y: number }, skill: SkillDefinition): boolean {
    const res = this.skillRuntime.tryUseSkillForCaster(this.skillAction, this.skillMana);
    if (!res.ok) return false;
    this.skillMana = Math.max(0, this.skillMana - skill.manaCost);
    this.hooks.emit({ type: 'botCastFlash', x: this.x, y: this.y });

    if (skill.damage !== undefined) {
      if (this.isRanged) this.fireRangedBolt(player, true);
      else this.hooks.emit({ type: 'botSlash', x: this.x, y: this.y, facing: this.facingAngle });
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist <= this.skillRange + PLAYER_RADIUS) {
        this.hooks.damagePlayer(skill.damage, player.x, player.y);
        return true;
      }
      return false; // whiff → recorded as a miss
    }
    if (skill.heal !== undefined) {
      const before = this.currentHp;
      this.currentHp = Math.min(this.maxHp, this.currentHp + skill.heal);
      this.hooks.emit({ type: 'botHeal', x: this.x, y: this.y, amount: this.currentHp - before });
    }
    return true;
  }

  /** Player attack landed on this bot. Applies shared-formula damage. */
  public tryPlayerHit(casterX: number, casterY: number, facing: number, range: number, arcDeg: number, rawDamage: number): DamageResult | null {
    if (this.dead) return null;
    const arc = testMeleeArc(casterX, casterY, facing, this.x, this.y, this.radius, range, arcDeg);
    if (!arc.hit) return null;
    return this.applyDamage(rawDamage);
  }

  /** Player AoE / projectile-impact hit test (circle). */
  public tryPlayerCircleHit(cx: number, cy: number, radius: number, rawDamage: number): DamageResult | null {
    if (this.dead) return null;
    if (Math.hypot(this.x - cx, this.y - cy) > radius + this.radius) return null;
    return this.applyDamage(rawDamage);
  }

  public hitRadiusOverlaps(x1: number, y1: number, x2: number, y2: number, hitRadius: number): boolean {
    if (this.dead) return false;
    // Delegate to the same swept test the projectile system uses.
    const r = hitRadius + this.radius;
    // Closest point on segment to bot centre.
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((this.x - x1) * dx + (this.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(this.x - (x1 + t * dx), this.y - (y1 + t * dy)) <= r;
  }

  public applyDamage(rawDamage: number): DamageResult {
    const result = CombatSystem.applyDamage(this, rawDamage);
    this.brain.memory.recordDamageTaken(this.hooks.now());
    this.hooks.emit({ type: 'hitSpark', x: this.x, y: this.y });
    if (result.killed && !this.dead) {
      this.dead = true;
      this.state = 'dead';
    }
    return result;
  }

  // --- movement integration (called by MatchSim after separation) ---

  /** Phase 5B-2 separation port: soft push off neighbours, before integrate(). */
  public applySeparation(selfIndex: number, samples: ReadonlyArray<{ x: number; y: number; isRanged: boolean; alive: boolean }>, cfg: MultiBotSeparationConfig): void {
    if (this.dead || this.state === 'windup' || this.state === 'recovery' || this.brain.currentGoal() === 'return_to_spawn') {
      this.sepVelX = 0; this.sepVelY = 0; return;
    }
    let px = 0, py = 0;
    for (let i = 0; i < samples.length; i++) {
      if (i === selfIndex) continue;
      const n = samples[i];
      if (!n.alive) continue;
      const dx = this.x - n.x, dy = this.y - n.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0.0001) { px += selfIndex < i ? 1 : -1; continue; }
      if (dist >= cfg.radius) continue;
      const proximity = (cfg.radius - dist) / cfg.radius;
      const bias = this.isRanged && !n.isRanged ? cfg.rangedVsMeleeBias : 1;
      px += (dx / dist) * proximity * bias;
      py += (dy / dist) * proximity * bias;
    }
    const mag = Math.hypot(px, py);
    let targetX = 0, targetY = 0;
    if (mag > 0.0001) {
      const yieldMul = this.isRanged ? cfg.rangedYieldMul : cfg.meleeYieldMul;
      const pushSpeed = Math.min(cfg.maxPush, cfg.strength * this.effMoveSpeed * mag) * yieldMul;
      targetX = (px / mag) * pushSpeed;
      targetY = (py / mag) * pushSpeed;
    }
    this.sepVelX += (targetX - this.sepVelX) * cfg.smoothing;
    this.sepVelY += (targetY - this.sepVelY) * cfg.smoothing;
    if (Math.hypot(this.sepVelX, this.sepVelY) < cfg.restThreshold) { this.sepVelX = 0; this.sepVelY = 0; return; }
    // Strip outward-from-spawn component at the leash edge.
    const sdx = this.x - this.cfg.spawn.x, sdy = this.y - this.cfg.spawn.y;
    const sdist = Math.hypot(sdx, sdy);
    if (sdist >= this.effLeashRange && sdist > 0) {
      const radial = (this.sepVelX * sdx + this.sepVelY * sdy) / sdist;
      if (radial > 0) { this.sepVelX -= (sdx / sdist) * radial; this.sepVelY -= (sdy / sdist) * radial; }
    }
    this.vx += this.sepVelX;
    this.vy += this.sepVelY;
    // Clamp total to the fair move speed.
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.effMoveSpeed && speed > 0) {
      this.vx = (this.vx / speed) * this.effMoveSpeed;
      this.vy = (this.vy / speed) * this.effMoveSpeed;
    }
  }

  /** Move by the desired velocity with wall + world-bound collision. */
  public integrate(dt: number, walls: readonly WallRect[], bounds: WorldBounds): void {
    if (this.dead || (this.vx === 0 && this.vy === 0)) return;
    // speed=1 so stepCircleMovement translates by (vx*dt, vy*dt) with the same
    // per-axis wall slide + world clamp the player uses.
    stepCircleMovement(this, this.vx, this.vy, 1, dt, walls, bounds);
  }

  public separationSample(): { x: number; y: number; isRanged: boolean; alive: boolean } {
    return { x: this.x, y: this.y, isRanged: this.isRanged, alive: !this.dead };
  }
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export { BOT_PLAYER };
