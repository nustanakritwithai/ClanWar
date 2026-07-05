import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Phase 6C: floating combat text via CSS2D — damage numbers, +heal, denied
// feedback ("NO MANA" / "CD"), and the dummy's persistent HP label. DOM text
// stays crisp at every DPI and is styled with plain CSS.

const TEXT_LIFETIME_MS = 650;

export class CombatTextLayer {
  private readonly cssRenderer: CSS2DRenderer;
  private readonly scene: THREE.Scene;

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.scene = scene;
    this.cssRenderer = new CSS2DRenderer();
    this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
    const el = this.cssRenderer.domElement;
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.overflow = 'hidden';
    container.style.position = 'relative';
    container.appendChild(el);
  }

  public resize(width: number, height: number): void {
    this.cssRenderer.setSize(width, height);
  }

  public render(camera: THREE.Camera): void {
    this.cssRenderer.render(this.scene, camera);
  }

  /** Floating damage number above a world point. */
  public damageNumber(x: number, y: number, amount: number): void {
    this.floating(x, y, 70, `${amount}`, {
      color: '#fff',
      textShadow: '0 1px 3px #000, 0 0 8px rgba(249,115,22,0.7)',
      fontSize: '17px',
      fontWeight: '800',
    });
  }

  public healNumber(x: number, y: number, amount: number): void {
    this.floating(x, y, 70, `+${amount}`, {
      color: '#4ade80',
      textShadow: '0 1px 3px #000',
      fontSize: '15px',
      fontWeight: '700',
    });
  }

  public denied(x: number, y: number, reason: 'mana' | 'cooldown'): void {
    this.floating(x, y, 96, reason === 'mana' ? 'NO MANA' : 'CD', {
      color: '#fff',
      background: 'rgba(220,38,38,0.85)',
      padding: '1px 5px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: '700',
    });
  }

  /** Persistent label that follows a world position (dummy HP readout). */
  public createLabel(x: number, y: number, height: number): { set(text: string): void; setPosition(x: number, y: number): void } {
    const div = document.createElement('div');
    Object.assign(div.style, {
      color: '#e6edf3',
      background: 'rgba(0,0,0,0.55)',
      padding: '1px 6px',
      borderRadius: '3px',
      font: '700 11px ui-monospace, monospace',
      whiteSpace: 'nowrap',
    });
    const obj = new CSS2DObject(div);
    obj.position.set(x, height, y);
    this.scene.add(obj);
    return {
      set: (text: string) => { div.textContent = text; },
      setPosition: (px: number, py: number) => { obj.position.set(px, height, py); },
    };
  }

  private floating(x: number, y: number, height: number, text: string, style: Partial<CSSStyleDeclaration>): void {
    const div = document.createElement('div');
    div.textContent = text;
    Object.assign(div.style, {
      fontFamily: 'system-ui, sans-serif',
      whiteSpace: 'nowrap',
      transition: `transform ${TEXT_LIFETIME_MS}ms ease-out, opacity ${TEXT_LIFETIME_MS}ms ease-in`,
      willChange: 'transform, opacity',
    } as Partial<CSSStyleDeclaration>, style);

    const obj = new CSS2DObject(div);
    // Small horizontal jitter so rapid hits don't stack into one column.
    obj.position.set(x + (Math.random() - 0.5) * 26, height, y);
    this.scene.add(obj);

    // Kick the float-up animation on the next frame, then clean up.
    requestAnimationFrame(() => {
      div.style.transform = 'translateY(-34px)';
      div.style.opacity = '0';
    });
    window.setTimeout(() => {
      this.scene.remove(obj);
      div.remove();
    }, TEXT_LIFETIME_MS + 60);
  }
}
