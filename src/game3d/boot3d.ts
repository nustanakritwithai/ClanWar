import { smallTwinFortress } from '../game/data/map-small-twin-fortress';
import { HEROES } from '../game/data/heroes';
import { MatchSim, SIM_TICK_SECONDS, type SimEvent } from '../game/sim/MatchSim';
import type { HeroClassId, InputState } from '../game/types';
import { CameraRig } from '../render3d/CameraRig';
import { CombatTextLayer } from '../render3d/CombatTextLayer';
import { DummyView } from '../render3d/DummyView';
import { buildMap } from '../render3d/MapBuilder';
import { PlayerView } from '../render3d/PlayerView';
import { ProjectileView3D } from '../render3d/ProjectileView3D';
import { Renderer3D } from '../render3d/Renderer3D';
import { VfxView3D } from '../render3d/VfxView3D';
import { CombatHud } from '../ui-html/CombatHud';
import { DebugHud } from '../ui-html/DebugHud';
import { InputSystem3D } from './InputSystem3D';

// Phase 6C bootstrap: fixed-tick simulation (60 Hz) + rAF rendering with
// interpolation. Entered via ?renderer=3d; the Phaser 2D game stays the
// default until the Phase 6E parity gate.
//
// ?class=<heroClassId> picks the hero; defaults to warrior.

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

  const dummyView = new DummyView(sim.dummy);
  renderer.scene.add(dummyView.group);

  const projectileView = new ProjectileView3D();
  renderer.scene.add(projectileView.group);

  const vfx = new VfxView3D();
  renderer.scene.add(vfx.group);

  const combatText = new CombatTextLayer(container, renderer.scene);
  const dummyLabel = combatText.createLabel(sim.dummy.x, sim.dummy.y, 138);

  const cameraRig = new CameraRig(container.clientWidth / container.clientHeight);
  cameraRig.snapTo(sim.player.x, sim.player.y);

  const input = new InputSystem3D(document.body);
  const hud = new CombatHud(document.body, sim, (action) => input.queueAction(action));
  const debugHud = new DebugHud(document.body);

  window.addEventListener('resize', () => {
    renderer.resize(container.clientWidth, container.clientHeight);
    combatText.resize(container.clientWidth, container.clientHeight);
    cameraRig.resize(container.clientWidth / container.clientHeight);
    input.handleResize();
  });

  // Read-only state inspection for verification / debug tooling, mirroring
  // the 2D __CLANWAR_GAME__ hook.
  (window as unknown as Record<string, unknown>).__CLANWAR_3D__ = { sim, input: input.state };

  function dispatchEvent(ev: SimEvent): void {
    switch (ev.type) {
      case 'attackSwing':
        vfx.attackSwing(ev.x, ev.y, ev.facing, ev.range, ev.bolt);
        break;
      case 'slash':
        vfx.slash(ev.x, ev.y, ev.facing);
        break;
      case 'castFlash':
        vfx.castFlash(ev.x, ev.y);
        break;
      case 'dummyHit':
        vfx.hitSpark(ev.x, ev.y);
        dummyView.flash();
        break;
      case 'impactBurst':
        vfx.impactBurst(ev.x, ev.y);
        break;
      case 'aoeMarker':
        vfx.aoeMarker(ev.x, ev.y, ev.radius, ev.kind);
        break;
      case 'damageNumber':
        combatText.damageNumber(ev.x, ev.y, ev.amount);
        break;
      case 'heal':
        vfx.heal(ev.x, ev.y);
        combatText.healNumber(ev.x, ev.y, ev.amount);
        break;
      case 'denied':
        combatText.denied(sim.player.x, sim.player.y, ev.reason);
        break;
      case 'dummyKilled':
      case 'dummyReset':
        break;
    }
  }

  /** Action presses are edges — consume them after the first tick so a slow
   * frame running multiple ticks can't double-fire an attack/skill. */
  function clearActionEdges(state: InputState): void {
    state.attackPressed = false;
    state.skill1Pressed = false;
    state.skill2Pressed = false;
    state.skill3Pressed = false;
    state.ultimatePressed = false;
    state.warActionPressed = false;
    state.item1Pressed = false;
    state.item2Pressed = false;
  }

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
      clearActionEdges(input.state);
      accumulator -= SIM_TICK_SECONDS;
    }

    for (const ev of sim.drainEvents()) {
      dispatchEvent(ev);
    }

    const alpha = accumulator / SIM_TICK_SECONDS;
    mapView.update(dt);
    playerView.sync(sim.player, alpha, dt);
    dummyView.sync(sim.dummy, dt);
    projectileView.sync(sim.getProjectiles(), alpha);
    vfx.update(dt);
    hud.update(sim);
    dummyLabel.set(`Dummy ${Math.ceil(sim.dummy.currentHp)}/${sim.dummy.maxHp}`);

    const p = sim.player;
    cameraRig.follow(p.prevX + (p.x - p.prevX) * alpha, p.prevY + (p.y - p.prevY) * alpha, dt);
    renderer.render(cameraRig.camera);
    combatText.render(cameraRig.camera);

    frames += 1;
    if (now - fpsWindowStart >= 500) {
      fps = Math.round((frames * 1000) / (now - fpsWindowStart));
      frames = 0;
      fpsWindowStart = now;
      debugHud.set(
        `3D · Phase 6C · ${HEROES[heroClass].name}\n` +
          `fps ${fps} · pos ${Math.round(p.x)},${Math.round(p.y)}\n` +
          `input ${input.state.inputMode} · ${sim.lastCombatResult}`,
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
