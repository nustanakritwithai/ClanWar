import * as THREE from 'three';
import type { SimObjectiveSnapshot } from '../game/sim/SimObjectives';
import type { SimCaptureSnapshot } from '../game/sim/SimCapture';
import type { CombatTextLayer } from './CombatTextLayer';

// Phase 6E: dynamic dressing for gates/cores and capture points. The static
// low-poly structures come from MapBuilder (6B); this view adds what changes
// at runtime — HP bars, state rings, hit flashes, destroyed styling, and
// capture ownership/progress rings — driven purely by sim snapshots.

const BLUE = 0x60a5fa;
const RED = 0xf87171;
const NEUTRAL = 0x9ca3af;
const VULNERABLE = 0xfbbf24;

interface Label {
  set(t: string): void;
  setPosition(x: number, y: number): void;
  remove(): void;
}

// --- gates + cores ----------------------------------------------------------

interface ObjectiveVisual {
  hpBg: THREE.Sprite;
  hpFill: THREE.Sprite;
  stateRing: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  label: Label;
  lastHp: number;
  flash: number;
  destroyedApplied: boolean;
  barWidth: number;
}

export class ObjectiveView3D {
  public readonly group = new THREE.Group();
  private readonly views = new Map<string, ObjectiveVisual>();
  private readonly combatText: CombatTextLayer;
  private readonly structures: ReadonlyMap<string, THREE.Group>;

  constructor(combatText: CombatTextLayer, structures: ReadonlyMap<string, THREE.Group>) {
    this.combatText = combatText;
    this.structures = structures;
  }

  public sync(objectives: readonly SimObjectiveSnapshot[], dt: number): void {
    for (const obj of objectives) {
      let v = this.views.get(obj.id);
      if (!v) {
        v = this.create(obj);
        this.views.set(obj.id, v);
      }

      const ratio = Math.max(0, obj.currentHp / obj.maxHp);
      v.hpFill.scale.x = Math.max(0.001, v.barWidth * ratio);
      v.hpFill.position.x = obj.x - (v.barWidth * (1 - ratio)) / 2;
      (v.hpFill.material as THREE.SpriteMaterial).color.set(
        ratio > 0.5 ? (obj.team === 'blue' ? BLUE : RED) : ratio > 0.25 ? 0xf97316 : 0xef4444,
      );

      if (obj.currentHp < v.lastHp) v.flash = 0.15;
      v.lastHp = obj.currentHp;

      // State ring: gray shield (protected core) / amber pulse (vulnerable or
      // under attack) / hidden (intact gate) / dark (destroyed).
      const t = performance.now() / 300;
      if (obj.combatState === 'destroyed') {
        v.ringMat.color.set(0x374151);
        v.ringMat.opacity = 0.4;
        v.stateRing.visible = true;
      } else if (obj.combatState === 'protected') {
        v.ringMat.color.set(NEUTRAL);
        v.ringMat.opacity = 0.55;
        v.stateRing.visible = true;
      } else if (obj.combatState === 'vulnerable' || obj.combatState === 'under_attack') {
        v.ringMat.color.set(obj.combatState === 'under_attack' ? 0xef4444 : VULNERABLE);
        v.ringMat.opacity = 0.45 + 0.25 * Math.sin(t * 4);
        v.stateRing.visible = true;
      } else {
        v.stateRing.visible = false;
      }

      // Hit flash on the static structure.
      const structure = this.structures.get(obj.id);
      if (structure) {
        if (v.flash > 0) {
          v.flash -= dt;
          this.tintStructure(structure, 0xffffff, 0.6);
        } else if (obj.combatState !== 'destroyed') {
          this.tintStructure(structure, 0x000000, 0);
        }

        if (obj.combatState === 'destroyed' && !v.destroyedApplied) {
          v.destroyedApplied = true;
          // Collapse: sink + shrink + darken. Cheap but reads clearly.
          structure.scale.set(1, 0.35, 1);
          structure.position.y = -6;
          this.tintStructure(structure, 0x000000, 0, 0x1f2937);
        }
      }

      const stateText =
        obj.combatState === 'destroyed'
          ? (obj.type === 'gate' ? 'BREACHED' : 'DESTROYED')
          : obj.combatState === 'protected'
            ? '🛡 Protected'
            : `${Math.ceil(obj.currentHp)}/${obj.maxHp}`;
      const name = `${obj.team === 'blue' ? 'Blue' : 'Red'} ${obj.type === 'gate' ? 'Gate' : 'Core'}`;
      v.label.set(`${name} · ${stateText}`);
      v.hpBg.visible = obj.combatState !== 'destroyed';
      v.hpFill.visible = obj.combatState !== 'destroyed';
    }
  }

  private tintStructure(structure: THREE.Group, emissive: number, intensity: number, baseColor?: number): void {
    structure.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mat = child.material as THREE.Material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.emissive.set(emissive);
        mat.emissiveIntensity = intensity;
        if (baseColor !== undefined) mat.color.set(baseColor);
      }
    });
  }

  private create(obj: SimObjectiveSnapshot): ObjectiveVisual {
    const barWidth = obj.type === 'core' ? 120 : 90;
    const barY = obj.type === 'core' ? 210 : 165;

    const hpBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x111827, transparent: true, opacity: 0.85 }));
    hpBg.scale.set(barWidth + 6, 12, 1);
    hpBg.position.set(obj.x, barY, obj.y);
    this.group.add(hpBg);

    const hpFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: obj.team === 'blue' ? BLUE : RED }));
    hpFill.scale.set(barWidth, 8, 1);
    hpFill.position.set(obj.x, barY, obj.y);
    this.group.add(hpFill);

    const ringMat = new THREE.MeshBasicMaterial({
      color: NEUTRAL, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    });
    const stateRing = new THREE.Mesh(
      new THREE.RingGeometry(obj.radius + 6, obj.radius + 14, 40),
      ringMat,
    );
    stateRing.rotation.x = -Math.PI / 2;
    stateRing.position.set(obj.x, 1.5, obj.y);
    this.group.add(stateRing);

    const label = this.combatText.createLabel(obj.x, obj.y, barY + 26, {
      color: obj.team === 'blue' ? '#bfdbfe' : '#fecaca',
      background: 'rgba(17,24,39,0.8)',
    });

    return { hpBg, hpFill, stateRing, ringMat, label, lastHp: obj.currentHp, flash: 0, destroyedApplied: false, barWidth };
  }
}

// --- capture points ----------------------------------------------------------

interface CaptureVisual {
  ownerRing: THREE.Mesh;
  ownerMat: THREE.MeshBasicMaterial;
  progressArc: THREE.Mesh;
  label: Label;
  lastProgressGeomStep: number;
}

export class CaptureView3D {
  public readonly group = new THREE.Group();
  private readonly views = new Map<string, CaptureVisual>();
  private readonly combatText: CombatTextLayer;

  constructor(combatText: CombatTextLayer) {
    this.combatText = combatText;
  }

  public sync(points: readonly SimCaptureSnapshot[]): void {
    for (const pt of points) {
      let v = this.views.get(pt.id);
      if (!v) {
        v = this.create(pt);
        this.views.set(pt.id, v);
      }

      const ownerColor = pt.owner === 'blue' ? BLUE : pt.owner === 'red' ? RED : NEUTRAL;
      v.ownerMat.color.set(ownerColor);
      v.ownerMat.opacity = pt.captureState === 'capturing' ? 0.85 : 0.45;

      // Progress arc: rebuild geometry only when the visible step changes
      // (2° granularity) to avoid churning buffers every frame.
      const active = pt.captureState === 'capturing' || (pt.captureProgress > 0 && pt.captureProgress < 100);
      v.progressArc.visible = active && pt.captureProgress > 0;
      if (v.progressArc.visible) {
        const step = Math.round((pt.captureProgress / 100) * 180);
        if (step !== v.lastProgressGeomStep && step > 0) {
          v.lastProgressGeomStep = step;
          v.progressArc.geometry.dispose();
          v.progressArc.geometry = new THREE.RingGeometry(
            pt.radius - 10, pt.radius - 2, 48, 1,
            -Math.PI / 2, (step / 180) * Math.PI * 2,
          );
        }
      }

      v.label.set(
        pt.captureState === 'capturing'
          ? `${pt.label} ${Math.floor(pt.captureProgress)}%`
          : pt.owner !== 'neutral'
            ? `${pt.label} (${pt.owner === 'blue' ? 'Blue' : 'Red'})`
            : pt.label,
      );
    }
  }

  private create(pt: SimCaptureSnapshot): CaptureVisual {
    const ownerMat = new THREE.MeshBasicMaterial({
      color: NEUTRAL, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    });
    const ownerRing = new THREE.Mesh(new THREE.RingGeometry(pt.radius - 2, pt.radius + 4, 48), ownerMat);
    ownerRing.rotation.x = -Math.PI / 2;
    ownerRing.position.set(pt.x, 1.2, pt.y);
    this.group.add(ownerRing);

    const progressArc = new THREE.Mesh(
      new THREE.RingGeometry(pt.radius - 10, pt.radius - 2, 48, 1, -Math.PI / 2, 0.01),
      new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    progressArc.rotation.x = -Math.PI / 2;
    progressArc.position.set(pt.x, 1.4, pt.y);
    progressArc.visible = false;
    this.group.add(progressArc);

    const label = this.combatText.createLabel(pt.x, pt.y, 96, {
      color: '#d1d5db',
      background: 'rgba(17,24,39,0.65)',
      font: '600 10px ui-monospace, monospace',
    });

    return { ownerRing, ownerMat, progressArc, label, lastProgressGeomStep: 0 };
  }
}
