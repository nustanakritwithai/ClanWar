/** Phase 3B-B2: documented placeholder behavior for mapped skills not fully implemented. */
export const SKILL_PLACEHOLDER_NOTES: Partial<Record<string, string>> = {
  warrior_gate_breaker: 'gate damage deferred; melee arc vs dummy only',
  guardian_war_taunt: 'taunt/slow deferred; AoE marker placeholder',
  warrior_leap_strike: 'leap dash deferred; instant AoE at landing point',
  mage_meteor_siege: 'gate damage deferred; instant AoE single-hit',
  priest_revival_prayer: 'revive deferred; self-heal placeholder only',
};

export function getSkillPlaceholderNote(skillId: string): string | undefined {
  return SKILL_PLACEHOLDER_NOTES[skillId];
}

/** Skills that must not apply damage to objectives (heal/taunt/visual-only). */
export function skipsObjectiveDamage(skillId: string): boolean {
  return skillId === 'guardian_war_taunt';
}

/** Skills that must not apply status/taunt/revive/leap movement in 3B-B2. */
export function isVisualOnlyAoe(skillId: string): boolean {
  return skillId === 'guardian_war_taunt';
}
