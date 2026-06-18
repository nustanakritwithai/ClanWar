import type { BotGoal } from '../ai/BotBrain';
import type { BotPerception } from '../ai/BotPerception';

/**
 * Phase 5A-4 — BotPlayerController.
 *
 * The thin seam that mirrors human input: it converts the brain's chosen goal
 * (intent of *what* to do) into a neutral {@link BotIntent} that
 * `BotPlayerSystem` executes with the shared movement/attack verbs. This is the
 * single difference between a human-controlled Player (input → intent) and a
 * BotPlayer (BotBrain → intent).
 *
 * Pure translation — no Phaser, no physics, no state.
 */
export type BotIntentKind = 'engage' | 'seek' | 'patrol' | 'hold';

export interface BotIntent {
  /** engage = pursue/attack the player; seek = move to a point; patrol; hold. */
  kind: BotIntentKind;
  /** Target world point for `engage` (player) / `seek` (last-seen or spawn). */
  targetX?: number;
  targetY?: number;
  /** True when the bot may swing once in range + cooldown ready. */
  basicAttack: boolean;
}

export interface BotIntentContext {
  playerX: number;
  playerY: number;
  spawnX: number;
  spawnY: number;
  investigateTarget: { x: number; y: number } | null;
}

export class BotPlayerController {
  /** Map a brain goal + perception into an executable intent. */
  public intentFor(goal: BotGoal, _perception: BotPerception, ctx: BotIntentContext): BotIntent {
    switch (goal) {
      case 'attack_player':
      case 'chase_player':
        return { kind: 'engage', targetX: ctx.playerX, targetY: ctx.playerY, basicAttack: true };

      case 'investigate_last_seen':
        if (ctx.investigateTarget) {
          return { kind: 'seek', targetX: ctx.investigateTarget.x, targetY: ctx.investigateTarget.y, basicAttack: false };
        }
        return { kind: 'hold', basicAttack: false };

      case 'return_to_spawn':
        return { kind: 'seek', targetX: ctx.spawnX, targetY: ctx.spawnY, basicAttack: false };

      case 'recover_after_attack':
        return { kind: 'hold', basicAttack: false };

      case 'patrol_area':
      default:
        return { kind: 'patrol', basicAttack: false };
    }
  }
}
