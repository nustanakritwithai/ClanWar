import type { ActionKey } from '../game/types';
import type { MatchSim } from '../game/sim/MatchSim';

// Phase 6C: HTML combat HUD for the 3D path — bottom-right action buttons
// (attack + 4 skills) with cooldown sweeps and mana dimming, plus top-right
// HP/mana bars. Mirrors the 2D SkillButtons/stats HUD roles; layout tuned
// for thumbs (buttons sit outside the left movement zone).

interface ButtonSpec {
  action: ActionKey;
  key: string;
  /** Offset from the bottom-right anchor (px). */
  right: number;
  bottom: number;
  size: number;
}

const BUTTONS: ButtonSpec[] = [
  { action: 'attack', key: 'J', right: 28, bottom: 40, size: 84 },
  { action: 'skill1', key: 'Q', right: 128, bottom: 30, size: 58 },
  { action: 'skill2', key: 'E', right: 168, bottom: 96, size: 58 },
  { action: 'skill3', key: 'R', right: 128, bottom: 162, size: 58 },
  { action: 'ultimate', key: 'F', right: 40, bottom: 148, size: 64 },
];

const SKILL_ACTIONS: ActionKey[] = ['skill1', 'skill2', 'skill3', 'ultimate'];

export class CombatHud {
  private readonly root: HTMLDivElement;
  private readonly cooldownEls = new Map<ActionKey, HTMLDivElement>();
  private readonly buttonEls = new Map<ActionKey, HTMLDivElement>();
  private readonly hpFill: HTMLDivElement;
  private readonly manaFill: HTMLDivElement;
  private readonly hpText: HTMLDivElement;
  private readonly manaText: HTMLDivElement;

  constructor(parent: HTMLElement, sim: MatchSim, queueAction: (action: ActionKey) => void) {
    this.root = document.createElement('div');
    this.root.style.position = 'fixed';
    this.root.style.inset = '0';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = '25';
    parent.appendChild(this.root);

    // --- action buttons ----------------------------------------------------
    for (const spec of BUTTONS) {
      const skill = spec.action === 'attack' ? undefined : sim.skillRuntime.getSkillForAction(spec.action);
      const label = spec.action === 'attack' ? 'ATK' : (skill?.name ?? '—');

      const btn = document.createElement('div');
      Object.assign(btn.style, {
        position: 'absolute',
        right: `${spec.right}px`,
        bottom: `${spec.bottom}px`,
        width: `${spec.size}px`,
        height: `${spec.size}px`,
        borderRadius: '50%',
        background: spec.action === 'attack' ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.14)',
        border: '2px solid rgba(255,255,255,0.45)',
        color: '#e6edf3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        pointerEvents: 'auto',
        userSelect: 'none',
        overflow: 'hidden',
      });

      const name = document.createElement('div');
      name.textContent = label;
      Object.assign(name.style, {
        fontSize: spec.action === 'attack' ? '14px' : '9px',
        fontWeight: '700',
        lineHeight: '1.1',
        padding: '0 4px',
        zIndex: '1',
      });
      const keyHint = document.createElement('div');
      keyHint.textContent = spec.key;
      Object.assign(keyHint.style, { fontSize: '9px', opacity: '0.75', zIndex: '1' });
      btn.append(name, keyHint);

      // Cooldown sweep overlay (conic gradient fraction set per frame).
      const cd = document.createElement('div');
      Object.assign(cd.style, {
        position: 'absolute',
        inset: '0',
        borderRadius: '50%',
        background: 'transparent',
        pointerEvents: 'none',
      });
      btn.appendChild(cd);
      this.cooldownEls.set(spec.action, cd);
      this.buttonEls.set(spec.action, btn);

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        queueAction(spec.action);
        btn.style.transform = 'scale(0.92)';
      });
      btn.addEventListener('pointerup', () => { btn.style.transform = ''; });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });

      this.root.appendChild(btn);
    }

    // --- HP / mana bars (top-right) -----------------------------------------
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: '190px',
      padding: '7px 9px',
      background: 'rgba(11,14,19,0.7)',
      borderRadius: '8px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e6edf3',
    });
    const title = document.createElement('div');
    title.textContent = `${sim.player.heroName}`;
    Object.assign(title.style, { fontSize: '12px', fontWeight: '700', marginBottom: '5px' });
    panel.appendChild(title);

    const makeBar = (color: string): { wrap: HTMLDivElement; fill: HTMLDivElement; text: HTMLDivElement } => {
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        position: 'relative',
        height: '14px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        marginBottom: '4px',
      });
      const fill = document.createElement('div');
      Object.assign(fill.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        background: color,
        transformOrigin: 'left',
        transition: 'transform 120ms linear',
      });
      const text = document.createElement('div');
      Object.assign(text.style, {
        position: 'absolute',
        inset: '0',
        font: '700 10px ui-monospace, monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textShadow: '0 1px 2px #000',
      });
      wrap.append(fill, text);
      return { wrap, fill, text };
    };

    const hp = makeBar('linear-gradient(180deg,#4ade80,#16a34a)');
    const mana = makeBar('linear-gradient(180deg,#60a5fa,#2563eb)');
    panel.append(hp.wrap, mana.wrap);
    this.hpFill = hp.fill;
    this.hpText = hp.text;
    this.manaFill = mana.fill;
    this.manaText = mana.text;
    this.root.appendChild(panel);
  }

  /** Refresh bars, cooldown sweeps, and mana dimming. Call once per frame. */
  public update(sim: MatchSim): void {
    const p = sim.player;
    this.hpFill.style.transform = `scaleX(${Math.max(0, p.currentHp / p.maxHp)})`;
    this.hpText.textContent = `${Math.ceil(p.currentHp)} / ${p.maxHp}`;
    this.manaFill.style.transform = `scaleX(${Math.max(0, p.currentMana / p.maxMana)})`;
    this.manaText.textContent = `${Math.floor(p.currentMana)} / ${p.maxMana}`;

    for (const action of SKILL_ACTIONS) {
      const cdEl = this.cooldownEls.get(action);
      const btn = this.buttonEls.get(action);
      const skill = sim.skillRuntime.getSkillForAction(action);
      if (!cdEl || !btn || !skill) continue;

      const remaining = sim.skillRuntime.getCooldownRemaining(action);
      const total = sim.skillRuntime.getCooldownTotal(action);
      if (remaining > 0 && total > 0) {
        const frac = remaining / total; // 1 → just used, 0 → ready
        cdEl.style.background = `conic-gradient(rgba(4,6,10,0.78) ${frac * 360}deg, transparent 0deg)`;
      } else {
        cdEl.style.background = 'transparent';
      }

      const enoughMana = p.currentMana >= skill.manaCost;
      btn.style.opacity = enoughMana || remaining > 0 ? '1' : '0.45';
      btn.style.borderColor = enoughMana ? 'rgba(255,255,255,0.45)' : 'rgba(96,165,250,0.6)';
    }
  }

  public destroy(): void {
    this.root.remove();
  }
}
