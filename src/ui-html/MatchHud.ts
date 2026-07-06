import type { MatchSim } from '../game/sim/MatchSim';
import type { MatchResolution } from '../game/data/match-rules';

// Phase 6E: HTML match-flow HUD for the 3D path — top strip (timer + Objective
// Score), the player priority prompt ("Attack the Gate" …), the capture
// progress bar (visible while standing in a circle), the siege buff badge,
// screen toasts (Final Minute / Time Up), and the end-of-match overlay.
// Copy mirrors the 2D MatchTimerSystem / ObjectiveSystem HUD and ResultScene.

const REASON_COPY: Record<string, string> = {
  enemy_core_destroyed: 'Enemy core destroyed',
  friendly_core_destroyed: 'Your core was destroyed',
  score_victory: 'Victory by Objective Score',
  score_defeat: 'Defeat by Objective Score',
  hp_tiebreak_victory: 'Victory by Core HP Tiebreak',
  hp_tiebreak_defeat: 'Defeat by Core HP Tiebreak',
  draw: 'Objective Score and Core HP tied',
};

function isTimeUpReason(reason: string): boolean {
  return (
    reason === 'score_victory' ||
    reason === 'score_defeat' ||
    reason === 'hp_tiebreak_victory' ||
    reason === 'hp_tiebreak_defeat' ||
    reason === 'draw'
  );
}

export class MatchHud {
  private readonly root: HTMLDivElement;
  private readonly timerEl: HTMLDivElement;
  private readonly scoreEl: HTMLDivElement;
  private readonly priorityEl: HTMLDivElement;
  private readonly captureWrap: HTMLDivElement;
  private readonly captureLabel: HTMLDivElement;
  private readonly captureFill: HTMLDivElement;
  private readonly siegeBadge: HTMLDivElement;
  private overlayShown = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '26',
      fontFamily: 'system-ui, sans-serif',
    });
    parent.appendChild(this.root);

    // Top strip: Time Left + Objective Score.
    const strip = document.createElement('div');
    Object.assign(strip.style, {
      position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '16px', alignItems: 'center',
    });
    this.root.appendChild(strip);

    this.timerEl = this.chip(strip, '#e6edf3');
    this.scoreEl = this.chip(strip, '#fbbf24');

    // Priority prompt below the strip.
    this.priorityEl = document.createElement('div');
    Object.assign(this.priorityEl.style, {
      position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)',
      color: '#e6edf3', background: 'rgba(0,0,0,0.5)', padding: '3px 10px',
      borderRadius: '4px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap',
    });
    this.priorityEl.textContent = 'Attack the Gate';
    this.root.appendChild(this.priorityEl);

    // Capture progress cluster (hidden by default; replaces the prompt row).
    this.captureWrap = document.createElement('div');
    Object.assign(this.captureWrap.style, {
      position: 'absolute', top: '68px', left: '50%', transform: 'translateX(-50%)',
      display: 'none', flexDirection: 'column', alignItems: 'center', gap: '4px',
    });
    this.root.appendChild(this.captureWrap);

    this.captureLabel = document.createElement('div');
    Object.assign(this.captureLabel.style, {
      color: '#e6edf3', background: 'rgba(0,0,0,0.5)', padding: '2px 8px',
      borderRadius: '4px', fontSize: '12px', whiteSpace: 'nowrap',
    });
    this.captureWrap.appendChild(this.captureLabel);

    const barBg = document.createElement('div');
    Object.assign(barBg.style, {
      width: '180px', height: '7px', background: 'rgba(0,0,0,0.55)', borderRadius: '3px',
      overflow: 'hidden',
    });
    this.captureWrap.appendChild(barBg);

    this.captureFill = document.createElement('div');
    Object.assign(this.captureFill.style, {
      width: '0%', height: '100%', background: '#60a5fa',
    });
    barBg.appendChild(this.captureFill);

    // Siege buff badge (left of centre strip).
    this.siegeBadge = document.createElement('div');
    Object.assign(this.siegeBadge.style, {
      position: 'absolute', top: '10px', right: '12px',
      color: '#fbbf24', background: 'rgba(120,53,15,0.75)', padding: '3px 8px',
      borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'none',
    });
    this.siegeBadge.textContent = '⚔ +30% Gate Damage';
    this.root.appendChild(this.siegeBadge);
  }

  /** Per-frame refresh from sim state. */
  public update(sim: MatchSim): void {
    const total = sim.getRemainingSeconds();
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    this.timerEl.textContent = `⏱ ${mm}:${ss}`;

    const blue = sim.capture.getTeamScore('blue');
    const red = sim.capture.getTeamScore('red');
    this.scoreEl.textContent = `Obj Score ${blue} – ${red}`;

    this.priorityEl.textContent = sim.objectives.getPriorityLabel();

    // Capture cluster: visible while the player stands in a circle that is
    // capturing or has partial progress (2D shows it inside the zone).
    const activeId = sim.capture.getActiveObjectiveId();
    if (activeId) {
      const snap = sim.capture.getSnapshots().find((s) => s.id === activeId);
      if (snap && (snap.captureState === 'capturing' || (snap.captureProgress > 0 && snap.captureProgress < 100))) {
        this.captureWrap.style.display = 'flex';
        this.captureLabel.textContent =
          snap.captureState === 'capturing' ? `Capturing ${snap.label}` : `${snap.label} (paused)`;
        this.captureFill.style.width = `${snap.captureProgress}%`;
      } else if (snap && snap.owner === 'blue') {
        this.captureWrap.style.display = 'flex';
        this.captureLabel.textContent = `${snap.label} secured`;
        this.captureFill.style.width = '100%';
      } else {
        this.captureWrap.style.display = 'none';
      }
    } else {
      this.captureWrap.style.display = 'none';
    }

    this.siegeBadge.style.display = sim.capture.siegeBuffActive('blue') ? 'block' : 'none';
  }

  /** Center-screen toast ("Final Minute", "Time Up"). */
  public toast(message: string, color = '#fbbf24'): void {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', top: '110px', left: '50%', transform: 'translateX(-50%)',
      color, background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '6px',
      fontSize: '20px', fontWeight: '700', whiteSpace: 'nowrap',
      transition: 'opacity 0.4s ease-in', opacity: '1',
    });
    el.textContent = message;
    this.root.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 1400);
    setTimeout(() => el.remove(), 1900);
  }

  /** Full-screen end-of-match overlay (ResultScene port). */
  public showMatchOver(res: MatchResolution): void {
    if (this.overlayShown) return;
    this.overlayShown = true;

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', background: 'rgba(3,7,18,0.82)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '14px', pointerEvents: 'auto', zIndex: '40',
    });
    this.root.appendChild(overlay);

    const title = document.createElement('div');
    const titleText = res.outcome === 'victory' ? 'VICTORY' : res.outcome === 'defeat' ? 'DEFEAT' : 'DRAW';
    Object.assign(title.style, {
      fontSize: '46px', fontWeight: '800',
      color: res.outcome === 'victory' ? '#fbbf24' : res.outcome === 'defeat' ? '#f87171' : '#cbd5e1',
    });
    title.textContent = titleText;
    overlay.appendChild(title);

    const reason = document.createElement('div');
    Object.assign(reason.style, { fontSize: '18px', color: '#e6edf3' });
    reason.textContent = REASON_COPY[res.reason] ?? res.reason;
    overlay.appendChild(reason);

    if (isTimeUpReason(res.reason)) {
      const scoreLine = document.createElement('div');
      Object.assign(scoreLine.style, { fontSize: '15px', color: '#cbd5e1' });
      scoreLine.textContent = `Objective Score  Blue ${res.blueScore} – Red ${res.redScore}`;
      overlay.appendChild(scoreLine);

      const showHp = res.reason === 'hp_tiebreak_victory' || res.reason === 'hp_tiebreak_defeat' || res.reason === 'draw';
      if (showHp) {
        const hpLine = document.createElement('div');
        Object.assign(hpLine.style, { fontSize: '15px', color: '#cbd5e1' });
        hpLine.textContent = `Core HP  Blue ${Math.ceil(res.blueCoreHp)} – Red ${Math.ceil(res.redCoreHp)}`;
        overlay.appendChild(hpLine);
      }
    }

    const btn = document.createElement('button');
    Object.assign(btn.style, {
      marginTop: '14px', padding: '10px 26px', fontSize: '18px', fontWeight: '700',
      color: '#0b1220', background: '#fbbf24', border: 'none', borderRadius: '8px',
      cursor: 'pointer',
    });
    btn.textContent = 'Play Again';
    btn.addEventListener('click', () => window.location.reload());
    overlay.appendChild(btn);
  }

  private chip(parent: HTMLElement, color: string): HTMLDivElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      color, background: 'rgba(0,0,0,0.5)', padding: '3px 8px',
      borderRadius: '4px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
    });
    parent.appendChild(el);
    return el;
  }
}
