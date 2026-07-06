// Single entry point. Picks the renderer, then dynamic-imports its bootstrap
// so each mode only downloads its own engine chunk:
//   default          → Three.js 3D renderer (Phase 6E parity gate passed)
//   ?renderer=2d     → legacy Phaser 2D game (kept until Phase 6F removes it)
//   ?renderer=3d     → explicit 3D (same as default, kept for old links)
const renderer = new URLSearchParams(window.location.search).get('renderer');

if (renderer === '2d') {
  import('./main2d').then((m) => m.boot2d());
} else {
  import('./game3d/boot3d').then((m) => m.boot3d());
}
