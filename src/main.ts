// Single entry point. Picks the renderer, then dynamic-imports its bootstrap
// so each mode only downloads its own engine chunk:
//   default          → Phaser 2D game (unchanged behavior)
//   ?renderer=3d     → Phase 6 Three.js renderer (2.5D: same sim plane, 3D view)
const renderer = new URLSearchParams(window.location.search).get('renderer');

if (renderer === '3d') {
  import('./game3d/boot3d').then((m) => m.boot3d());
} else {
  import('./main2d').then((m) => m.boot2d());
}
