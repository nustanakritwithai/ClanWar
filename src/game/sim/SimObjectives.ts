import { DEFAULT_MELEE_ARC_DEGREES, segmentHitsCircle, testAoeCircle, testMeleeArc } from '../combat/HitShapes';
import { CombatSystem } from '../systems/CombatSystem';
import {
  OBJECTIVE_DEFINITIONS,
  type MatchObjectivePhase,
  type ObjectiveCombatState,
  type ObjectiveDefinition,
  type ObjectiveId,
  type ObjectiveKind,
  type PlayerObjectivePriority,
} from '../data/objectives';
import { SIEGE_RUINS_GATE_BONUS } from '../data/siege-buff';
import type { DamageResult, TeamId } from '../types';

// Phase 6E: headless port of systems/ObjectiveSystem for the 3D renderer path.
//
// The Gate/Core state machines, protected-core rule, unified gate damage
// pipeline (player bonus × skill bonus × siege bonus, rounded once), priority
// prompt and win/lose flow are copied 1:1 from the 2D system — only the
// Phaser scene/texture/HUD/tween halves are dropped in favour of emitted
// events the 3D layer draws. The match-end delay is counted in sim ticks
// (update(deltaMs)) instead of scene.time.delayedCall.

const UNDER_ATTACK_TIMEOUT_MS = 2000;
const MATCH_END_DELAY_MS = 500;
const PROTECTED_FEEDBACK_COOLDOWN_MS = 2000;

export const PRIORITY_LABELS: Record<PlayerObjectivePriority, string> = {
  attack_gate: 'Attack the Gate',
  attack_core: 'Destroy the Core',
  defend_core: 'Defend your Core',
  victory: 'Victory',
};

interface RuntimeObjective {
  def: ObjectiveDefinition;
  combatState: ObjectiveCombatState;
  currentHp: number;
  underAttackTimerMs: number;
  shownGateBreachedFeedback: boolean;
  shownCoreOpenFeedback: boolean;
}

export interface SimObjectiveSnapshot {
  id: ObjectiveId;
  type: ObjectiveKind;
  team: TeamId;
  x: number;
  y: number;
  radius: number;
  currentHp: number;
  maxHp: number;
  combatState: ObjectiveCombatState;
}

/** One-shot objective happenings for the render/HUD layer. */
export type ObjectiveEmit =
  | { type: 'objectiveHit'; id: ObjectiveId; kind: ObjectiveKind; x: number; y: number; amount: number }
  | { type: 'objectiveDestroyed'; id: ObjectiveId; kind: ObjectiveKind; x: number; y: number }
  | { type: 'objectiveFeedback'; x: number; y: number; message: string; color: string }
  | { type: 'priorityChanged'; priority: PlayerObjectivePriority; label: string };

export interface SimObjectivesHooks {
  emit: (event: ObjectiveEmit) => void;
  /** Core destroyed → the match is decided (called after MATCH_END_DELAY_MS). */
  onMatchEnd: (outcome: 'victory' | 'defeat') => void;
  /** Siege Ruins gate-damage bonus for the attacking team (0 or 0.3). */
  getSiegeGateBonus: (attackerTeam: TeamId) => number;
}

export interface ObjectiveMeleeContext {
  ownerTeam: TeamId;
  casterX: number;
  casterY: number;
  facingAngle: number;
  range: number;
  arcDegrees?: number;
  rawDamage: number;
  skillGateDamageBonus?: number;
  playerGateDamageBonus?: number;
}

export interface ObjectiveAoeContext {
  ownerTeam: TeamId;
  centerX: number;
  centerY: number;
  radius: number;
  rawDamage: number;
  skillGateDamageBonus?: number;
  playerGateDamageBonus?: number;
}

export class SimObjectives {
  private readonly hooks: SimObjectivesHooks;
  private readonly objectives = new Map<ObjectiveId, RuntimeObjective>();
  private matchPhase: MatchObjectivePhase = 'in_progress';
  private ended = false;
  private priority: PlayerObjectivePriority = 'attack_gate';
  private protectedFeedbackCooldownMs = 0;
  private matchEndCountdownMs = -1;
  private pendingOutcome: 'victory' | 'defeat' | null = null;

  constructor(hooks: SimObjectivesHooks) {
    this.hooks = hooks;
    for (const def of OBJECTIVE_DEFINITIONS) {
      this.objectives.set(def.id, {
        def,
        combatState: def.type === 'gate' ? 'intact' : 'protected',
        currentHp: def.maxHp,
        underAttackTimerMs: 0,
        shownGateBreachedFeedback: false,
        shownCoreOpenFeedback: false,
      });
    }
  }

  public update(deltaMs: number): void {
    if (this.protectedFeedbackCooldownMs > 0) {
      this.protectedFeedbackCooldownMs = Math.max(0, this.protectedFeedbackCooldownMs - deltaMs);
    }

    // Deferred core-destroyed match end (MatchScene used a 500ms delayedCall).
    if (this.matchEndCountdownMs >= 0) {
      this.matchEndCountdownMs -= deltaMs;
      if (this.matchEndCountdownMs < 0 && this.pendingOutcome) {
        const outcome = this.pendingOutcome;
        this.pendingOutcome = null;
        this.hooks.onMatchEnd(outcome);
      }
    }

    if (this.ended || this.matchPhase !== 'in_progress') return;

    for (const obj of this.objectives.values()) {
      if (obj.combatState !== 'under_attack') continue;
      obj.underAttackTimerMs -= deltaMs;
      if (obj.underAttackTimerMs <= 0 && obj.combatState === 'under_attack') {
        obj.combatState = obj.def.type === 'gate' ? 'intact' : 'vulnerable';
        obj.underAttackTimerMs = 0;
      }
    }
  }

  public getMatchPhase(): MatchObjectivePhase {
    return this.matchPhase;
  }

  public getCoreHp(team: TeamId): number {
    const core = this.objectives.get(team === 'blue' ? 'blueCore' : 'redCore');
    return core ? core.currentHp : 0;
  }

  /** Halt combat without declaring a Core result (external time-up decision). */
  public freeze(): void {
    this.ended = true;
    this.matchEndCountdownMs = -1;
    this.pendingOutcome = null;
  }

  public getPriority(): PlayerObjectivePriority {
    return this.priority;
  }

  public getPriorityLabel(): string {
    return PRIORITY_LABELS[this.priority];
  }

  public getSnapshots(): SimObjectiveSnapshot[] {
    return [...this.objectives.values()].map((obj) => ({
      id: obj.def.id,
      type: obj.def.type,
      team: obj.def.team,
      x: obj.def.x,
      y: obj.def.y,
      radius: obj.def.radius,
      currentHp: obj.currentHp,
      maxHp: obj.def.maxHp,
      combatState: obj.combatState,
    }));
  }

  // --- player-damage entry points (same shapes/order as the 2D system) -----

  public applyMeleeArcDamage(ctx: ObjectiveMeleeContext): DamageResult | null {
    if (this.ended || this.matchPhase !== 'in_progress') return null;

    const hits: RuntimeObjective[] = [];
    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      const arc = testMeleeArc(
        ctx.casterX, ctx.casterY, ctx.facingAngle,
        obj.def.x, obj.def.y, obj.def.radius,
        ctx.range, ctx.arcDegrees ?? DEFAULT_MELEE_ARC_DEGREES,
      );
      if (arc.hit) hits.push(obj);
    }

    const damageables = hits.filter((obj) => this.canReceiveDamage(obj));
    const damageTarget =
      damageables.find((obj) => obj.def.type === 'gate') ?? damageables[damageables.length - 1] ?? null;

    if (damageTarget) {
      const raw = this.computeRawDamage(
        damageTarget, ctx.rawDamage, ctx.ownerTeam,
        ctx.skillGateDamageBonus, ctx.playerGateDamageBonus,
      );
      return this.applyDamageToObjective(damageTarget, raw, ctx.ownerTeam);
    }

    const protectedCore = hits.find((obj) => this.isProtectedCore(obj));
    if (protectedCore) this.showProtectedCoreFeedback(protectedCore);
    return null;
  }

  public applyAoeDamage(ctx: ObjectiveAoeContext): DamageResult | null {
    if (this.ended || this.matchPhase !== 'in_progress') return null;

    let last: DamageResult | null = null;
    let protectedCoreHit: RuntimeObjective | null = null;

    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      const circle = testAoeCircle(ctx.centerX, ctx.centerY, ctx.radius, obj.def.x, obj.def.y, obj.def.radius);
      if (!circle.hit) continue;

      if (this.canReceiveDamage(obj)) {
        const raw = this.computeRawDamage(
          obj, ctx.rawDamage, ctx.ownerTeam,
          ctx.skillGateDamageBonus, ctx.playerGateDamageBonus,
        );
        const result = this.applyDamageToObjective(obj, raw, ctx.ownerTeam);
        if (result) last = result;
      } else if (this.isProtectedCore(obj)) {
        protectedCoreHit = obj;
      }
    }

    if (protectedCoreHit) this.showProtectedCoreFeedback(protectedCoreHit);
    return last;
  }

  /** Legacy caster-centred range check (2D applyRangeDamage port). */
  public applyRangeDamage(ctx: {
    ownerTeam: TeamId;
    casterX: number;
    casterY: number;
    range: number;
    rawDamage: number;
    skillGateDamageBonus?: number;
    playerGateDamageBonus?: number;
  }): DamageResult | null {
    if (this.ended || this.matchPhase !== 'in_progress') return null;

    let protectedCoreHit: RuntimeObjective | null = null;

    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      const dist = Math.hypot(obj.def.x - ctx.casterX, obj.def.y - ctx.casterY);
      if (dist > ctx.range + obj.def.radius) continue;

      if (this.canReceiveDamage(obj)) {
        const raw = this.computeRawDamage(
          obj, ctx.rawDamage, ctx.ownerTeam,
          ctx.skillGateDamageBonus, ctx.playerGateDamageBonus,
        );
        return this.applyDamageToObjective(obj, raw, ctx.ownerTeam);
      }
      if (this.isProtectedCore(obj)) protectedCoreHit = obj;
    }

    if (protectedCoreHit) this.showProtectedCoreFeedback(protectedCoreHit);
    return null;
  }

  /**
   * Swept projectile segment vs objectives (2D handleProjectileSegmentHit
   * port). Returns hit=true when the projectile should be consumed — either it
   * damaged an objective or splashed off a protected core.
   */
  public handleProjectileSegmentHit(
    ownerTeam: TeamId,
    x1: number, y1: number, x2: number, y2: number,
    hitRadius: number,
    rawDamage: number,
  ): { hit: boolean; objectiveId?: ObjectiveId; result?: DamageResult; blocked?: boolean } {
    if (this.ended || this.matchPhase !== 'in_progress') return { hit: false };

    for (const obj of this.enemyObjectives(ownerTeam)) {
      if (!this.canReceiveDamage(obj)) continue;
      const combined = hitRadius + obj.def.radius;
      if (segmentHitsCircle(x1, y1, x2, y2, obj.def.x, obj.def.y, combined)) {
        const raw = this.computeRawDamage(obj, rawDamage, ownerTeam);
        const result = this.applyDamageToObjective(obj, raw, ownerTeam);
        if (result) return { hit: true, objectiveId: obj.def.id, result };
      }
    }

    for (const obj of this.enemyObjectives(ownerTeam)) {
      if (!this.isProtectedCore(obj)) continue;
      const combined = hitRadius + obj.def.radius;
      if (segmentHitsCircle(x1, y1, x2, y2, obj.def.x, obj.def.y, combined)) {
        this.showProtectedCoreFeedback(obj);
        return { hit: true, objectiveId: obj.def.id, blocked: true };
      }
    }

    return { hit: false };
  }

  /** Verification hook — direct damage without hit-shape checks (2D debugDealDamage). */
  public debugDealDamage(objectiveId: ObjectiveId, rawDamage: number, attackerTeam: TeamId = 'red'): DamageResult | null {
    const obj = this.objectives.get(objectiveId);
    if (!obj || obj.combatState === 'destroyed') return null;
    if (obj.def.team === attackerTeam) return null;
    const raw = this.computeRawDamage(obj, rawDamage, attackerTeam);
    return this.applyDamageToObjective(obj, raw, attackerTeam, true);
  }

  // --- internals (1:1 with the 2D system minus visuals) ---------------------

  private enemyObjectives(ownerTeam: TeamId): RuntimeObjective[] {
    return [...this.objectives.values()].filter((obj) => obj.def.team !== ownerTeam);
  }

  private isProtectedCore(obj: RuntimeObjective): boolean {
    return obj.def.type === 'core' && obj.combatState === 'protected';
  }

  private canReceiveDamage(obj: RuntimeObjective): boolean {
    if (obj.combatState === 'destroyed') return false;
    if (obj.def.type === 'core' && obj.combatState === 'protected') return false;
    return true;
  }

  private computeRawDamage(
    obj: RuntimeObjective,
    baseDamage: number,
    attackerTeam: TeamId,
    skillGateBonus?: number,
    playerGateBonus?: number,
  ): number {
    let raw = baseDamage;
    if (obj.def.type === 'gate' && obj.def.team !== attackerTeam) {
      raw *= 1 + (playerGateBonus ?? 0);
      if (skillGateBonus) raw *= 1 + skillGateBonus;
      const siegeBonus = this.hooks.getSiegeGateBonus(attackerTeam);
      if (siegeBonus > 0) raw *= 1 + siegeBonus;
    }
    return Math.round(raw);
  }

  private applyDamageToObjective(
    obj: RuntimeObjective,
    rawDamage: number,
    attackerTeam: TeamId,
    bypassProtection = false,
  ): DamageResult | null {
    if (obj.def.team === attackerTeam) return null;
    if (!bypassProtection && !this.canReceiveDamage(obj)) {
      if (this.isProtectedCore(obj)) this.showProtectedCoreFeedback(obj);
      return null;
    }
    if (obj.combatState === 'destroyed') return null;

    const combatTarget = { currentHp: obj.currentHp, maxHp: obj.def.maxHp, armor: obj.def.armor };
    const result = CombatSystem.applyDamage(combatTarget, rawDamage);
    obj.currentHp = combatTarget.currentHp;

    this.enterUnderAttack(obj);
    this.hooks.emit({
      type: 'objectiveHit',
      id: obj.def.id, kind: obj.def.type,
      x: obj.def.x, y: obj.def.y,
      amount: result.finalDamage,
    });

    if (result.killed) this.setDestroyed(obj);
    return result;
  }

  private enterUnderAttack(obj: RuntimeObjective): void {
    if (obj.combatState === 'destroyed') return;
    if (obj.def.type === 'gate') {
      obj.combatState = 'under_attack';
    } else if (obj.combatState === 'vulnerable' || obj.combatState === 'under_attack') {
      obj.combatState = 'under_attack';
    }
    obj.underAttackTimerMs = UNDER_ATTACK_TIMEOUT_MS;
  }

  private setDestroyed(obj: RuntimeObjective): void {
    obj.combatState = 'destroyed';
    obj.currentHp = 0;
    obj.underAttackTimerMs = 0;
    this.hooks.emit({
      type: 'objectiveDestroyed',
      id: obj.def.id, kind: obj.def.type,
      x: obj.def.x, y: obj.def.y,
    });

    if (obj.def.type === 'gate') {
      this.onGateDestroyed(obj.def.team);
      this.refreshPriority();
      if (obj.def.team === 'red' && !obj.shownGateBreachedFeedback) {
        obj.shownGateBreachedFeedback = true;
        this.hooks.emit({
          type: 'objectiveFeedback',
          x: obj.def.x, y: obj.def.y - 48,
          message: 'Gate Breached', color: '#fbbf24',
        });
      }
    } else if (obj.def.id === 'redCore') {
      this.endMatch('victory');
    } else if (obj.def.id === 'blueCore') {
      this.endMatch('defeat');
    }
  }

  private onGateDestroyed(team: TeamId): void {
    const coreId: ObjectiveId = team === 'red' ? 'redCore' : 'blueCore';
    const core = this.objectives.get(coreId);
    if (!core || core.combatState !== 'protected') return;
    core.combatState = 'vulnerable';
    this.refreshPriority();
    if (team === 'red' && !core.shownCoreOpenFeedback) {
      core.shownCoreOpenFeedback = true;
      this.hooks.emit({
        type: 'objectiveFeedback',
        x: core.def.x, y: core.def.y - 48,
        message: 'Core is open', color: '#f4d35e',
      });
    }
  }

  private endMatch(outcome: 'victory' | 'defeat'): void {
    if (this.matchPhase !== 'in_progress') return;
    this.matchPhase = outcome;
    this.priority = 'victory';
    this.hooks.emit({ type: 'priorityChanged', priority: this.priority, label: PRIORITY_LABELS[this.priority] });
    this.pendingOutcome = outcome;
    this.matchEndCountdownMs = MATCH_END_DELAY_MS;
  }

  private showProtectedCoreFeedback(obj: RuntimeObjective): void {
    if (this.protectedFeedbackCooldownMs > 0) return;
    this.protectedFeedbackCooldownMs = PROTECTED_FEEDBACK_COOLDOWN_MS;
    this.hooks.emit({
      type: 'objectiveFeedback',
      x: obj.def.x, y: obj.def.y - 40,
      message: 'Destroy Gate first', color: '#9ca3af',
    });
  }

  private refreshPriority(): void {
    const prev = this.priority;
    if (this.matchPhase !== 'in_progress') {
      this.priority = 'victory';
    } else {
      const blueCore = this.objectives.get('blueCore');
      const blueGate = this.objectives.get('blueGate');
      const redGate = this.objectives.get('redGate');
      const redCore = this.objectives.get('redCore');

      const blueCoreVulnerable =
        blueCore && blueCore.combatState !== 'protected' && blueCore.combatState !== 'destroyed';
      const blueGateDown = blueGate?.combatState === 'destroyed';

      if (blueCoreVulnerable && blueGateDown) {
        this.priority = 'defend_core';
      } else if (redGate?.combatState === 'destroyed' && redCore?.combatState !== 'destroyed') {
        this.priority = 'attack_core';
      } else {
        this.priority = 'attack_gate';
      }
    }
    if (this.priority !== prev) {
      this.hooks.emit({ type: 'priorityChanged', priority: this.priority, label: PRIORITY_LABELS[this.priority] });
    }
  }

  public getSiegeGateBonusConstant(): number {
    return SIEGE_RUINS_GATE_BONUS;
  }
}
