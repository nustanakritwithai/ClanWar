import * as THREE from 'three';
import { COLORS } from '../game/constants';

// Phase 6A: Three.js renderer shell — WebGL context, scene, lights, resize.
//
// Mobile-first defaults: pixel ratio capped at 2, no shadow maps yet (quality
// tiers with shadows arrive in 6B+), one hemisphere + one directional light
// for the low-poly stylized look.

const MAX_PIXEL_RATIO = 2;

export class Renderer3D {
  public readonly scene: THREE.Scene;
  public readonly webgl: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.webgl.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    // Soften the horizon so the map edge doesn't cut hard against the sky.
    this.scene.fog = new THREE.Fog(COLORS.bg, 2600, 5200);

    const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x2a3040, 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d6, 1.35);
    sun.position.set(-900, 1500, 700);
    this.scene.add(sun);
  }

  public resize(width: number, height: number): void {
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.webgl.setSize(width, height);
  }

  public render(camera: THREE.Camera): void {
    this.webgl.render(this.scene, camera);
  }

  public dispose(): void {
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}
