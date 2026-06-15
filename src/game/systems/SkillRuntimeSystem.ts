import type { ActionKey, HeroClassId, SkillDefinition, SkillSlot, SkillUseResult } from '../types';
import { SKILLS } from '../data/skills';
import type { Player } from '../entities/Player';

const SKILL_ACTIONS: ActionKey[] = ['skill1', 'skill2', 'skill3', 'ultimate'];

const SLOT_TO_ACTION: Record<SkillSlot, ActionKey> = {
  skill1: 'skill1',
  skill2: 'skill2',
  skill3: 'skill3',
  ultimate: 'ultimate',
};

/** Phase 3A: cooldown/mana runtime for hero skills. No damage or hit detection yet. */
export class SkillRuntimeSystem {
  private skillsByAction = new Map<ActionKey, SkillDefinition>();
  private cooldownRemaining = new Map<ActionKey, number>();
  private lastResult = '';

  constructor(heroClass: HeroClassId) {
    for (const skill of SKILLS) {
      if (skill.heroClass !== heroClass) continue;
      this.skillsByAction.set(SLOT_TO_ACTION[skill.slot], skill);
    }
  }

  public update(deltaSeconds: number): void {
    for (const action of SKILL_ACTIONS) {
      const remaining = this.cooldownRemaining.get(action) ?? 0;
      if (remaining <= 0) continue;
      this.cooldownRemaining.set(action, Math.max(0, remaining - deltaSeconds));
    }
  }

  public getSkillForAction(action: ActionKey): SkillDefinition | undefined {
    return this.skillsByAction.get(action);
  }

  public canUseSkill(action: ActionKey, currentMana: number): boolean {
    const skill = this.getSkillForAction(action);
    if (!skill) return false;
    if (this.getCooldownRemaining(action) > 0) return false;
    return currentMana >= skill.manaCost;
  }

  public tryUseSkill(action: ActionKey, player: Player): SkillUseResult {
    const skill = this.getSkillForAction(action);
    if (!skill) {
      this.lastResult = 'fail: no-skill';
      return { ok: false, reason: 'no-skill' };
    }

    if (this.getCooldownRemaining(action) > 0) {
      this.lastResult = 'fail: cooldown';
      return { ok: false, reason: 'cooldown', skillName: skill.name };
    }

    if (!player.canSpendMana(skill.manaCost)) {
      this.lastResult = 'fail: mana';
      return { ok: false, reason: 'mana', skillName: skill.name };
    }

    this.cooldownRemaining.set(action, skill.cooldown);
    this.lastResult = `used: ${skill.name}`;
    return { ok: true, skillName: skill.name, cooldown: skill.cooldown };
  }

  public getCooldownRemaining(action: ActionKey): number {
    return this.cooldownRemaining.get(action) ?? 0;
  }

  public getCooldownTotal(action: ActionKey): number {
    return this.getSkillForAction(action)?.cooldown ?? 0;
  }

  public getLastResult(): string {
    return this.lastResult;
  }
}
