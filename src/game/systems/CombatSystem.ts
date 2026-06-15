import type { CombatTarget, DamageResult } from '../types';

/** Phase 3B-A: pure damage math — no Phaser dependency. */
export class CombatSystem {
  public static calculateDamage(rawDamage: number, armor: number): number {
    return Math.max(1, Math.round(rawDamage * (100 / (100 + armor))));
  }

  public static applyDamage(target: CombatTarget, rawDamage: number): DamageResult {
    const finalDamage = CombatSystem.calculateDamage(rawDamage, target.armor);
    target.currentHp = Math.max(0, target.currentHp - finalDamage);
    return {
      rawDamage,
      finalDamage,
      targetHpAfter: target.currentHp,
      killed: target.currentHp <= 0,
    };
  }
}
