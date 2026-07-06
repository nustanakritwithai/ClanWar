import type { BotGoal } from '../ai/BotBrain';
import type { BotPerception } from '../ai/BotPerception';

/** Ranged normal-attack bolt kinds (lived in ui/CombatVfx until the Phaser
 * runtime was removed in Phase 6F — values unchanged). */
export type NormalAttackProjectileKind = 'arrow' | 'magic_bolt' | 'holy_bolt';

/**
 * Phase 5A-4 / 5A-5 — BotPlayerController.
 *
 * The thin seam that mirrors human input: it converts the brain's chosen goal
 * (intent of *what* to do) into a neutral {@link BotIntent} that
 * `BotPlayerSystem` executes with the shared movement/attack verbs. This is the
 * single difference between a human-controlled Player (input → intent) and a
 * BotPlayer (BotBrain → intent).
 *
 * Phase 5A-5 adds class-aware attack metadata (`attackKind` / `projectileKind`)
 * so ranged classes (ranger/mage/priest) fire the matching normal-attack
 * projectile while melee classes (warrior/guardian) stay melee-only.
 *
 * Phase 5A-6 adds ranged spacing intents: `hold_range` → hold position and fire
 * (never chase closer), `kite_back` → backpedal away from the player. Both target
 * the player so the bot keeps aiming while it spaces.
 *
 * Phase 5A-7 adds the `cast_skill` intent: the bot casts its class signature
 * skill (`skillId`, drawn from the shared player SKILLS table) like a player. The
 * controller stays a pure translator — the system owns the cast/cooldown/VFX.
 *
 * Pure translation — no Phaser, no physics, no state.
 */
export type BotIntentKind = 'engage' | 'seek' | 'patrol' | 'hold' | 'kite' | 'cast_skill';
export type BotAttackKind = 'melee' | 'ranged';

export interface BotIntent {
  /** engage = pursue/attack; seek = move to a point; patrol; hold; kite; cast_skill. */
  kind: BotIntentKind;
  /** Target world point for `engage` (player) / `seek` (last-seen or spawn). */
  targetX?: number;
  targetY?: number;
  /** True when the bot may swing/shoot once in range + cooldown ready. */
  basicAttack: boolean;
  /** Melee for warrior/guardian; ranged for ranger/mage/priest. */
  attackKind: BotAttackKind;
  /** Projectile to fire for ranged classes (null for melee). */
  projectileKind: NormalAttackProjectileKind | null;
  /** Class skill to cast for `cast_skill` (shared SKILLS id; null otherwise). */
  skillId?: string | null;
}

export interface BotIntentContext {
  playerX: number;
  playerY: number;
  spawnX: number;
  spawnY: number;
  investigateTarget: { x: number; y: number } | null;
  /** Class-derived attack identity (filled by BotPlayerSystem). */
  attackKind: BotAttackKind;
  projectileKind: NormalAttackProjectileKind | null;
  /** Class signature skill id (shared SKILLS table) or null when none. */
  skillId: string | null;
}

export class BotPlayerController {
  /** Map a brain goal + perception into an executable intent. */
  public intentFor(goal: BotGoal, _perception: BotPerception, ctx: BotIntentContext): BotIntent {
    const ak = ctx.attackKind;
    const pk = ctx.projectileKind;
    switch (goal) {
      case 'attack_player':
      case 'chase_player':
        return { kind: 'engage', targetX: ctx.playerX, targetY: ctx.playerY, basicAttack: true, attackKind: ak, projectileKind: pk };

      case 'cast_skill':
        // Cast the class signature skill at the player (heal skills self-target,
        // resolved by the system); never a bot-only ability.
        return { kind: 'cast_skill', targetX: ctx.playerX, targetY: ctx.playerY, basicAttack: false, attackKind: ak, projectileKind: pk, skillId: ctx.skillId };

      case 'hold_range':
        // Hold position and fire when ready; never chase closer.
        return { kind: 'hold', targetX: ctx.playerX, targetY: ctx.playerY, basicAttack: true, attackKind: ak, projectileKind: pk };

      case 'kite_back':
        // Backpedal away from the player (target is the point to flee from).
        return { kind: 'kite', targetX: ctx.playerX, targetY: ctx.playerY, basicAttack: false, attackKind: ak, projectileKind: pk };

      case 'investigate_last_seen':
        if (ctx.investigateTarget) {
          return { kind: 'seek', targetX: ctx.investigateTarget.x, targetY: ctx.investigateTarget.y, basicAttack: false, attackKind: ak, projectileKind: pk };
        }
        return { kind: 'hold', basicAttack: false, attackKind: ak, projectileKind: pk };

      case 'return_to_spawn':
        return { kind: 'seek', targetX: ctx.spawnX, targetY: ctx.spawnY, basicAttack: false, attackKind: ak, projectileKind: pk };

      case 'recover_after_attack':
        return { kind: 'hold', basicAttack: false, attackKind: ak, projectileKind: pk };

      case 'patrol_area':
      default:
        return { kind: 'patrol', basicAttack: false, attackKind: ak, projectileKind: pk };
    }
  }
}
