import { smallTwinFortress } from '../game/data/map-small-twin-fortress';
import { HEROES } from '../game/data/heroes';
import { MatchSim, SIM_TICK_SECONDS, type MatchSimOptions, type SimEvent } from '../game/sim/MatchSim';
import { isBotEncounterId, isBotPlayableClass } from '../game/data/bot-player-config';
import type { HeroClassId, InputState } from '../game/types';
import { BotView3D } from '../render3d/BotView3D';
import { CameraRig } from '../render3d/CameraRig';
import { CombatTextLayer } from '../render3d/CombatTextLayer';
import { DummyView } from '../render3d/DummyView';
import { buildMap } from '../render3d/MapBuilder';
import { CaptureView3D, ObjectiveView3D } from '../render3d/ObjectiveView3D';
import { PlayerView } from '../render3d/PlayerView';
import { ProjectileView3D } from '../render3d/ProjectileView3D';
import { Renderer3D } from '../render3d/Renderer3D';
import { VfxView3D } from '../render3d/VfxView3D';
import { CombatHud } from '../ui-html/CombatHud';
import { DebugHud } from '../ui-html/DebugHud';
import { MatchHud } from '../ui-html/MatchHud';
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

  const sim = new MatchSim(map, heroClass, resolveMatchOptions());
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

  const botView = new BotView3D(combatText);
  renderer.scene.add(botView.group);

  const objectiveView = new ObjectiveView3D(combatText, mapView.structures);
  renderer.scene.add(objectiveView.group);

  const captureView = new CaptureView3D(combatText);
  renderer.scene.add(captureView.group);

  const cameraRig = new CameraRig(container.clientWidth / container.clientHeight);
  cameraRig.snapTo(sim.player.x, sim.player.y);

  const input = new InputSystem3D(document.body);
  const hud = new CombatHud(document.body, sim, (action) => input.queueAction(action));
  const matchHud = new MatchHud(document.body);
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
      // Phase 6D: bot-side events.
      case 'hitSpark':
        vfx.hitSpark(ev.x, ev.y);
        break;
      case 'botCastFlash':
        vfx.castFlash(ev.x, ev.y);
        break;
      case 'botSlash':
        vfx.slash(ev.x, ev.y, ev.facing);
        break;
      case 'botBolt':
        vfx.botBolt(ev.x, ev.y, ev.facing, ev.travel, ev.kind);
        break;
      case 'botHeal':
        vfx.heal(ev.x, ev.y);
        break;
      case 'playerHurt':
        vfx.hitSpark(ev.x, ev.y);
        playerView.hurtFlash();
        combatText.damageNumber(ev.x, ev.y, ev.amount);
        break;
      // Phase 6E: objectives / capture / match flow.
      case 'objectiveHit':
        vfx.hitSpark(ev.x, ev.y);
        combatText.damageNumber(ev.x, ev.y, ev.amount);
        break;
      case 'objectiveDestroyed':
        vfx.impactBurst(ev.x, ev.y);
        break;
      case 'objectiveFeedback':
      case 'captureFeedback':
        combatText.floatText(ev.x, ev.y, ev.message, ev.color);
        break;
      case 'captureCompleted':
        combatText.floatText(ev.x, ev.y - 24, `+${ev.score} Objective Score`, '#fbbf24');
        break;
      case 'priorityChanged':
        break; // MatchHud reads the label each frame
      case 'finalMinute':
        matchHud.toast('Final Minute');
        break;
      case 'timeUp':
        matchHud.toast('Time Up', '#f4d35e');
        break;
      case 'matchOver':
        matchHud.showMatchOver(ev.resolution);
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
    botView.sync(sim.getBots(), alpha, dt);
    objectiveView.sync(sim.objectives.getSnapshots(), dt);
    captureView.sync(sim.capture.getSnapshots());
    projectileView.sync(sim.getProjectiles(), alpha);
    vfx.update(dt);
    hud.update(sim);
    matchHud.update(sim);
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
      const aliveBots = sim.bots.filter((b) => !b.dead).length;
      debugHud.set(
        `3D · Phase 6E · ${HEROES[heroClass].name}\n` +
          `fps ${fps} · pos ${Math.round(p.x)},${Math.round(p.y)} · hp ${Math.ceil(p.currentHp)}\n` +
          `bots ${aliveBots}/${sim.bots.length} · ${sim.objectives.getPriority()} · ${sim.lastCombatResult}`,
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

/** ?encounter=<preset> spawns a multi-bot mix; ?botClass=<class> a single bot;
 * neither → one Warrior bot (bare-match parity). Mirrors MatchSceneData. */
function resolveMatchOptions(): MatchSimOptions {
  const params = new URLSearchParams(window.location.search);
  const encounter = params.get('encounter');
  if (isBotEncounterId(encounter)) return { encounter };
  const botClass = params.get('botClass');
  if (isBotPlayableClass(botClass)) return { botClass };
  return {};
}
