import Phaser from 'phaser';
import { SHOW_DEBUG_OVERLAY } from '../constants';
import {
  OBJECTIVE_DEFINITIONS,
  type ObjectiveDefinition,
  type ObjectiveId,
  type ObjectiveKind,
  type MatchObjectivePhase,
  type ObjectiveCombatState,
  type PlayerObjectivePriority,
} from '../data/objectives';
import { Objective } from '../entities/Objective';
import { DEFAULT_MELEE_ARC_DEGREES, segmentHitsCircle, testAoeCircle, testMeleeArc } from '../combat/HitShapes';
import { CombatSystem } from './CombatSystem';
import type { DamageResult, TeamId } from '../types';
import { showCombatText } from '../ui/CombatText';
import { showHitSpark } from '../ui/CombatVfx';

const UNDER_ATTACK_TIMEOUT_MS = 2000;
const MATCH_END_DELAY_MS = 500;

export const OBJECTIVE_TEXTURES = {
  blueGate: 'obj_blue_gate',
  redGate: 'obj_red_gate',
  blueCore: 'obj_blue_core',
  redCore: 'obj_red_core',
  destroyed: 'obj_destroyed',
  underAttack: 'objective_under_attack',
  gateBreachedBlue: 'gate_breached_blue',
  gateBreachedRed: 'gate_breached_red',
  coreVulnerableBlue: 'core_vulnerable_blue',
  coreVulnerableRed: 'core_vulnerable_red',
  uiAttackGate: 'ui_attack_gate',
  uiCoreVulnerable: 'ui_core_vulnerable',
  uiDefendCore: 'ui_defend_core',
} as const;

const SVG_SOURCES: Array<{ key: string; path: string }> = [
  { key: OBJECTIVE_TEXTURES.blueGate, path: 'objectives/blue_gate.svg' },
  { key: OBJECTIVE_TEXTURES.redGate, path: 'objectives/red_gate.svg' },
  { key: OBJECTIVE_TEXTURES.blueCore, path: 'objectives/blue_core.svg' },
  { key: OBJECTIVE_TEXTURES.redCore, path: 'objectives/red_core.svg' },
  { key: OBJECTIVE_TEXTURES.destroyed, path: 'objectives/objective_destroyed.svg' },
  { key: OBJECTIVE_TEXTURES.underAttack, path: 'objective-feedback/objective_under_attack.svg' },
  { key: OBJECTIVE_TEXTURES.gateBreachedBlue, path: 'objective-feedback/gate_breached_blue.svg' },
  { key: OBJECTIVE_TEXTURES.gateBreachedRed, path: 'objective-feedback/gate_breached_red.svg' },
  { key: OBJECTIVE_TEXTURES.coreVulnerableBlue, path: 'objective-feedback/core_vulnerable_blue.svg' },
  { key: OBJECTIVE_TEXTURES.coreVulnerableRed, path: 'objective-feedback/core_vulnerable_red.svg' },
  { key: OBJECTIVE_TEXTURES.uiAttackGate, path: 'objective-feedback/ui_attack_gate.svg' },
  { key: OBJECTIVE_TEXTURES.uiCoreVulnerable, path: 'objective-feedback/ui_core_vulnerable.svg' },
  { key: OBJECTIVE_TEXTURES.uiDefendCore, path: 'objective-feedback/ui_defend_core.svg' },
];

interface RuntimeObjective {
  def: ObjectiveDefinition;
  entity: Objective;
  combatState: ObjectiveCombatState;
  currentHp: number;
  underAttackTimerMs: number;
  blueCoreThreatened: boolean;
}

export interface ObjectiveMeleeContext {
  ownerTeam: TeamId;
  casterX: number;
  casterY: number;
  facingAngle: number;
  range: number;
  arcDegrees?: number;
  rawDamage: number;
  skillId?: string;
  skillGateDamageBonus?: number;
  playerGateDamageBonus?: number;
}

export interface ObjectiveAoeContext {
  ownerTeam: TeamId;
  centerX: number;
  centerY: number;
  radius: number;
  rawDamage: number;
  skillId?: string;
  skillGateDamageBonus?: number;
  playerGateDamageBonus?: number;
}

export interface ObjectiveProjectileContext {
  ownerTeam: TeamId;
  x: number;
  y: number;
  rawDamage: number;
  skillId?: string;
}

export interface ObjectiveSnapshot {
  id: ObjectiveId;
  type: ObjectiveKind;
  team: TeamId;
  x: number;
  y: number;
  currentHp: number;
  maxHp: number;
  combatState: ObjectiveCombatState;
}

export function loadObjectiveAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, path } of SVG_SOURCES) {
    if (!loader.scene.textures.exists(key)) {
      loader.image(key, `assets/${path}`);
    }
  }
}

export class ObjectiveSystem {
  private scene: Phaser.Scene;
  private registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void;
  private onMatchEnd: (outcome: 'victory' | 'defeat') => void;

  private objectives = new Map<ObjectiveId, RuntimeObjective>();
  private matchPhase: MatchObjectivePhase = 'in_progress';
  private priority: PlayerObjectivePriority = 'attack_gate';
  private hudIcon?: Phaser.GameObjects.Image;
  private hudVictoryText?: Phaser.GameObjects.Text;
  private matchEndTimer?: Phaser.Time.TimerEvent;
  private lastBlockedLog = '';

  constructor(
    scene: Phaser.Scene,
    registerWorldObject: (obj: Phaser.GameObjects.GameObject) => void,
    onMatchEnd: (outcome: 'victory' | 'defeat') => void,
  ) {
    this.scene = scene;
    this.registerWorldObject = registerWorldObject;
    this.onMatchEnd = onMatchEnd;
  }

  public build(): void {
    for (const def of OBJECTIVE_DEFINITIONS) {
      const baseKey = this.baseTextureFor(def);
      const entity = new Objective(this.scene, def, baseKey, this.registerWorldObject);
      const combatState: ObjectiveCombatState = def.type === 'gate' ? 'intact' : 'protected';
      this.objectives.set(def.id, {
        def,
        entity,
        combatState,
        currentHp: def.maxHp,
        underAttackTimerMs: 0,
        blueCoreThreatened: false,
      });
      entity.applyVisualState(combatState, baseKey);
    }

    this.createHud();
    this.refreshPriority();
  }

  public update(deltaMs: number): void {
    if (this.matchPhase !== 'in_progress') return;

    for (const obj of this.objectives.values()) {
      if (obj.combatState !== 'under_attack') continue;
      obj.underAttackTimerMs -= deltaMs;
      if (obj.underAttackTimerMs <= 0) {
        this.clearUnderAttack(obj);
      }
    }
  }

  public destroy(): void {
    this.matchEndTimer?.remove(false);
    this.matchEndTimer = undefined;
    for (const obj of this.objectives.values()) {
      obj.entity.destroy();
    }
    this.objectives.clear();
    this.hudIcon?.destroy();
    this.hudIcon = undefined;
    this.hudVictoryText?.destroy();
    this.hudVictoryText = undefined;
  }

  public getObjectiveCount(): number {
    return this.objectives.size;
  }

  public getMatchPhase(): MatchObjectivePhase {
    return this.matchPhase;
  }

  public getPriority(): PlayerObjectivePriority {
    return this.priority;
  }

  public getSnapshots(): ObjectiveSnapshot[] {
    return [...this.objectives.values()].map((obj) => ({
      id: obj.def.id,
      type: obj.def.type,
      team: obj.def.team,
      x: obj.def.x,
      y: obj.def.y,
      currentHp: obj.currentHp,
      maxHp: obj.def.maxHp,
      combatState: obj.combatState,
    }));
  }

  public getDebugLines(): string[] {
    const lines: string[] = [];
    for (const id of ['redGate', 'redCore', 'blueGate', 'blueCore'] as ObjectiveId[]) {
      const obj = this.objectives.get(id);
      if (!obj) continue;
      lines.push(`${id}: ${obj.combatState} hp=${Math.ceil(obj.currentHp)}/${obj.def.maxHp}`);
    }
    lines.push(`priority: ${this.priority}`);
    lines.push(`match: ${this.matchPhase}`);
    return lines;
  }

  public getLastBlockedLog(): string {
    return this.lastBlockedLog;
  }

  /** Debug/test hook — deal damage from an attacker team without hit-shape checks. */
  public debugDealDamage(
    objectiveId: ObjectiveId,
    rawDamage: number,
    attackerTeam: TeamId = 'red',
  ): DamageResult | null {
    if (!SHOW_DEBUG_OVERLAY) return null;
    const obj = this.objectives.get(objectiveId);
    if (!obj || obj.combatState === 'destroyed') return null;
    if (obj.def.team === attackerTeam) return null;

    const combatTarget = {
      currentHp: obj.currentHp,
      maxHp: obj.def.maxHp,
      armor: obj.def.armor,
    };
    const result = CombatSystem.applyDamage(combatTarget, rawDamage);
    obj.currentHp = combatTarget.currentHp;
    this.enterUnderAttack(obj);
    this.showDamageFeedback(obj, result.finalDamage);
    if (result.killed) {
      this.setDestroyed(obj);
    }
    return result;
  }

  public applyMeleeArcDamage(ctx: ObjectiveMeleeContext): DamageResult | null {
    if (this.matchPhase !== 'in_progress') return null;

    let best: RuntimeObjective | null = null;
    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      if (!this.canReceiveDamage(obj)) continue;
      const arc = testMeleeArc(
        ctx.casterX,
        ctx.casterY,
        ctx.facingAngle,
        obj.def.x,
        obj.def.y,
        obj.def.radius,
        ctx.range,
        ctx.arcDegrees ?? DEFAULT_MELEE_ARC_DEGREES,
      );
      if (arc.hit) best = obj;
    }

    if (!best) return null;
    const raw = this.computeRawDamage(best, ctx.rawDamage, ctx.skillGateDamageBonus, ctx.playerGateDamageBonus);
    return this.applyDamageToObjective(best, raw, ctx.ownerTeam);
  }

  public applyAoeDamage(ctx: ObjectiveAoeContext): DamageResult | null {
    if (this.matchPhase !== 'in_progress') return null;

    let last: DamageResult | null = null;
    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      if (!this.canReceiveDamage(obj)) continue;
      const circle = testAoeCircle(
        ctx.centerX,
        ctx.centerY,
        ctx.radius,
        obj.def.x,
        obj.def.y,
        obj.def.radius,
      );
      if (!circle.hit) continue;
      const raw = this.computeRawDamage(obj, ctx.rawDamage, ctx.skillGateDamageBonus, ctx.playerGateDamageBonus);
      const result = this.applyDamageToObjective(obj, raw, ctx.ownerTeam);
      if (result) last = result;
    }
    return last;
  }

  public applyRangeDamage(ctx: {
    ownerTeam: TeamId;
    casterX: number;
    casterY: number;
    range: number;
    rawDamage: number;
    skillGateDamageBonus?: number;
    playerGateDamageBonus?: number;
  }): DamageResult | null {
    if (this.matchPhase !== 'in_progress') return null;

    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      if (!this.canReceiveDamage(obj)) continue;
      const dist = Math.hypot(obj.def.x - ctx.casterX, obj.def.y - ctx.casterY);
      if (dist > ctx.range + obj.def.radius) continue;
      const raw = this.computeRawDamage(obj, ctx.rawDamage, ctx.skillGateDamageBonus, ctx.playerGateDamageBonus);
      return this.applyDamageToObjective(obj, raw, ctx.ownerTeam);
    }
    return null;
  }

  public applyProjectileDamage(ctx: ObjectiveProjectileContext): DamageResult | null {
    if (this.matchPhase !== 'in_progress') return null;

    for (const obj of this.enemyObjectives(ctx.ownerTeam)) {
      if (!this.canReceiveDamage(obj)) continue;
      const dist = Math.hypot(obj.def.x - ctx.x, obj.def.y - ctx.y);
      if (dist > obj.def.radius + 14) continue;
      return this.applyDamageToObjective(obj, ctx.rawDamage, ctx.ownerTeam);
    }
    return null;
  }

  public findProjectileSegmentHit(
    ownerTeam: TeamId,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    hitRadius: number,
  ): ObjectiveId | null {
    if (this.matchPhase !== 'in_progress') return null;

    for (const obj of this.enemyObjectives(ownerTeam)) {
      if (!this.canReceiveDamage(obj)) continue;
      const combined = hitRadius + obj.def.radius;
      if (segmentHitsCircle(x1, y1, x2, y2, obj.def.x, obj.def.y, combined)) {
        return obj.def.id;
      }
    }
    return null;
  }

  public damageObjectiveById(
    objectiveId: ObjectiveId,
    rawDamage: number,
    attackerTeam: TeamId,
  ): DamageResult | null {
    const obj = this.objectives.get(objectiveId);
    if (!obj) return null;
    return this.applyDamageToObjective(obj, rawDamage, attackerTeam);
  }

  public handleProjectileSegmentHit(
    ownerTeam: TeamId,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    hitRadius: number,
    rawDamage: number,
  ): { hit: boolean; objectiveId?: ObjectiveId; result?: DamageResult } {
    const objectiveId = this.findProjectileSegmentHit(ownerTeam, x1, y1, x2, y2, hitRadius);
    if (!objectiveId) return { hit: false };
    const result = this.damageObjectiveById(objectiveId, rawDamage, ownerTeam);
    if (result) return { hit: true, objectiveId, result };
    return { hit: false };
  }

  private enemyObjectives(ownerTeam: TeamId): RuntimeObjective[] {
    return [...this.objectives.values()].filter((obj) => obj.def.team !== ownerTeam);
  }

  private canReceiveDamage(obj: RuntimeObjective): boolean {
    if (obj.combatState === 'destroyed') return false;
    if (obj.def.type === 'core' && obj.combatState === 'protected') return false;
    return true;
  }

  private computeRawDamage(
    obj: RuntimeObjective,
    baseDamage: number,
    skillGateBonus?: number,
    playerGateBonus?: number,
  ): number {
    let raw = baseDamage;
    if (obj.def.type === 'gate') {
      raw *= 1 + (playerGateBonus ?? 0);
      if (skillGateBonus) raw *= 1 + skillGateBonus;
    }
    return Math.round(raw);
  }

  private applyDamageToObjective(
    obj: RuntimeObjective,
    rawDamage: number,
    attackerTeam: TeamId,
  ): DamageResult | null {
    if (obj.def.team === attackerTeam) return null;
    if (!this.canReceiveDamage(obj)) {
      if (obj.def.type === 'core' && obj.combatState === 'protected') {
        this.lastBlockedLog = `blocked: ${obj.def.id} protected`;
      }
      return null;
    }

    const combatTarget = {
      currentHp: obj.currentHp,
      maxHp: obj.def.maxHp,
      armor: obj.def.armor,
    };
    const result = CombatSystem.applyDamage(combatTarget, rawDamage);
    obj.currentHp = combatTarget.currentHp;

    this.enterUnderAttack(obj);
    this.showDamageFeedback(obj, result.finalDamage);

    if (result.killed) {
      this.setDestroyed(obj);
    }

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
    this.syncVisuals(obj);
  }

  private clearUnderAttack(obj: RuntimeObjective): void {
    if (obj.combatState === 'under_attack') {
      obj.combatState = obj.def.type === 'gate' ? 'intact' : 'vulnerable';
      obj.underAttackTimerMs = 0;
      this.syncVisuals(obj);
    }
  }

  private setDestroyed(obj: RuntimeObjective): void {
    obj.combatState = 'destroyed';
    obj.currentHp = 0;
    obj.underAttackTimerMs = 0;
    this.syncVisuals(obj);

    if (obj.def.type === 'gate') {
      this.onGateDestroyed(obj.def.team);
      this.refreshPriority();
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
    this.syncVisuals(core);
    this.refreshPriority();
  }

  private endMatch(outcome: 'victory' | 'defeat'): void {
    if (this.matchPhase !== 'in_progress') return;
    this.matchPhase = outcome;
    this.priority = 'victory';
    this.refreshHud();

    this.matchEndTimer?.remove(false);
    this.matchEndTimer = this.scene.time.delayedCall(MATCH_END_DELAY_MS, () => {
      this.onMatchEnd(outcome);
    });
  }

  private showDamageFeedback(obj: RuntimeObjective, finalDamage: number): void {
    const color = obj.def.type === 'gate' ? '#cfa14a' : '#f4d35e';
    showHitSpark(this.scene, obj.def.x, obj.def.y, this.registerWorldObject);
    const text = showCombatText(this.scene, obj.def.x, obj.def.y - 24, `-${finalDamage}`, color);
    this.registerWorldObject(text);
  }

  private syncVisuals(obj: RuntimeObjective): void {
    const texture = this.textureForState(obj);
    obj.entity.applyVisualState(obj.combatState, texture);
  }

  private textureForState(obj: RuntimeObjective): string {
    if (obj.combatState === 'destroyed') {
      if (obj.def.type === 'gate') {
        return obj.def.team === 'blue' ? OBJECTIVE_TEXTURES.gateBreachedBlue : OBJECTIVE_TEXTURES.gateBreachedRed;
      }
      return OBJECTIVE_TEXTURES.destroyed;
    }
    return this.baseTextureFor(obj.def);
  }

  private baseTextureFor(def: ObjectiveDefinition): string {
    switch (def.id) {
      case 'blueGate':
        return OBJECTIVE_TEXTURES.blueGate;
      case 'redGate':
        return OBJECTIVE_TEXTURES.redGate;
      case 'blueCore':
        return OBJECTIVE_TEXTURES.blueCore;
      case 'redCore':
        return OBJECTIVE_TEXTURES.redCore;
      default:
        return OBJECTIVE_TEXTURES.destroyed;
    }
  }

  private refreshPriority(): void {
    if (this.matchPhase === 'victory') {
      this.priority = 'victory';
    } else if (this.matchPhase === 'defeat') {
      this.priority = 'victory';
    } else {
      const blueCore = this.objectives.get('blueCore');
      const redGate = this.objectives.get('redGate');
      const redCore = this.objectives.get('redCore');
      const blueGate = this.objectives.get('blueGate');

      const blueCoreVulnerable =
        blueCore &&
        blueCore.combatState !== 'protected' &&
        blueCore.combatState !== 'destroyed';
      const blueGateDown = blueGate?.combatState === 'destroyed';

      if (blueCoreVulnerable && blueGateDown) {
        this.priority = 'defend_core';
      } else if (redGate?.combatState === 'destroyed' && redCore?.combatState !== 'destroyed') {
        this.priority = 'attack_core';
      } else {
        this.priority = 'attack_gate';
      }
    }
    this.refreshHud();
  }

  private createHud(): void {
    const { width } = this.scene.scale;
    this.hudIcon = this.scene.add
      .image(width / 2, 52, OBJECTIVE_TEXTURES.uiAttackGate)
      .setDisplaySize(48, 48)
      .setScrollFactor(0)
      .setDepth(1100);

    this.hudVictoryText = this.scene.add
      .text(width / 2, 52, 'Victory', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#fbbf24',
        fontStyle: 'bold',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1100)
      .setVisible(false);

    this.registerWorldObject(this.hudIcon);
    this.registerWorldObject(this.hudVictoryText);
    this.refreshHud();
  }

  public layoutHud(): void {
    const { width } = this.scene.scale;
    this.hudIcon?.setPosition(width / 2, 52);
    this.hudVictoryText?.setPosition(width / 2, 52);
  }

  private refreshHud(): void {
    if (!this.hudIcon || !this.hudVictoryText) return;

    if (this.priority === 'victory' && this.matchPhase === 'victory') {
      this.hudIcon.setVisible(false);
      this.hudVictoryText.setVisible(true);
      return;
    }

    this.hudVictoryText.setVisible(false);
    this.hudIcon.setVisible(true);

    const texture =
      this.priority === 'attack_core'
        ? OBJECTIVE_TEXTURES.uiCoreVulnerable
        : this.priority === 'defend_core'
          ? OBJECTIVE_TEXTURES.uiDefendCore
          : OBJECTIVE_TEXTURES.uiAttackGate;
    this.hudIcon.setTexture(texture);
  }
}
