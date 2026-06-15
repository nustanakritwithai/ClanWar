import type { EconomyConfig } from '../types';

/** Economy and progression numbers for Phase 3+. No runtime gold/exp yet. */
export const ECONOMY: EconomyConfig = {
  startingGold: 500,
  passiveGoldPerSecond: 2,
  firstItemTargetTimeSeconds: 180,
  maxLevel: 15,
  startLevel: 1,
  exp: {
    killHero: 120,
    assist: 60,
    captureObjective: 100,
    damageGateMajor: 80,
    repairGate: 60,
    healAllyMajor: 50,
    holdObjectiveTick: 10,
  },
  gold: {
    killGold: 150,
    assistGold: 75,
    captureGold: 120,
    resourceCampTickGold: 5,
    passiveGoldPerSecond: 2,
  },
  respawn: {
    baseRespawn: 5,
    extraRespawnByMinuteDivisor: 3,
    maxRespawn: 15,
  },
};
