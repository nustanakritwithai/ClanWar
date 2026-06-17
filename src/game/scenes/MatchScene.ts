import Phaser from 'phaser';
import {
  COLORS,
  COMPACT_LAYOUT_HEIGHT,
  CURRENT_PHASE_LABEL,
  PLAYER_TEAM,
  PROJECTILE_HIT_RADIUS,
  SCENE_KEYS,
  SHOW_DEBUG_OVERLAY,
} from '../constants';
import { getHero } from '../data/heroes';
import { smallTwinFortress } from '../data/map-small-twin-fortress';
import { DEFAULT_MELEE_ARC_DEGREES, testAoeCircle, testMeleeArc } from '../combat/HitShapes';
import { getSkillRuntimeType } from '../combat/SkillRuntimeType';
import {
  getSkillPlaceholderNote,
  isVisualOnlyAoe,
  skipsObjectiveDamage,
} from '../combat/SkillPlaceholder';
import type { ActionKey, HeroClassId, MapMarker, MatchSceneData, SkillDefinition, SkillRuntimeType } from '../types';
import { Player } from '../entities/Player';
import { TrainingDummy } from '../entities/TrainingDummy';
import { InputSystem } from '../systems/InputSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { MapRenderer, loadMapVisualAssets } from '../systems/MapRenderer';
import { ObjectiveSystem, loadObjectiveAssets } from '../systems/ObjectiveSystem';
import { CaptureSystem, loadCaptureAssets } from '../systems/CaptureSystem';
import { SiegeBuffSystem, loadSiegeBuffAssets } from '../systems/SiegeBuffSystem';
import { MatchTimerSystem, loadMatchTimerAssets } from '../systems/MatchTimerSystem';
import { resolveTimeUp, type MatchResolution } from '../data/match-rules';
import { SkillRuntimeSystem } from '../systems/SkillRuntimeSystem';
import { showCombatText } from '../ui/CombatText';
import { showAoeMarker, showHealBurst, showHealSpark, showHitSpark, showImpactBurst, showSlashArc, loadCombatVisualAssets } from '../ui/CombatVfx';
import { isFullscreenActive, requestGameFullscreen } from '../utils/fullscreen';

import { CAPTURE_OBJECTIVE_IDS } from '../data/capture-objectives';

const HUD_HINT_NORMAL =
  'WASD/Arrows or joystick • J/Q/E/R/F/Space/1/2 or buttons • ` or F1: debug';
const HUD_HINT_COMPACT = 'Move: joystick/WASD • Actions: buttons';

/** Delay between the "Time Up" feedback and the Result screen transition (ms). */
const TIME_UP_RESULT_DELAY_MS = 1300;

const GATE_CORE_MARKER_IDS = new Set(['blueGate', 'blueCore', 'redGate', 'redCore']);
const CAPTURE_MARKER_IDS = new Set<string>(CAPTURE_OBJECTIVE_IDS);

export class MatchScene extends Phaser.Scene {
  private heroClass: HeroClassId = 'guardian';
  public player!: Player;
  public dummy!: TrainingDummy;
  private movement!: InputSystem;
  private skillRuntime!: SkillRuntimeSystem;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private moveVec = new Phaser.Math.Vector2();

  private hintText!: Phaser.GameObjects.Text;
  private statsHud!: Phaser.GameObjects.Text;
  private menuButton!: Phaser.GameObjects.Text;
  private fullscreenButton?: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private debugOverlayVisible = SHOW_DEBUG_OVERLAY;
  private debugToggleHandler?: () => void;
  private fullscreenChangeHandler?: () => void;
  private lastCombatResult = '-';
  private lastHitShapeResult = '-';
  private lastSkillType: SkillRuntimeType | '-' = '-';
  private lastPlaceholderReason = '-';
  private lastSkippedSkillReason = '-';
  private projectileSystem!: ProjectileSystem;
  public mapRenderer!: MapRenderer;
  public objectiveSystem!: ObjectiveSystem;
  public captureSystem!: CaptureSystem;
  public siegeBuffSystem!: SiegeBuffSystem;
  public matchTimerSystem!: MatchTimerSystem;
  private matchResolved = false;

  constructor() {
    super(SCENE_KEYS.Match);
  }

  init(data: MatchSceneData = {}): void {
    this.heroClass = data.heroClass ?? 'guardian';
    this.lastCombatResult = '-';
  }

  preload(): void {
    loadCombatVisualAssets(this.load);
    loadMapVisualAssets(this.load);
    loadObjectiveAssets(this.load);
    loadCaptureAssets(this.load);
    loadSiegeBuffAssets(this.load);
    loadMatchTimerAssets(this.load);
  }

  create(): void {
    const map = smallTwinFortress;
    const hero = getHero(this.heroClass);

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    this.drawGround(map.width, map.height);
    this.mapRenderer = new MapRenderer(this, (obj) => this.registerWorldObject(obj));
    this.mapRenderer.build(map);
    this.buildWalls();
    this.drawMarkers(map.markers);

    this.objectiveSystem = new ObjectiveSystem(this, (obj) => this.registerWorldObject(obj), (outcome) =>
      this.handleMatchEnd(outcome),
    );
    this.objectiveSystem.build();

    this.captureSystem = new CaptureSystem(
      this,
      (obj) => this.registerWorldObject(obj),
      (visible) => this.objectiveSystem.setGateHudVisible(visible),
    );
    this.captureSystem.build();

    this.siegeBuffSystem = new SiegeBuffSystem(
      this,
      this.captureSystem,
      (obj) => this.registerWorldObject(obj),
    );
    this.siegeBuffSystem.build();
    this.objectiveSystem.setSiegeBuffHandlers(
      (team) => this.siegeBuffSystem.getGateBonusMultiplier(team),
      (x, y) => this.siegeBuffSystem.onGateHitWithSiegeBonus(x, y),
    );

    this.matchResolved = false;
    this.matchTimerSystem = new MatchTimerSystem(
      this,
      this.captureSystem,
      (obj) => this.registerWorldObject(obj),
    );
    this.matchTimerSystem.build();

    this.player = new Player(this, map.playerSpawn.x, map.playerSpawn.y, hero);
    this.dummy = new TrainingDummy(this, map.playerSpawn.x, map.playerSpawn.y - 350);
    this.skillRuntime = new SkillRuntimeSystem(this.heroClass);

    this.physics.add.collider(this.player.sprite, this.walls);
    this.physics.add.collider(this.dummy.sprite, this.walls);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.computeZoom());

    const worldObjects = [...this.children.list];

    this.movement = new InputSystem(this);
    this.projectileSystem = new ProjectileSystem(this, {
      registerWorldObject: (obj) => this.registerWorldObject(obj),
      onHit: (event) => this.handleProjectileHit(event),
      onObjectiveHit: (event) => this.handleProjectileObjectiveHit(event),
      checkObjectiveSegment: (ownerTeam, x1, y1, x2, y2, hitRadius, damage) =>
        this.objectiveSystem.handleProjectileSegmentHit(ownerTeam, x1, y1, x2, y2, hitRadius, damage).hit,
      onExpired: (skillName) => {
        this.lastHitShapeResult = `${skillName} expired`;
      },
    });

    this.drawHud();
    this.setupDebugToggle();
    this.setupFullscreenButton();

    const uiObjects = this.children.list.filter((o) => !worldObjects.includes(o));
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.ignore(worldObjects);
    this.cameras.main.ignore(uiObjects);

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  override update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;

    this.movement.update();
    this.player.regenerateMana(deltaSeconds);
    this.skillRuntime.update(deltaSeconds);
    this.objectiveSystem.update(delta);
    this.captureSystem.update(delta, this.player.x, this.player.y, PLAYER_TEAM);
    this.siegeBuffSystem.update(delta);

    if (!this.matchResolved && this.objectiveSystem.getMatchPhase() === 'in_progress') {
      this.matchTimerSystem.update(delta);
      if (this.matchTimerSystem.isExpired()) {
        this.resolveTimeUp();
      }
    }

    const dir = this.movement.getMoveVector(this.moveVec);
    this.player.move(dir);
    this.player.update();
    this.dummy.update();
    this.projectileSystem.update(deltaSeconds, this.dummy);

    this.processActions();
    this.updateStatsHud();
    this.updateDebugOverlay();
  }

  private processActions(): void {
    if (this.matchResolved || this.objectiveSystem.getMatchPhase() !== 'in_progress') return;

    const s = this.movement.state;

    if (s.attackPressed) this.handleAttack();
    if (s.skill1Pressed) this.handleSkill('skill1');
    if (s.skill2Pressed) this.handleSkill('skill2');
    if (s.skill3Pressed) this.handleSkill('skill3');
    if (s.ultimatePressed) this.handleSkill('ultimate');
    if (s.warActionPressed) this.handleSimpleAction('warAction', 'War Action');
    if (s.item1Pressed) this.handleSimpleAction('item1', 'Item 1');
    if (s.item2Pressed) this.handleSimpleAction('item2', 'Item 2');
  }

  private handleAttack(): void {
    this.lastSkillType = 'melee_arc';
    this.player.playActionFeedback('attack');
    this.movement.showButtonCooldown('attack');

    const arc = testMeleeArc(
      this.player.x,
      this.player.y,
      this.player.getFacingAngle(),
      this.dummy.x,
      this.dummy.y,
      this.dummy.radius,
      this.player.attackRange,
      DEFAULT_MELEE_ARC_DEGREES,
    );
    this.lastHitShapeResult = `attack: ${arc.reason}`;

    let hitMessage = 'Attack missed';
    if (arc.hit && this.dummy.canReceiveDamage()) {
      const result = this.dummy.takeDamage(this.player.attack);
      const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#f87171');
      this.registerWorldObject(text);
      hitMessage = `Attack hit ${result.finalDamage}`;
      if (result.killed) {
        this.time.delayedCall(2100, () => {
          if (!this.dummy.isDead()) this.setCombatResult('Dummy reset');
        });
      }
    }

    const objResult = this.objectiveSystem.applyMeleeArcDamage({
      ownerTeam: PLAYER_TEAM,
      casterX: this.player.x,
      casterY: this.player.y,
      facingAngle: this.player.getFacingAngle(),
      range: this.player.attackRange,
      rawDamage: this.player.attack,
      playerGateDamageBonus: this.player.gateDamageBonus,
    });
    if (objResult) {
      hitMessage = `${hitMessage} | objective -${objResult.finalDamage}`;
    }

    this.setCombatResult(hitMessage);
  }

  private handleSimpleAction(action: ActionKey, label: string): void {
    this.player.playActionFeedback(action);
    this.movement.showButtonCooldown(action);
    this.movement.state.lastAction = label;
  }

  private handleSkill(action: ActionKey): void {
    const skill = this.skillRuntime.getSkillForAction(action);
    const result = this.skillRuntime.tryUseSkill(action, this.player);

    if (result.ok && skill) {
      this.player.spendMana(skill.manaCost);
      this.player.playActionFeedback(action);
      this.movement.showButtonCooldown(action, (result.cooldown ?? skill.cooldown) * 1000);
      this.applySkillCombatEffect(skill);
      this.movement.state.lastAction = result.skillName ?? skill.name;
      return;
    }

    if (result.reason === 'cooldown') {
      this.player.playDeniedFeedback('cooldown');
      this.lastSkippedSkillReason = 'cooldown';
      this.movement.state.lastAction = 'Skill on cooldown';
    } else if (result.reason === 'mana') {
      this.player.playDeniedFeedback('mana');
      this.lastSkippedSkillReason = 'mana';
      this.movement.state.lastAction = 'Not enough mana';
    }
  }

  private applySkillCombatEffect(skill: SkillDefinition): void {
    const runtimeType = getSkillRuntimeType(skill);
    this.lastSkillType = runtimeType;
    this.lastPlaceholderReason = getSkillPlaceholderNote(skill.id) ?? '-';
    this.lastSkippedSkillReason = '-';

    switch (runtimeType) {
      case 'melee_arc':
        this.applyMeleeArcSkill(skill);
        return;
      case 'projectile':
        this.applyProjectileSkill(skill);
        return;
      case 'aoe_circle':
        this.applyAoeCircleSkill(skill);
        return;
      case 'heal':
        this.applyHealSkill(skill);
        return;
      default:
        this.applyLegacySkill(skill);
    }
  }

  private applyMeleeArcSkill(skill: SkillDefinition): void {
    const name = skill.name;
    const range = skill.range ?? skill.radius ?? this.player.attackRange;
    const arcDegrees = skill.arc ?? DEFAULT_MELEE_ARC_DEGREES;

    if (skill.damage === undefined) {
      this.lastHitShapeResult = `${name}: no damage`;
      this.setCombatResult(`${name} missed`);
      return;
    }

    const arc = testMeleeArc(
      this.player.x,
      this.player.y,
      this.player.getFacingAngle(),
      this.dummy.x,
      this.dummy.y,
      this.dummy.radius,
      range,
      arcDegrees,
    );
    this.lastHitShapeResult = `${name}: ${arc.reason}`;

    let hitMessage = `${name} missed`;
    if (arc.hit && this.dummy.canReceiveDamage()) {
      const facing = this.player.getFacingAngle();
      if (skill.id === 'warrior_cleave' || skill.id === 'guardian_shield_bash' || skill.id === 'warrior_gate_breaker') {
        showSlashArc(this, this.player.x, this.player.y, facing, (o) => this.registerWorldObject(o));
      }
      showHitSpark(this, this.dummy.x, this.dummy.y, (o) => this.registerWorldObject(o));
      const result = this.dummy.takeDamage(skill.damage);
      const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#f87171');
      this.registerWorldObject(text);
      hitMessage = `${name} hit ${result.finalDamage}`;
    }

    if (!skipsObjectiveDamage(skill.id)) {
      const objResult = this.objectiveSystem.applyMeleeArcDamage({
        ownerTeam: PLAYER_TEAM,
        casterX: this.player.x,
        casterY: this.player.y,
        facingAngle: this.player.getFacingAngle(),
        range,
        arcDegrees,
        rawDamage: skill.damage,
        skillId: skill.id,
        skillGateDamageBonus: skill.gateDamageBonus,
        playerGateDamageBonus: this.player.gateDamageBonus,
      });
      if (objResult) {
        hitMessage = `${hitMessage} | objective -${objResult.finalDamage}`;
      }
    }

    this.setCombatResult(hitMessage);
  }

  private applyProjectileSkill(skill: SkillDefinition): void {
    if (skill.damage === undefined || skill.projectileSpeed === undefined || skill.range === undefined) {
      this.setCombatResult(`${skill.name} failed`);
      return;
    }

    const visual = skill.id === 'mage_fireball' ? 'fireball' : 'arrow';
    this.projectileSystem.spawn({
      x: this.player.x,
      y: this.player.y,
      angle: this.player.getFacingAngle(),
      speed: skill.projectileSpeed,
      maxRange: skill.range,
      hitRadius: PROJECTILE_HIT_RADIUS,
      damage: skill.damage,
      skillId: skill.id,
      skillName: skill.name,
      ownerTeam: PLAYER_TEAM,
      impactAoeRadius: skill.radius,
      visual,
    });
    this.lastHitShapeResult = `${skill.name}: projectile spawned`;
    this.setCombatResult(`${skill.name} fired`);
  }

  private applyAoeCircleSkill(skill: SkillDefinition): void {
    const name = skill.name;
    const radius = skill.radius ?? 100;
    const selfCentered = skill.id === 'priest_holy_circle' || skill.id === 'guardian_war_taunt';
    const center = selfCentered
      ? { x: this.player.x, y: this.player.y }
      : this.getPointInFacingDirection(skill.range ?? radius);

    const tint =
      skill.healPerSecond !== undefined || skill.id === 'priest_holy_circle' ? 0x4ade80 : 0x60a5fa;
    showAoeMarker(this, center.x, center.y, radius, (o) => this.registerWorldObject(o), tint);

    if (isVisualOnlyAoe(skill.id)) {
      this.lastHitShapeResult = `${name}: placeholder marker (no taunt)`;
      this.setCombatResult(`${name} placeholder`);
      return;
    }

    if (skill.healPerSecond !== undefined || (skill.id === 'priest_holy_circle' && skill.heal === undefined)) {
      const healAmount = skill.healPerSecond ?? 45;
      this.lastHitShapeResult = `${name}: aoe_circle heal`;
      const healed = this.player.heal(healAmount);
      if (healed > 0) {
        showHealBurst(this, this.player.x, this.player.y, (o) => this.registerWorldObject(o));
        const text = showCombatText(this, this.player.x, this.player.y - 28, `+${healed}`, '#4ade80');
        this.registerWorldObject(text);
        this.setCombatResult(`${name} +${healed}`);
      } else {
        this.setCombatResult(`${name} (HP full)`);
      }
      return;
    }

    const rawDamage = skill.damage ?? skill.damagePerSecond ?? 0;
    if (rawDamage <= 0) {
      this.lastHitShapeResult = `${name}: aoe_circle no damage`;
      this.setCombatResult(`used ${name}`);
      return;
    }

    const circle = testAoeCircle(
      center.x,
      center.y,
      radius,
      this.dummy.x,
      this.dummy.y,
      this.dummy.radius,
    );
    this.lastHitShapeResult = `${name}: ${circle.reason}`;

    let hitMessage = `${name} missed`;
    if (circle.hit && this.dummy.canReceiveDamage()) {
      showImpactBurst(this, center.x, center.y, (o) => this.registerWorldObject(o));
      const result = this.dummy.takeDamage(rawDamage);
      const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#f87171');
      this.registerWorldObject(text);
      hitMessage = `${name} hit ${result.finalDamage}`;
    }

    if (!skipsObjectiveDamage(skill.id)) {
      const objResult = this.objectiveSystem.applyAoeDamage({
        ownerTeam: PLAYER_TEAM,
        centerX: center.x,
        centerY: center.y,
        radius,
        rawDamage,
        skillId: skill.id,
        skillGateDamageBonus: skill.gateDamageBonus,
        playerGateDamageBonus: this.player.gateDamageBonus,
      });
      if (objResult) {
        this.setCombatResult(`${name} hit ${objResult.finalDamage} objective`);
        return;
      }
    }

    this.setCombatResult(hitMessage);
  }

  private applyHealSkill(skill: SkillDefinition): void {
    const name = skill.name;
    if (skill.heal === undefined) {
      this.setCombatResult(`used ${name}`);
      return;
    }

    this.lastHitShapeResult = `${name}: heal`;
    const healed = this.player.heal(skill.heal);
    if (healed > 0) {
      showHealSpark(this, this.player.x, this.player.y, (o) => this.registerWorldObject(o));
      const text = showCombatText(this, this.player.x, this.player.y - 28, `+${healed}`, '#4ade80');
      this.registerWorldObject(text);
      const label = skill.id === 'priest_revival_prayer' ? `${name} +${healed} (self)` : `Heal +${healed}`;
      this.setCombatResult(label);
    } else {
      this.setCombatResult(`${name} (HP full)`);
    }
  }

  private applyLegacySkill(skill: SkillDefinition): void {
    const name = skill.name;

    if (skill.damage !== undefined) {
      const range = skill.range ?? 160;
      let hitMessage = `${name} missed`;
      if (
        this.dummy.canReceiveDamage() &&
        this.isWithinDistance(this.dummy.x, this.dummy.y, this.dummy.radius, range)
      ) {
        this.lastHitShapeResult = `${name}: legacy range hit`;
        const result = this.dummy.takeDamage(skill.damage);
        const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#f87171');
        this.registerWorldObject(text);
        hitMessage = `${name} hit ${result.finalDamage}`;
      } else {
        this.lastHitShapeResult = `${name}: legacy range miss`;
      }

      if (!skipsObjectiveDamage(skill.id)) {
        const objResult = this.objectiveSystem.applyRangeDamage({
          ownerTeam: PLAYER_TEAM,
          casterX: this.player.x,
          casterY: this.player.y,
          range,
          rawDamage: skill.damage,
          skillGateDamageBonus: skill.gateDamageBonus,
          playerGateDamageBonus: this.player.gateDamageBonus,
        });
        if (objResult) hitMessage = `${hitMessage} | objective -${objResult.finalDamage}`;
      }

      this.setCombatResult(hitMessage);
      return;
    }

    if (skill.heal !== undefined) {
      this.applyHealSkill(skill);
      return;
    }

    this.lastHitShapeResult = `${name}: no combat effect`;
    this.setCombatResult(`used ${name}`);
  }

  private handleProjectileObjectiveHit(event: {
    x: number;
    y: number;
    damage: number;
    skillName: string;
    impactAoeRadius?: number;
  }): void {
    showHitSpark(this, event.x, event.y, (o) => this.registerWorldObject(o));
    this.lastHitShapeResult = `${event.skillName}: objective projectile hit`;
    this.setCombatResult(`${event.skillName} hit objective`);
  }

  private handleProjectileHit(event: {
    x: number;
    y: number;
    damage: number;
    skillId: string;
    skillName: string;
    impactAoeRadius?: number;
  }): void {
    showHitSpark(this, event.x, event.y, (o) => this.registerWorldObject(o));

    if (event.impactAoeRadius !== undefined && event.impactAoeRadius > 0) {
      showImpactBurst(this, event.x, event.y, (o) => this.registerWorldObject(o));
      const circle = testAoeCircle(
        event.x,
        event.y,
        event.impactAoeRadius,
        this.dummy.x,
        this.dummy.y,
        this.dummy.radius,
      );
      this.lastHitShapeResult = `${event.skillName}: projectile+aoe ${circle.reason}`;
      if (circle.hit && this.dummy.canReceiveDamage()) {
        this.applyDamageToDummy(event.damage, event.skillName);
      } else {
        this.setCombatResult(`${event.skillName} missed`);
      }
      if (!skipsObjectiveDamage(event.skillId)) {
        this.objectiveSystem.applyAoeDamage({
          ownerTeam: PLAYER_TEAM,
          centerX: event.x,
          centerY: event.y,
          radius: event.impactAoeRadius,
          rawDamage: event.damage,
          skillId: event.skillId,
        });
      }
      return;
    }

    this.lastHitShapeResult = `${event.skillName}: projectile hit`;
    if (this.dummy.canReceiveDamage()) {
      this.applyDamageToDummy(event.damage, event.skillName);
    }
  }

  private handleMatchEnd(outcome: 'victory' | 'defeat'): void {
    // Core destroyed has priority — stop the timer and skip any time-up resolution.
    this.matchResolved = true;
    this.matchTimerSystem.stop();
    const reason = outcome === 'victory' ? 'enemy_core_destroyed' : 'friendly_core_destroyed';
    const result = {
      outcome,
      reason,
      blueScore: this.captureSystem.getTeamScore('blue'),
      redScore: this.captureSystem.getTeamScore('red'),
      blueCoreHp: this.objectiveSystem.getCoreHp('blue'),
      redCoreHp: this.objectiveSystem.getCoreHp('red'),
    };
    this.game.registry.set('lastMatchResult', result);
    this.scene.start(SCENE_KEYS.Result, result);
  }

  /** Compute the time-up result from current live state without mutating anything. */
  public computeTimeUpResolution(): MatchResolution {
    return resolveTimeUp({
      playerTeam: PLAYER_TEAM,
      blueScore: this.captureSystem.getTeamScore('blue'),
      redScore: this.captureSystem.getTeamScore('red'),
      blueCoreHp: this.objectiveSystem.getCoreHp('blue'),
      redCoreHp: this.objectiveSystem.getCoreHp('red'),
    });
  }

  private resolveTimeUp(): void {
    if (this.matchResolved) return;
    // Core-destroyed result always wins over a same-frame time-up.
    if (this.objectiveSystem.getMatchPhase() !== 'in_progress') return;

    this.matchResolved = true;
    this.objectiveSystem.freeze();

    const result = this.computeTimeUpResolution();
    this.game.registry.set('lastMatchResult', result);
    this.matchTimerSystem.showTimeUp();

    this.time.delayedCall(TIME_UP_RESULT_DELAY_MS, () => {
      this.scene.start(SCENE_KEYS.Result, result);
    });
  }

  private applyDamageToDummy(rawDamage: number, label: string, suffix = ''): void {
    const result = this.dummy.takeDamage(rawDamage);
    const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#f87171');
    this.registerWorldObject(text);
    this.setCombatResult(`${label} hit ${result.finalDamage}${suffix}`);
    if (result.killed) {
      this.time.delayedCall(2100, () => {
        if (!this.dummy.isDead()) this.setCombatResult('Dummy reset');
      });
    }
  }

  private getPointInFacingDirection(distance: number): { x: number; y: number } {
    const angle = this.player.getFacingAngle();
    return {
      x: this.player.x + Math.cos(angle) * distance,
      y: this.player.y + Math.sin(angle) * distance,
    };
  }

  private setCombatResult(message: string): void {
    this.lastCombatResult = message;
    this.movement.state.lastAction = message;
  }

  /** Keep runtime world objects off the fixed UI camera layer. */
  private registerWorldObject(obj: Phaser.GameObjects.GameObject): void {
    if (this.uiCamera) {
      this.uiCamera.ignore(obj);
    }
  }

  private isWithinDistance(
    targetX: number,
    targetY: number,
    targetRadius: number,
    range: number,
  ): boolean {
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    return Math.hypot(dx, dy) <= range + targetRadius;
  }

  private setupDebugToggle(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    this.debugToggleHandler = () => {
      this.debugOverlayVisible = !this.debugOverlayVisible;
      if (this.debugText) {
        this.debugText.setVisible(this.debugOverlayVisible);
      }
    };

    kb.on('keydown-BACK_QUOTE', this.debugToggleHandler);
    kb.on('keydown-F1', this.debugToggleHandler);
  }

  private setupFullscreenButton(): void {
    this.fullscreenButton = this.add
      .text(0, 0, 'Fullscreen', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    this.fullscreenButton.on('pointerdown', async () => {
      await requestGameFullscreen();
      this.updateFullscreenButtonVisibility();
    });

    this.fullscreenChangeHandler = () => this.updateFullscreenButtonVisibility();
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);

    this.updateFullscreenButtonVisibility();
    this.layoutTopHud();
  }

  private updateFullscreenButtonVisibility(): void {
    if (!this.fullscreenButton) return;
    const active = isFullscreenActive();
    this.fullscreenButton.setVisible(!active);
    this.fullscreenButton.setActive(!active);
  }

  private handleShutdown(): void {
    this.scale.off('resize', this.handleResize, this);

    const kb = this.input.keyboard;
    if (kb && this.debugToggleHandler) {
      kb.off('keydown-BACK_QUOTE', this.debugToggleHandler);
      kb.off('keydown-F1', this.debugToggleHandler);
      this.debugToggleHandler = undefined;
    }

    if (this.fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
      document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = undefined;
    }

    this.projectileSystem.destroy();
    this.matchTimerSystem.destroy();
    this.siegeBuffSystem.destroy();
    this.objectiveSystem.destroy();
    this.captureSystem.destroy();
    this.mapRenderer.destroy();
    this.movement.destroy();
  }

  private computeZoom(): number {
    const z = this.scale.width / 1500;
    return Phaser.Math.Clamp(z, 0.45, 1.1);
  }

  private isCompactHud(): boolean {
    return this.scale.height < COMPACT_LAYOUT_HEIGHT;
  }

  private layoutTopHud(): void {
    const { width } = this.scale;
    const compact = this.isCompactHud();
    const topMargin = compact ? 8 : 16;
    const rightMargin = compact ? 10 : 16;
    const hintH = compact ? 22 : 30;

    this.hintText.setPosition(topMargin, topMargin);
    this.hintText.setFontSize(compact ? '12px' : '16px');
    this.hintText.setText(compact ? HUD_HINT_COMPACT : HUD_HINT_NORMAL);

    this.statsHud.setPosition(topMargin, topMargin + hintH);
    this.statsHud.setFontSize(compact ? '11px' : '13px');

    this.menuButton.setPosition(width - rightMargin, topMargin);

    if (this.debugText) {
      const debugY = topMargin + hintH + (compact ? 34 : 40);
      this.debugText.setPosition(topMargin, debugY);
      this.debugText.setFontSize(compact ? '10px' : '13px');
    }

    if (this.fullscreenButton) {
      const menuLeft = this.menuButton.x - this.menuButton.width;
      this.fullscreenButton.setPosition(menuLeft - 10, topMargin);
      this.fullscreenButton.setOrigin(1, 0);
    }
  }

  private handleResize(): void {
    this.cameras.main.setZoom(this.computeZoom());
    this.uiCamera.setSize(this.scale.width, this.scale.height);
    this.movement.handleResize();
    this.objectiveSystem.layoutHud();
    this.captureSystem.layoutHud();
    this.siegeBuffSystem.layoutHud();
    this.matchTimerSystem.layoutHud();
    this.layoutTopHud();
  }

  private drawGround(w: number, h: number): void {
    this.add.rectangle(w / 2, h / 2, w, h, COLORS.ground).setDepth(-100);
    this.add
      .line(0, 0, 0, h / 2, w, h / 2, 0xffffff, 0.08)
      .setOrigin(0, 0)
      .setLineWidth(2)
      .setDepth(-90);
  }

  private buildWalls(): void {
    this.walls = this.physics.add.staticGroup();
    for (const wall of smallTwinFortress.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        COLORS.wall,
      );
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
    }
  }

  private drawMarkers(markers: MapMarker[]): void {
    for (const m of markers) {
      if (GATE_CORE_MARKER_IDS.has(m.id) || CAPTURE_MARKER_IDS.has(m.id)) continue;

      const inBaseBand = m.y >= 3350 || m.y <= 850;
      const color = this.markerColor(m);
      const circle = this.add.circle(m.x, m.y, m.radius, color, inBaseBand ? 0.2 : 0.06);
      circle.setStrokeStyle(2, color, inBaseBand ? 0.45 : 0.15);
      circle.setDepth(1);

      if (inBaseBand) {
        this.add
          .text(m.x, m.y, m.label, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '13px',
            color: COLORS.text,
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(2)
          .setAlpha(0.55);
      }
    }
  }

  private markerColor(m: MapMarker): number {
    if (m.team === 'blue') return COLORS.blue;
    if (m.team === 'red') return COLORS.red;
    if (m.type === 'siegeRuins' || m.type === 'gate' || m.type === 'core') return COLORS.gate;
    return COLORS.neutral;
  }

  private drawHud(): void {
    const compact = this.isCompactHud();

    this.hintText = this.add
      .text(16, 16, compact ? HUD_HINT_COMPACT : HUD_HINT_NORMAL, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '12px' : '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: compact ? 6 : 8, y: compact ? 4 : 6 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.statsHud = this.add
      .text(16, compact ? 38 : 52, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '11px' : '13px',
        color: COLORS.text,
        backgroundColor: '#00000055',
        padding: { x: compact ? 6 : 8, y: compact ? 3 : 5 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.menuButton = this.add
      .text(this.scale.width - 16, 16, '⮌ Menu', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: compact ? '14px' : '16px',
        color: COLORS.text,
        backgroundColor: '#00000066',
        padding: { x: compact ? 6 : 8, y: compact ? 4 : 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    this.menuButton.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.Menu);
    });

    if (SHOW_DEBUG_OVERLAY) {
      this.debugText = this.add
        .text(16, compact ? 72 : 92, '', {
          fontFamily: 'monospace',
          fontSize: compact ? '10px' : '13px',
          color: COLORS.text,
          backgroundColor: '#00000066',
          padding: { x: compact ? 6 : 8, y: compact ? 4 : 6 },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000);
      this.debugText.setVisible(this.debugOverlayVisible);
    }

    this.updateStatsHud();
  }

  private updateStatsHud(): void {
    const p = this.player;
    const d = this.dummy;
    const mana = `${Math.floor(p.currentMana)}/${p.maxMana}`;
    const hp = `${Math.floor(p.currentHp)}/${p.maxHp}`;
    const dummyHp = `${Math.ceil(d.currentHp)}/${d.maxHp}`;
    const compact = this.isCompactHud();

    if (compact) {
      this.statsHud.setText(
        `Hero: ${p.heroName} HP ${hp} MP ${mana} Dummy ${dummyHp} | ${this.lastCombatResult}`,
      );
    } else {
      this.statsHud.setText(
        `Hero: ${p.heroName}  HP: ${hp}  Mana: ${mana}  Dummy: ${dummyHp}  combat: ${this.lastCombatResult}`,
      );
    }
  }

  private updateDebugOverlay(): void {
    if (!this.debugText || !this.debugOverlayVisible) return;
    const s = this.movement.state;
    const p = this.player;
    const d = this.dummy;
    const compact = this.isCompactHud();
    const move = `${s.moveX.toFixed(2)}, ${s.moveY.toFixed(2)}`;
    const joyPtr = this.movement.getJoystickPointerId();
    const joyId = joyPtr !== null ? String(joyPtr) : '-';
    const actionWhileMove = this.movement.isActionWhileMoving() ? 'yes' : 'no';
    const mana = `${Math.floor(p.currentMana)}/${p.maxMana}`;
    const hp = `${Math.floor(p.currentHp)}/${p.maxHp}`;
    const dummyHp = `${Math.ceil(d.currentHp)}/${d.maxHp}`;
    const dist = Math.hypot(d.x - p.x, d.y - p.y).toFixed(0);

    const projCount = this.projectileSystem.getActiveCount();
    const projResult = this.projectileSystem.getLastResult();

    const lines = compact
      ? [
          CURRENT_PHASE_LABEL,
          `hero: ${p.heroName} hp: ${hp} mp: ${mana}`,
          `dummy: ${dummyHp} dist: ${dist}`,
          `combat: ${this.lastCombatResult}`,
          `type: ${this.lastSkillType} hit: ${this.lastHitShapeResult}`,
          `placeholder: ${this.lastPlaceholderReason}`,
          `proj: ${projCount} ${projResult}`,
          ...this.objectiveSystem.getDebugLines(),
        ]
      : [
          CURRENT_PHASE_LABEL,
          `hero: ${p.heroName} (${p.heroClass}) hp: ${hp} mana: ${mana}`,
          `dummy: ${dummyHp}  dist: ${dist}  atkRange: ${p.attackRange}`,
          `combat: ${this.lastCombatResult}`,
          `skill type: ${this.lastSkillType}  hit shape: ${this.lastHitShapeResult}`,
          `placeholder: ${this.lastPlaceholderReason}  skipped: ${this.lastSkippedSkillReason}`,
          `projectiles: ${projCount}  last: ${projResult}`,
          `input: ${s.inputMode}  move: ${move}`,
          `joy ptr: ${joyId}  action+move: ${actionWhileMove}`,
          `last: ${s.lastAction || '-'}`,
          `skill: ${this.skillRuntime.getLastResult() || '-'}`,
          ...this.objectiveSystem.getDebugLines(),
        ];

    this.debugText.setText(lines.join('\n'));
  }
}
