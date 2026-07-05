import { PLAYER_RADIUS } from '../constants';
import { HEROES } from '../data/heroes';
import type { HeroClassId, InputState, MapDefinition } from '../types';
import { stepCircleMovement } from './MovementSim';

// Phase 6A: minimal headless match simulation for the 3D renderer path.
//
// Runs at a fixed tick (SIM_TICK_SECONDS) regardless of display refresh rate
// so movement/balance stay identical on 60Hz desktops and 120Hz phones. The
// renderer interpolates between the previous and current tick positions.
//
// Scope guard: 6A is movement + collision only. Combat, mana, bots, and
// objectives are ported in 6C-6E — do not grow this file ahead of its phase.

export const SIM_TICK_SECONDS = 1 / 60;

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
  moving: boolean;
}

export class MatchSim {
  public readonly map: MapDefinition;
  public readonly player: PlayerSimState;
  /** Total simulated ticks (debug overlay / determinism checks). */
  public tickCount = 0;

  constructor(map: MapDefinition, heroClass: HeroClassId = 'warrior') {
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
      moving: false,
    };
  }

  /** Advance the world by exactly one fixed tick. */
  public tick(input: InputState): void {
    const p = this.player;
    p.prevX = p.x;
    p.prevY = p.y;

    p.moving = input.moveX !== 0 || input.moveY !== 0;
    if (p.moving) {
      p.facingAngle = Math.atan2(input.moveY, input.moveX);
    }

    stepCircleMovement(p, input.moveX, input.moveY, p.moveSpeed, SIM_TICK_SECONDS, this.map.walls, this.map);

    this.tickCount += 1;
  }
}
