import * as THREE from 'three';
import { COLORS } from '../game/constants';
import type { QualitySettings } from './Quality';

// Three.js renderer shell — WebGL context, scene, lights, resize.
//
// Phase 6G: quality-tier aware. Pixel ratio cap and antialias come from the
// tier (antialias is fixed at construction — a context can't change it);
// shadows are PCF on the high tier only, with the sun's shadow box following
// the player so the whole 3000×4200 map never needs one giant shadow map.

export class Renderer3D {
  public readonly scene: THREE.Scene;
  public readonly webgl: THREE.WebGLRenderer;
  private readonly sun: THREE.DirectionalLight;
  private pixelRatioCap: number;

  constructor(container: HTMLElement, quality: QualitySettings) {
    this.pixelRatioCap = quality.pixelRatioCap;
    this.webgl = new THREE.WebGLRenderer({ antialias: quality.antialias });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.webgl.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    // Soften the horizon so the map edge doesn't cut hard against the sky.
    this.scene.fog = new THREE.Fog(COLORS.bg, 2600, 5200);

    const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x2a3040, 1.05);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff3d6, 1.35);
    this.sun.position.set(-900, 1500, 700);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    if (quality.shadows) this.enableShadows();
  }

  private enableShadows(): void {
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // Tight box around the camera's neighborhood; recentered per frame.
    const cam = this.sun.shadow.camera;
    cam.left = -900;
    cam.right = 900;
    cam.top = 900;
    cam.bottom = -900;
    cam.near = 200;
    cam.far = 3600;
    this.sun.shadow.bias = -0.0004;
  }

  /** Apply a (downgraded) tier at runtime: pixel ratio + shadows only —
   * antialias is baked into the context. */
  public applyQuality(quality: QualitySettings): void {
    this.pixelRatioCap = quality.pixelRatioCap;
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
    if (!quality.shadows && this.webgl.shadowMap.enabled) {
      this.webgl.shadowMap.enabled = false;
      this.sun.castShadow = false;
    }
  }

  /** Keep the sun's shadow box centered on the action (player position). */
  public followSun(x: number, z: number): void {
    if (!this.sun.castShadow) return;
    this.sun.position.set(x - 900, 1500, z + 700);
    this.sun.target.position.set(x, 0, z);
    this.sun.target.updateMatrixWorld();
  }

  public resize(width: number, height: number): void {
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
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
