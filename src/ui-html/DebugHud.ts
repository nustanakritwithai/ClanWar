import { SHOW_DEBUG_OVERLAY } from '../game/constants';

// Phase 6A: minimal debug overlay for the 3D path (fps / position / input
// mode). Same toggle keys as the 2D Match debug overlay: ` (backquote) or F1.

export class DebugHud {
  private readonly el: HTMLDivElement;
  private visible = SHOW_DEBUG_OVERLAY;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== 'Backquote' && e.code !== 'F1') return;
    e.preventDefault();
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  };

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    const s = this.el.style;
    s.position = 'fixed';
    s.top = '8px';
    s.left = '8px';
    s.padding = '6px 10px';
    s.background = 'rgba(11,14,19,0.7)';
    s.color = '#e6edf3';
    s.font = '12px/1.5 ui-monospace, monospace';
    s.borderRadius = '6px';
    s.pointerEvents = 'none';
    s.zIndex = '30';
    s.whiteSpace = 'pre';
    s.display = this.visible ? 'block' : 'none';
    root.appendChild(this.el);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public set(text: string): void {
    if (this.visible) this.el.textContent = text;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.el.remove();
  }
}
