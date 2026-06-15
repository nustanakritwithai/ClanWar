import type { SkillDefinition, SkillRuntimeType } from '../types';

/** Maps each skill to its Phase 3B-B1 runtime resolver. Unlisted skills keep legacy/no-op handling. */
const SKILL_RUNTIME_TYPE: Partial<Record<string, SkillRuntimeType>> = {
  guardian_shield_bash: 'melee_arc',
  warrior_cleave: 'melee_arc',
  warrior_gate_breaker: 'melee_arc',
  ranger_power_shot: 'projectile',
  mage_fireball: 'projectile',
  ranger_arrow_rain: 'aoe_circle',
  mage_frost_zone: 'aoe_circle',
  priest_holy_circle: 'aoe_circle',
  guardian_war_taunt: 'aoe_circle',
  warrior_leap_strike: 'aoe_circle',
  mage_meteor_siege: 'aoe_circle',
  priest_heal: 'heal',
  priest_revival_prayer: 'heal',
};

export function getSkillRuntimeType(skill: SkillDefinition): SkillRuntimeType {
  return SKILL_RUNTIME_TYPE[skill.id] ?? 'legacy';
}
