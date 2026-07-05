import * as THREE from 'three';
import type { ProjectileSimState } from '../game/sim/MatchSim';

// Phase 6C: renders the sim's live skill projectiles (Power Shot arrow,
// Fireball). Meshes are keyed by projectile id and diffed against the sim
// list every frame — spawn/despawn needs no events.

const FLIGHT_HEIGHT = 48; // chest height above the gameplay plane

export class ProjectileView3D {
  public readonly group = new THREE.Group();

  private readonly meshes = new Map<number, THREE.Mesh>();
  private readonly arrowGeo = new THREE.ConeGeometry(5, 30, 6);
  private readonly fireballGeo = new THREE.IcosahedronGeometry(13);
  private readonly arrowMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xfde68a,
    emissiveIntensity: 0.35,
    flatShading: true,
  });
  private readonly fireballMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xff6a00,
    emissiveIntensity: 0.8,
    flatShading: true,
  });

  public sync(projectiles: readonly ProjectileSimState[], alpha: number): void {
    const seen = new Set<number>();

    for (const proj of projectiles) {
      seen.add(proj.id);
      let mesh = this.meshes.get(proj.id);
      if (!mesh) {
        mesh = proj.visual === 'fireball'
          ? new THREE.Mesh(this.fireballGeo, this.fireballMat)
          : new THREE.Mesh(this.arrowGeo, this.arrowMat);
        if (proj.visual === 'arrow') {
          // Cone points +y by default → lay it flat pointing +x, then yaw.
          mesh.geometry = this.arrowGeo;
        }
        this.meshes.set(proj.id, mesh);
        this.group.add(mesh);
      }
      const x = proj.prevX + (proj.x - proj.prevX) * alpha;
      const y = proj.prevY + (proj.y - proj.prevY) * alpha;
      mesh.position.set(x, FLIGHT_HEIGHT, y);
      if (proj.visual === 'arrow') {
        mesh.rotation.set(0, -proj.angle, -Math.PI / 2, 'YXZ');
      } else {
        mesh.rotation.y += 0.2; // tumbling fireball
      }
    }

    for (const [id, mesh] of this.meshes) {
      if (!seen.has(id)) {
        this.group.remove(mesh);
        this.meshes.delete(id);
      }
    }
  }
}
