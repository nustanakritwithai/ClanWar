// Entry point — boots the Three.js renderer (the only runtime since Phase 6F
// removed the legacy Phaser 2D game). The old `?renderer=2d` links simply get
// the 3D game; dynamic import keeps the initial HTML payload tiny.
import('./game3d/boot3d').then((m) => m.boot3d());
