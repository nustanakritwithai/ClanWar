// Phase 6G: quality tiers. One place decides how expensive the frame is:
//
//   low   — pixelRatio 1, no antialias, no shadows, 220-particle budget
//   med   — pixelRatio ≤1.5, antialias, no shadows, 400-particle budget
//   high  — pixelRatio ≤2, antialias, PCF shadows, 500-particle budget
//
// The tier comes from ?quality=low|med|high when given, otherwise a device
// heuristic (memory / cores / coarse pointer). An fps watchdog can drop the
// runtime one tier (never up — no oscillation) if the frame rate stays low.

export type QualityTier = 'low' | 'med' | 'high';

export interface QualitySettings {
  tier: QualityTier;
  pixelRatioCap: number;
  antialias: boolean;
  shadows: boolean;
  particleBudget: number;
}

const SETTINGS: Record<QualityTier, QualitySettings> = {
  low: { tier: 'low', pixelRatioCap: 1, antialias: false, shadows: false, particleBudget: 220 },
  med: { tier: 'med', pixelRatioCap: 1.5, antialias: true, shadows: false, particleBudget: 400 },
  high: { tier: 'high', pixelRatioCap: 2, antialias: true, shadows: true, particleBudget: 500 },
};

export function qualityFor(tier: QualityTier): QualitySettings {
  return SETTINGS[tier];
}

/** Pick the starting tier: URL override first, then a cheap device heuristic. */
export function detectQuality(search: string): QualitySettings {
  const param = new URLSearchParams(search).get('quality');
  if (param === 'low' || param === 'med' || param === 'high') return SETTINGS[param];

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8; // desktop browsers omit it — assume plenty
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  if (memory <= 2 || cores <= 2) return SETTINGS.low;
  // Touch devices default to med: shadows are the single biggest mobile cost.
  if (coarse || memory <= 4 || cores <= 4) return SETTINGS.med;
  return SETTINGS.high;
}

/**
 * FPS watchdog: call once per frame with the current fps estimate. If fps
 * stays below `threshold` for `holdSeconds`, fires `onDowngrade` with the
 * next tier down — at most once per step, never upgrades.
 */
export class QualityWatchdog {
  private below = 0;
  private tier: QualityTier;
  private readonly onDowngrade: (next: QualitySettings) => void;

  constructor(tier: QualityTier, onDowngrade: (next: QualitySettings) => void) {
    this.tier = tier;
    this.onDowngrade = onDowngrade;
  }

  public update(fps: number, dt: number, threshold = 38, holdSeconds = 5): void {
    if (this.tier === 'low') return;
    this.below = fps > 0 && fps < threshold ? this.below + dt : 0;
    if (this.below >= holdSeconds) {
      this.below = 0;
      this.tier = this.tier === 'high' ? 'med' : 'low';
      this.onDowngrade(SETTINGS[this.tier]);
    }
  }
}
