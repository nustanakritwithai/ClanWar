import { smallTwinFortress } from '../game/data/map-small-twin-fortress';
import { HEROES } from '../game/data/heroes';
import { MatchSim, SIM_TICK_SECONDS } from '../game/sim/MatchSim';
import type { HeroClassId } from '../game/types';
import { CameraRig } from '../render3d/CameraRig';
import { buildMap } from '../render3d/MapBuilder';
import { PlayerView } from '../render3d/PlayerView';
import { Renderer3D } from '../render3d/Renderer3D';
import { DebugHud } from '../ui-html/DebugHud';
import { InputSystem3D } from './InputSystem3D';

// Phase 6A bootstrap: fixed-tick simulation (60 Hz) + rAF rendering with
// interpolation. Entered via ?renderer=3d; the Phaser 2D game stays the
// default until the Phase 6E parity gate.
//
// ?class=<heroClassId> picks the hero (movement speed parity checks);
// defaults to warrior.

/** Cap for a single frame's simulated time (tab was hidden / long GC). */
const MAX_FRAME_SECONDS = 0.25;

export function boot3d(): void {
  const container = document.getElementById('game-root');
  if (!container) throw new Error('#game-root not found');

  const heroClass = resolveHeroClass();
  const map = smallTwinFortress;

  const sim = new MatchSim(map, heroClass);
  const renderer = new Renderer3D(container);
  const mapView = buildMap(map);
  renderer.scene.add(mapView.group);

  const playerView = new PlayerView();
  renderer.scene.add(playerView.group);

  const cameraRig = new CameraRig(container.clientWidth / container.clientHeight);
  cameraRig.snapTo(sim.player.x, sim.player.y);

  const input = new InputSystem3D(document.body);
  const hud = new DebugHud(document.body);

  window.addEventListener('resize', () => {
    renderer.resize(container.clientWidth, container.clientHeight);
    cameraRig.resize(container.clientWidth / container.clientHeight);
    input.handleResize();
  });

  // Read-only state inspection for mobile verification / debug tooling,
  // mirroring the 2D __CLANWAR_GAME__ hook.
  (window as unknown as Record<string, unknown>).__CLANWAR_3D__ = { sim, input: input.state };

  let last = performance.now();
  let accumulator = 0;
  let fps = 0;
  let frames = 0;
  let fpsWindowStart = last;

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
    last = now;

    input.update();

    accumulator += dt;
    while (accumulator >= SIM_TICK_SECONDS) {
      sim.tick(input.state);
      accumulator -= SIM_TICK_SECONDS;
    }

    const alpha = accumulator / SIM_TICK_SECONDS;
    mapView.update(dt);
    playerView.sync(sim.player, alpha, dt);

    const p = sim.player;
    cameraRig.follow(p.prevX + (p.x - p.prevX) * alpha, p.prevY + (p.y - p.prevY) * alpha, dt);
    renderer.render(cameraRig.camera);

    frames += 1;
    if (now - fpsWindowStart >= 500) {
      fps = Math.round((frames * 1000) / (now - fpsWindowStart));
      frames = 0;
      fpsWindowStart = now;
      hud.set(
        `3D · Phase 6B · ${HEROES[heroClass].name}\n` +
          `fps ${fps} · pos ${Math.round(p.x)},${Math.round(p.y)}\n` +
          `input ${input.state.inputMode} · last ${input.state.lastAction || '-'}`,
      );
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function resolveHeroClass(): HeroClassId {
  const raw = new URLSearchParams(window.location.search).get('class');
  return raw && raw in HEROES ? (raw as HeroClassId) : 'warrior';
}
