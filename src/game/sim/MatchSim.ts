import { MANA_REGEN_PER_SECOND, PLAYER_RADIUS, PROJECTILE_HIT_RADIUS } from '../constants';
import { HEROES } from '../data/heroes';
import { DEFAULT_MELEE_ARC_DEGREES, segmentHitsCircle, testAoeCircle, testMeleeArc } from '../combat/HitShapes';
import { getSkillRuntimeType } from '../combat/SkillRuntimeType';
import { isVisualOnlyAoe } from '../combat/SkillPlaceholder';
import { CombatSystem } from '../systems/CombatSystem';
import { SkillRuntimeSystem } from '../systems/SkillRuntimeSystem';
import {
  BOT_PLAYER,
  DEFAULT_BOT_DIFFICULTY,
  MULTI_BOT_SEPARATION,
  resolveBotEncounter,
  type BotDifficulty,
  type BotEncounterId,
  type BotPlayerConfig,
} from '../data/bot-player-config';
import { skipsObjectiveDamage } from '../combat/SkillPlaceholder';
import { SIEGE_RUINS_GATE_BONUS } from '../data/siege-buff';
import {
  FINAL_MINUTE_THRESHOLD_SEC,
  MATCH_DURATION_SEC,
  resolveTimeUp,
  type MatchResolution,
} from '../data/match-rules';
import { PLAYER_TEAM } from '../constants';
import type { ActionKey, HeroClassId, InputState, MapDefinition, SkillDefinition } from '../types';
import { stepCircleMovement } from './MovementSim';
import { SimBot, type BotEmit, type BotSnapshot, type SimBotHooks } from './SimBot';
import { SimCapture, type CaptureEmit } from './SimCapture';
import { SimObjectives, type ObjectiveEmit } from './SimObjectives';

// Phase 6A/6C: headless match simulation for the 3D renderer path.
//
// Runs at a fixed tick (SIM_TICK_SECONDS) regardless of display refresh rate
// so movement/balance stay identical on 60Hz desktops and 120Hz phones. The
// renderer interpolates between the previous and current tick positions and
// drains `events` each frame for VFX/combat text.
//
// 6C ports MatchScene's player-vs-training-dummy combat 1:1 — same
// SkillRuntimeSystem (cooldown/mana), same HitShapes, same CombatSystem
// damage math, same skill data. Objectives and bots are 6D/6E scope.

export const SIM_TICK_SECONDS = 1 / 60;

// TrainingDummy constants (entities/TrainingDummy.ts values — that module
// pulls Phaser, so the numbers are mirrored here).
export const DUMMY_MAX_HP = 1000;
export const DUMMY_ARMOR = 10;
export const DUMMY_RADIUS = 28;
export const DUMMY_RESET_DELAY_SECONDS = 2;

export type NormalAttackBoltKind = 'arrow' | 'magic_bolt' | 'holy_bolt';

/** Same mapping as ui/CombatVfx.normalAttackProjectileKind (Phaser module). */
function normalAttackBoltKind(heroClass: HeroClassId): NormalAttackBoltKind | null {
  switch (heroClass) {
    case 'ranger': return 'arrow';
    case 'mage': return 'magic_bolt';
    case 'priest': return 'holy_bolt';
    default: return null;
  }
}

export interface PlayerSimState {
  x: number;
  y: number;
  /** Position at the previous tick, for render interpolation. */
  prevX: number;
  prevY: number;
  radius: number;
  facingAngle: number;
  moveSpeed: number;
  heroClass: HeroClassId;
  heroName: string;
  moving: boolean;
  maxHp: number;
  currentHp: number;
  maxMana: number;
  currentMana: number;
  attack: number;
  armor: number;
  attackRange: number;
  /** Extra gate damage multiplier from the class kit (guardian). */
  gateDamageBonus?: number;
}

export interface DummySimState {
  x: number;
  y: number;
  radius: number;
  maxHp: number;
  currentHp: number;
  armor: number;
  dead: boolean;
  resetRemaining: number;
}

export interface ProjectileSimState {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  traveled: number;
  maxRange: number;
  hitRadius: number;
  damage: number;
  skillId: string;
  skillName: string;
  impactAoeRadius?: number;
  visual: 'arrow' | 'fireball';
}

/** One-shot happenings for the render/UI layer, drained once per frame. */
export type SimEvent =
  | { type: 'attackSwing'; x: number; y: number; facing: number; range: number; bolt: NormalAttackBoltKind | null }
  | { type: 'slash'; x: number; y: number; facing: number }
  | { type: 'castFlash'; x: number; y: number }
  | { type: 'dummyHit'; x: number; y: number }
  | { type: 'impactBurst'; x: number; y: number }
  | { type: 'aoeMarker'; x: number; y: number; radius: number; kind: 'damage' | 'heal' }
  | { type: 'damageNumber'; x: number; y: number; amount: number }
  | { type: 'heal'; x: number; y: number; amount: number }
  | { type: 'denied'; reason: 'mana' | 'cooldown' }
  | { type: 'dummyKilled' }
  | { type: 'dummyReset' }
  // Phase 6D: bot-side events (bots hit the player, player hits bots).
  | { type: 'playerHurt'; x: number; y: number; amount: number }
  | BotEmit
  // Phase 6E: objectives / capture / match flow.
  | ObjectiveEmit
  | CaptureEmit
  | { type: 'finalMinute' }
  | { type: 'timeUp' }
  | { type: 'matchOver'; resolution: MatchResolution };

/** Phase 6D: match setup — which bots to spawn (mirrors MatchSceneData). */
export interface MatchSimOptions {
  /** Multi-bot encounter preset id. Overrides `botClass` when set. */
  encounter?: BotEncounterId;
  /** Single-bot class when no encounter is given (defaults to warrior). */
  botClass?: HeroClassId;
  /** Bot difficulty (default normal). */
  difficulty?: BotDifficulty;
}

const DELTA_MS = SIM_TICK_SECONDS * 1000;

/** 2D MatchScene delay between "Time Up" and the Result screen. */
const TIME_UP_RESULT_DELAY_MS = 1300;

export class MatchSim {
  public readonly map: MapDefinition;
  public readonly player: PlayerSimState;
  public readonly dummy: DummySimState;
  public readonly skillRuntime: SkillRuntimeSystem;
  /** One-shot events since the last drain (renderer calls drainEvents()). */
  public readonly events: SimEvent[] = [];
  /** Last combat outcome string (debug overlay parity with 2D). */
  public lastCombatResult = '-';
  /** Total simulated ticks (debug overlay / determinism checks). */
  public tickCount = 0;

  private projectiles: ProjectileSimState[] = [];
  private nextProjectileId = 1;

  /** Phase 6D: AI-controlled enemy bots. */
  public readonly bots: SimBot[] = [];
  /** Sim clock in ms (monotonic) — the bot AI's time source. */
  public clockMs = 0;

  // Phase 6E: objectives / capture / match flow.
  public readonly objectives: SimObjectives;
  public readonly capture: SimCapture;
  /** Countdown, ms. Mirrors MatchTimerSystem. */
  public timerRemainingMs = MATCH_DURATION_SEC * 1000;
  public matchResolved = false;
  public matchResolution: MatchResolution | null = null;
  private finalMinuteShown = false;
  /** Delay between time-up and the matchOver event (2D: 1300ms to Result). */
  private matchOverCountdownMs = -1;

  constructor(map: MapDefinition, heroClass: HeroClassId = 'warrior', options: MatchSimOptions = {}) {
    this.map = map;
    const hero = HEROES[heroClass];
    this.player = {
      x: map.playerSpawn.x,
      y: map.playerSpawn.y,
      prevX: map.playerSpawn.x,
      prevY: map.playerSpawn.y,
      radius: PLAYER_RADIUS,
      facingAngle: -Math.PI / 2, // spawn facing the enemy base (up / -y)
      moveSpeed: hero.stats.moveSpeed,
      heroClass,
      heroName: hero.name,
      moving: false,
      maxHp: hero.stats.hp,
      currentHp: hero.stats.hp,
      maxMana: hero.stats.mana,
      currentMana: hero.stats.mana,
      attack: hero.stats.attack,
      armor: hero.stats.armor,
      attackRange: hero.stats.attackRange,
      gateDamageBonus: hero.stats.gateDamageBonus,
    };
    // Same placement as MatchScene: 350 north of the player spawn.
    this.dummy = {
      x: map.playerSpawn.x,
      y: map.playerSpawn.y - 350,
      radius: DUMMY_RADIUS,
      maxHp: DUMMY_MAX_HP,
      currentHp: DUMMY_MAX_HP,
      armor: DUMMY_ARMOR,
      dead: false,
      resetRemaining: 0,
    };
    this.skillRuntime = new SkillRuntimeSystem(heroClass);

    this.capture = new SimCapture((e) => this.events.push(e));
    this.objectives = new SimObjectives({
      emit: (e) => this.events.push(e),
      onMatchEnd: (outcome) => this.handleCoreMatchEnd(outcome),
      getSiegeGateBonus: (team) => (this.capture.siegeBuffActive(team) ? SIEGE_RUINS_GATE_BONUS : 0),
    });

    this.spawnBots(options);
  }

  /** Core destroyed → decide the match (mirrors MatchScene.handleMatchEnd). */
  private handleCoreMatchEnd(outcome: 'victory' | 'defeat'): void {
    if (this.matchResolved) return;
    this.matchResolved = true;
    this.matchResolution = {
      outcome,
      reason: outcome === 'victory' ? 'enemy_core_destroyed' : 'friendly_core_destroyed',
      blueScore: this.capture.getTeamScore('blue'),
      redScore: this.capture.getTeamScore('red'),
      blueCoreHp: this.objectives.getCoreHp('blue'),
      redCoreHp: this.objectives.getCoreHp('red'),
    };
    this.events.push({ type: 'matchOver', resolution: this.matchResolution });
  }

  /** Timer expired with no Core down → score / core-HP / draw resolution. */
  private resolveTimeUpNow(): void {
    if (this.matchResolved) return;
    if (this.objectives.getMatchPhase() !== 'in_progress') return;

    this.matchResolved = true;
    this.objectives.freeze();
    this.matchResolution = resolveTimeUp({
      playerTeam: PLAYER_TEAM,
      blueScore: this.capture.getTeamScore('blue'),
      redScore: this.capture.getTeamScore('red'),
      blueCoreHp: this.objectives.getCoreHp('blue'),
      redCoreHp: this.objectives.getCoreHp('red'),
    });
    this.events.push({ type: 'timeUp' });
    this.matchOverCountdownMs = TIME_UP_RESULT_DELAY_MS;
  }

  /** Build the bot roster from the encounter preset or a single class. */
  private spawnBots(options: MatchSimOptions): void {
    const difficulty = options.difficulty ?? DEFAULT_BOT_DIFFICULTY;
    const hooks: SimBotHooks = {
      damagePlayer: (raw) => this.damagePlayer(raw),
      emit: (e: BotEmit) => this.events.push(e),
      now: () => this.clockMs,
    };

    let configs: BotPlayerConfig[];
    if (options.encounter) {
      configs = resolveBotEncounter(options.encounter).map((m) => ({
        ...BOT_PLAYER,
        classId: m.classId,
        spawn: { x: BOT_PLAYER.spawn.x + m.spawnOffset.x, y: BOT_PLAYER.spawn.y + m.spawnOffset.y },
      }));
    } else {
      configs = [{ ...BOT_PLAYER, classId: options.botClass ?? 'warrior' }];
    }

    configs.forEach((cfg, i) => {
      this.bots.push(new SimBot(cfg, hooks, difficulty, `bot-${i}`));
    });
  }

  /** Bot landed a hit — apply shared-formula damage to the player. */
  private damagePlayer(rawDamage: number): void {
    const result = CombatSystem.applyDamage(this.player, rawDamage);
    this.events.push({ type: 'playerHurt', x: this.player.x, y: this.player.y, amount: result.finalDamage });
    this.lastCombatResult = `Enemy hit you ${result.finalDamage}`;
  }

  public getBots(): BotSnapshot[] {
    return this.bots.map((b) => b.snapshot());
  }

  public getProjectiles(): readonly ProjectileSimState[] {
    return this.projectiles;
  }

  public drainEvents(): SimEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** Advance the world by exactly one fixed tick. */
  public tick(input: InputState): void {
    this.clockMs += DELTA_MS;
    const p = this.player;
    p.prevX = p.x;
    p.prevY = p.y;

    p.moving = input.moveX !== 0 || input.moveY !== 0;
    if (p.moving) {
      p.facingAngle = Math.atan2(input.moveY, input.moveX);
    }

    stepCircleMovement(p, input.moveX, input.moveY, p.moveSpeed, SIM_TICK_SECONDS, this.map.walls, this.map);

    // Mana regen + cooldowns (same rates as MatchScene.update).
    if (p.currentMana < p.maxMana) {
      p.currentMana = Math.min(p.maxMana, p.currentMana + MANA_REGEN_PER_SECOND * SIM_TICK_SECONDS);
    }
    this.skillRuntime.update(SIM_TICK_SECONDS);

    this.updateDummyReset();

    // Combat inputs are ignored once the match is decided (MatchScene guard).
    const matchActive = !this.matchResolved && this.objectives.getMatchPhase() === 'in_progress';
    if (matchActive) {
      if (input.attackPressed) this.handleAttack();
      if (input.skill1Pressed) this.handleSkill('skill1');
      if (input.skill2Pressed) this.handleSkill('skill2');
      if (input.skill3Pressed) this.handleSkill('skill3');
      if (input.ultimatePressed) this.handleSkill('ultimate');
      this.updateBots();
    }
    this.updateProjectiles();

    // Phase 6E match flow — same order as MatchScene.update: objectives →
    // capture → timer → time-up resolution (Core result wins a same-tick race).
    this.objectives.update(DELTA_MS);
    this.capture.update(DELTA_MS, p.x, p.y, PLAYER_TEAM);

    if (!this.matchResolved && this.objectives.getMatchPhase() === 'in_progress') {
      this.timerRemainingMs = Math.max(0, this.timerRemainingMs - DELTA_MS);
      if (
        !this.finalMinuteShown &&
        this.timerRemainingMs > 0 &&
        this.timerRemainingMs <= FINAL_MINUTE_THRESHOLD_SEC * 1000
      ) {
        this.finalMinuteShown = true;
        this.events.push({ type: 'finalMinute' });
      }
      if (this.timerRemainingMs <= 0) {
        this.resolveTimeUpNow();
      }
    }

    // Deferred time-up → matchOver beat (2D: delayedCall to ResultScene).
    if (this.matchOverCountdownMs >= 0) {
      this.matchOverCountdownMs -= DELTA_MS;
      if (this.matchOverCountdownMs < 0 && this.matchResolution) {
        this.events.push({ type: 'matchOver', resolution: this.matchResolution });
      }
    }

    this.tickCount += 1;
  }

  public getRemainingSeconds(): number {
    return Math.ceil(this.timerRemainingMs / 1000);
  }

  /**
   * Drive every bot for this tick in the 2D manager's order: each thinks + sets
   * its desired velocity, then separation post-processes, then all integrate.
   */
  private updateBots(): void {
    if (this.bots.length === 0) return;
    for (const bot of this.bots) bot.think(DELTA_MS, this.player);

    if (MULTI_BOT_SEPARATION.enabled && this.bots.length > 1) {
      const samples = this.bots.map((b) => b.separationSample());
      this.bots.forEach((b, i) => b.applySeparation(i, samples, MULTI_BOT_SEPARATION));
    }

    for (const bot of this.bots) bot.integrate(SIM_TICK_SECONDS, this.map.walls, this.map);
  }

  /** Test a player hit shape against all live bots; emits numbers + updates result. */
  private damageBotsInArc(cx: number, cy: number, facing: number, range: number, arcDeg: number, raw: number): boolean {
    let any = false;
    for (const bot of this.bots) {
      const res = bot.tryPlayerHit(cx, cy, facing, range, arcDeg, raw);
      if (!res) continue;
      any = true;
      this.events.push({ type: 'damageNumber', x: bot.x, y: bot.y, amount: res.finalDamage });
      this.lastCombatResult = res.killed ? `Enemy down (${res.finalDamage})` : `Hit ${res.finalDamage}`;
    }
    return any;
  }

  private damageBotsInCircle(cx: number, cy: number, radius: number, raw: number): boolean {
    let any = false;
    for (const bot of this.bots) {
      const res = bot.tryPlayerCircleHit(cx, cy, radius, raw);
      if (!res) continue;
      any = true;
      this.events.push({ type: 'damageNumber', x: bot.x, y: bot.y, amount: res.finalDamage });
      this.lastCombatResult = res.killed ? `Enemy down (${res.finalDamage})` : `Hit ${res.finalDamage}`;
    }
    return any;
  }

  // --- normal attack (MatchScene.handleAttack minus objectives/bots) -------

  private handleAttack(): void {
    const p = this.player;
    this.events.push({
      type: 'attackSwing',
      x: p.x,
      y: p.y,
      facing: p.facingAngle,
      range: p.attackRange,
      bolt: normalAttackBoltKind(p.heroClass),
    });

    const arc = testMeleeArc(
      p.x, p.y, p.facingAngle,
      this.dummy.x, this.dummy.y, this.dummy.radius,
      p.attackRange, DEFAULT_MELEE_ARC_DEGREES,
    );

    let hit = false;
    if (arc.hit && !this.dummy.dead) {
      const result = this.applyDamageToDummy(p.attack);
      this.lastCombatResult = `Attack hit ${result}`;
      hit = true;
    }
    if (this.damageBotsInArc(p.x, p.y, p.facingAngle, p.attackRange, DEFAULT_MELEE_ARC_DEGREES, p.attack)) hit = true;

    const objResult = this.objectives.applyMeleeArcDamage({
      ownerTeam: PLAYER_TEAM,
      casterX: p.x,
      casterY: p.y,
      facingAngle: p.facingAngle,
      range: p.attackRange,
      rawDamage: p.attack,
      playerGateDamageBonus: p.gateDamageBonus,
    });
    if (objResult) {
      this.lastCombatResult = `Attack hit objective ${objResult.finalDamage}`;
      hit = true;
    }

    if (!hit) this.lastCombatResult = 'Attack missed';
  }

  // --- skills (MatchScene.handleSkill/applySkillCombatEffect port) ---------

  private handleSkill(action: ActionKey): void {
    const skill = this.skillRuntime.getSkillForAction(action);
    const result = this.skillRuntime.tryUseSkillForCaster(action, this.player.currentMana);

    if (!result.ok || !skill) {
      if (result.reason === 'cooldown' || result.reason === 'mana') {
        this.events.push({ type: 'denied', reason: result.reason });
        this.lastCombatResult = result.reason === 'mana' ? 'Not enough mana' : 'Skill on cooldown';
      }
      return;
    }

    this.player.currentMana -= skill.manaCost;
    this.events.push({ type: 'castFlash', x: this.player.x, y: this.player.y });

    switch (getSkillRuntimeType(skill)) {
      case 'melee_arc': this.applyMeleeArcSkill(skill); return;
      case 'projectile': this.applyProjectileSkill(skill); return;
      case 'aoe_circle': this.applyAoeCircleSkill(skill); return;
      case 'heal': this.applyHealSkill(skill); return;
      default: this.applyLegacySkill(skill);
    }
  }

  private applyMeleeArcSkill(skill: SkillDefinition): void {
    const p = this.player;
    const range = skill.range ?? skill.radius ?? p.attackRange;
    const arcDegrees = skill.arc ?? DEFAULT_MELEE_ARC_DEGREES;

    if (skill.damage === undefined) {
      this.lastCombatResult = `${skill.name} missed`;
      return;
    }

    this.events.push({ type: 'slash', x: p.x, y: p.y, facing: p.facingAngle });

    const arc = testMeleeArc(
      p.x, p.y, p.facingAngle,
      this.dummy.x, this.dummy.y, this.dummy.radius,
      range, arcDegrees,
    );
    let hit = false;
    if (arc.hit && !this.dummy.dead) {
      const dealt = this.applyDamageToDummy(skill.damage);
      this.lastCombatResult = `${skill.name} hit ${dealt}`;
      hit = true;
    }
    if (this.damageBotsInArc(p.x, p.y, p.facingAngle, range, arcDegrees, skill.damage)) hit = true;

    if (!skipsObjectiveDamage(skill.id)) {
      const objResult = this.objectives.applyMeleeArcDamage({
        ownerTeam: PLAYER_TEAM,
        casterX: p.x,
        casterY: p.y,
        facingAngle: p.facingAngle,
        range,
        arcDegrees,
        rawDamage: skill.damage,
        skillGateDamageBonus: skill.gateDamageBonus,
        playerGateDamageBonus: p.gateDamageBonus,
      });
      if (objResult) {
        this.lastCombatResult = `${skill.name} hit objective ${objResult.finalDamage}`;
        hit = true;
      }
    }

    if (!hit) this.lastCombatResult = `${skill.name} missed`;
  }

  private applyProjectileSkill(skill: SkillDefinition): void {
    if (skill.damage === undefined || skill.projectileSpeed === undefined || skill.range === undefined) {
      this.lastCombatResult = `${skill.name} failed`;
      return;
    }
    const p = this.player;
    this.projectiles.push({
      id: this.nextProjectileId++,
      x: p.x,
      y: p.y,
      prevX: p.x,
      prevY: p.y,
      velocityX: Math.cos(p.facingAngle) * skill.projectileSpeed,
      velocityY: Math.sin(p.facingAngle) * skill.projectileSpeed,
      angle: p.facingAngle,
      traveled: 0,
      maxRange: skill.range,
      hitRadius: PROJECTILE_HIT_RADIUS,
      damage: skill.damage,
      skillId: skill.id,
      skillName: skill.name,
      impactAoeRadius: skill.radius,
      visual: skill.id === 'mage_fireball' ? 'fireball' : 'arrow',
    });
    this.lastCombatResult = `${skill.name} fired`;
  }

  private applyAoeCircleSkill(skill: SkillDefinition): void {
    const p = this.player;
    const radius = skill.radius ?? 100;
    const selfCentered = skill.id === 'priest_holy_circle' || skill.id === 'guardian_war_taunt';
    const center = selfCentered
      ? { x: p.x, y: p.y }
      : {
          x: p.x + Math.cos(p.facingAngle) * (skill.range ?? radius),
          y: p.y + Math.sin(p.facingAngle) * (skill.range ?? radius),
        };

    const isHealMarker = skill.healPerSecond !== undefined || skill.id === 'priest_holy_circle';
    this.events.push({ type: 'aoeMarker', x: center.x, y: center.y, radius, kind: isHealMarker ? 'heal' : 'damage' });

    if (isVisualOnlyAoe(skill.id)) {
      this.lastCombatResult = `${skill.name} placeholder`;
      return;
    }

    if (skill.healPerSecond !== undefined || (skill.id === 'priest_holy_circle' && skill.heal === undefined)) {
      const healed = this.healPlayer(skill.healPerSecond ?? 45);
      this.lastCombatResult = healed > 0 ? `${skill.name} +${healed}` : `${skill.name} (HP full)`;
      return;
    }

    const rawDamage = skill.damage ?? skill.damagePerSecond ?? 0;
    if (rawDamage <= 0) {
      this.lastCombatResult = `used ${skill.name}`;
      return;
    }

    const circle = testAoeCircle(center.x, center.y, radius, this.dummy.x, this.dummy.y, this.dummy.radius);
    let hit = false;
    if (circle.hit && !this.dummy.dead) {
      this.events.push({ type: 'impactBurst', x: center.x, y: center.y });
      const dealt = this.applyDamageToDummy(rawDamage);
      this.lastCombatResult = `${skill.name} hit ${dealt}`;
      hit = true;
    }
    if (this.damageBotsInCircle(center.x, center.y, radius, rawDamage)) {
      if (!hit) this.events.push({ type: 'impactBurst', x: center.x, y: center.y });
      hit = true;
    }

    if (!skipsObjectiveDamage(skill.id)) {
      const objResult = this.objectives.applyAoeDamage({
        ownerTeam: PLAYER_TEAM,
        centerX: center.x,
        centerY: center.y,
        radius,
        rawDamage,
        skillGateDamageBonus: skill.gateDamageBonus,
        playerGateDamageBonus: p.gateDamageBonus,
      });
      if (objResult) {
        this.lastCombatResult = `${skill.name} hit ${objResult.finalDamage} objective`;
        hit = true;
      }
    }

    if (!hit) this.lastCombatResult = `${skill.name} missed`;
  }

  private applyHealSkill(skill: SkillDefinition): void {
    if (skill.heal === undefined) {
      this.lastCombatResult = `used ${skill.name}`;
      return;
    }
    const healed = this.healPlayer(skill.heal);
    this.lastCombatResult = healed > 0 ? `${skill.name} +${healed}` : `${skill.name} (HP full)`;
  }

  private applyLegacySkill(skill: SkillDefinition): void {
    if (skill.damage !== undefined) {
      const range = skill.range ?? 160;
      const dist = Math.hypot(this.dummy.x - this.player.x, this.dummy.y - this.player.y);
      let hit = false;
      if (!this.dummy.dead && dist <= range + this.dummy.radius) {
        const dealt = this.applyDamageToDummy(skill.damage);
        this.lastCombatResult = `${skill.name} hit ${dealt}`;
        hit = true;
      }
      // Legacy range check vs bots: circle centred on the player.
      if (this.damageBotsInCircle(this.player.x, this.player.y, range, skill.damage)) hit = true;

      if (!skipsObjectiveDamage(skill.id)) {
        const objResult = this.objectives.applyRangeDamage({
          ownerTeam: PLAYER_TEAM,
          casterX: this.player.x,
          casterY: this.player.y,
          range,
          rawDamage: skill.damage,
          skillGateDamageBonus: skill.gateDamageBonus,
          playerGateDamageBonus: this.player.gateDamageBonus,
        });
        if (objResult) {
          this.lastCombatResult = `${skill.name} hit objective ${objResult.finalDamage}`;
          hit = true;
        }
      }

      if (!hit) this.lastCombatResult = `${skill.name} missed`;
      return;
    }
    if (skill.heal !== undefined) {
      this.applyHealSkill(skill);
      return;
    }
    this.lastCombatResult = `used ${skill.name}`;
  }

  // --- shared combat helpers ------------------------------------------------

  /** Damage the dummy via the shared armor formula; emits hit VFX + number
   * events. Returns the final (post-armor) damage. */
  private applyDamageToDummy(rawDamage: number): number {
    const result = CombatSystem.applyDamage(this.dummy, rawDamage);
    this.events.push({ type: 'dummyHit', x: this.dummy.x, y: this.dummy.y });
    this.events.push({ type: 'damageNumber', x: this.dummy.x, y: this.dummy.y, amount: result.finalDamage });
    if (result.killed && !this.dummy.dead) {
      this.dummy.dead = true;
      this.dummy.resetRemaining = DUMMY_RESET_DELAY_SECONDS;
      this.events.push({ type: 'dummyKilled' });
    }
    return result.finalDamage;
  }

  private healPlayer(amount: number): number {
    const p = this.player;
    const before = p.currentHp;
    p.currentHp = Math.min(p.maxHp, p.currentHp + amount);
    const healed = p.currentHp - before;
    if (healed > 0) {
      this.events.push({ type: 'heal', x: p.x, y: p.y, amount: healed });
    }
    return healed;
  }

  private updateDummyReset(): void {
    if (!this.dummy.dead) return;
    this.dummy.resetRemaining -= SIM_TICK_SECONDS;
    if (this.dummy.resetRemaining <= 0) {
      this.dummy.dead = false;
      this.dummy.currentHp = this.dummy.maxHp;
      this.dummy.resetRemaining = 0;
      this.events.push({ type: 'dummyReset' });
      this.lastCombatResult = 'Dummy reset';
    }
  }

  /** Port of ProjectileSystem.update + MatchScene.handleProjectileHit
   * (dummy path; objective segments are 6E scope). */
  private updateProjectiles(): void {
    const remaining: ProjectileSimState[] = [];

    for (const proj of this.projectiles) {
      proj.prevX = proj.x;
      proj.prevY = proj.y;
      const stepX = proj.velocityX * SIM_TICK_SECONDS;
      const stepY = proj.velocityY * SIM_TICK_SECONDS;
      proj.x += stepX;
      proj.y += stepY;
      proj.traveled += Math.hypot(stepX, stepY);

      let destroyed = false;

      if (!this.dummy.dead) {
        const hitRadius = proj.hitRadius + this.dummy.radius;
        if (segmentHitsCircle(proj.prevX, proj.prevY, proj.x, proj.y, this.dummy.x, this.dummy.y, hitRadius)) {
          this.events.push({ type: 'dummyHit', x: proj.x, y: proj.y });
          if (proj.impactAoeRadius !== undefined && proj.impactAoeRadius > 0) {
            this.events.push({ type: 'impactBurst', x: proj.x, y: proj.y });
            const circle = testAoeCircle(
              proj.x, proj.y, proj.impactAoeRadius,
              this.dummy.x, this.dummy.y, this.dummy.radius,
            );
            if (circle.hit) {
              const dealt = this.applyDamageToDummy(proj.damage);
              this.lastCombatResult = `${proj.skillName} hit ${dealt}`;
            } else {
              this.lastCombatResult = `${proj.skillName} missed`;
            }
          } else {
            const dealt = this.applyDamageToDummy(proj.damage);
            this.lastCombatResult = `${proj.skillName} hit ${dealt}`;
          }
          destroyed = true;
        }
      }

      // Bots: swept segment vs each live bot. First bot struck consumes the
      // projectile; an impact-AoE projectile also splashes bots in radius.
      if (!destroyed) {
        for (const bot of this.bots) {
          if (!bot.hitRadiusOverlaps(proj.prevX, proj.prevY, proj.x, proj.y, proj.hitRadius)) continue;
          this.events.push({ type: 'hitSpark', x: proj.x, y: proj.y });
          if (proj.impactAoeRadius !== undefined && proj.impactAoeRadius > 0) {
            this.events.push({ type: 'impactBurst', x: proj.x, y: proj.y });
            this.damageBotsInCircle(proj.x, proj.y, proj.impactAoeRadius, proj.damage);
            // 2D parity: an impact AoE also splashes objectives in radius.
            if (!skipsObjectiveDamage(proj.skillId)) {
              this.objectives.applyAoeDamage({
                ownerTeam: PLAYER_TEAM,
                centerX: proj.x,
                centerY: proj.y,
                radius: proj.impactAoeRadius,
                rawDamage: proj.damage,
              });
            }
          } else {
            const res = bot.applyDamage(proj.damage);
            this.events.push({ type: 'damageNumber', x: bot.x, y: bot.y, amount: res.finalDamage });
            this.lastCombatResult = res.killed ? `Enemy down (${res.finalDamage})` : `${proj.skillName} hit ${res.finalDamage}`;
          }
          destroyed = true;
          break;
        }
      }

      // Objectives: swept segment vs gates/cores (2D ProjectileSystem's
      // checkObjectiveSegment). Damages inside, consumes the projectile —
      // including a blocked splash off a protected core.
      if (!destroyed) {
        const objHit = this.objectives.handleProjectileSegmentHit(
          PLAYER_TEAM, proj.prevX, proj.prevY, proj.x, proj.y, proj.hitRadius, proj.damage,
        );
        if (objHit.hit) {
          this.events.push({ type: 'hitSpark', x: proj.x, y: proj.y });
          if (objHit.result) {
            this.lastCombatResult = `${proj.skillName} hit objective ${objHit.result.finalDamage}`;
          }
          destroyed = true;
        }
      }

      if (!destroyed && proj.traveled >= proj.maxRange) {
        destroyed = true;
      }

      if (!destroyed) remaining.push(proj);
    }

    this.projectiles = remaining;
  }
}
