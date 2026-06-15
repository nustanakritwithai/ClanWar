import Phaser from 'phaser';
import {
  COLORS,
  COMPACT_LAYOUT_HEIGHT,
  CURRENT_PHASE_LABEL,
  SCENE_KEYS,
  SHOW_DEBUG_OVERLAY,
} from '../constants';
import { getHero } from '../data/heroes';
import { smallTwinFortress } from '../data/map-small-twin-fortress';
import type { ActionKey, HeroClassId, MapMarker, MatchSceneData, SkillDefinition } from '../types';
import { Player } from '../entities/Player';
import { TrainingDummy } from '../entities/TrainingDummy';
import { InputSystem } from '../systems/InputSystem';
import { SkillRuntimeSystem } from '../systems/SkillRuntimeSystem';
import { showCombatText } from '../ui/CombatText';
import { isFullscreenActive, requestGameFullscreen } from '../utils/fullscreen';

const HUD_HINT_NORMAL =
  'WASD/Arrows or joystick • J/Q/E/R/F/Space/1/2 or buttons • ` or F1: debug';
const HUD_HINT_COMPACT = 'Move: joystick/WASD • Actions: buttons';

/** Half-angle of the attack cone in radians (90° total arc). */
const ATTACK_CONE_HALF = Math.PI / 4;

export class MatchScene extends Phaser.Scene {
  private heroClass: HeroClassId = 'guardian';
  private player!: Player;
  private dummy!: TrainingDummy;
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

  constructor() {
    super(SCENE_KEYS.Match);
  }

  init(data: MatchSceneData = {}): void {
    this.heroClass = data.heroClass ?? 'guardian';
    this.lastCombatResult = '-';
  }

  create(): void {
    const map = smallTwinFortress;
    const hero = getHero(this.heroClass);

    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    this.drawGround(map.width, map.height);
    this.buildWalls();
    this.drawMarkers(map.markers);

    this.player = new Player(this, map.playerSpawn.x, map.playerSpawn.y, hero);
    this.dummy = new TrainingDummy(this, map.playerSpawn.x, map.playerSpawn.y - 350);
    this.skillRuntime = new SkillRuntimeSystem(this.heroClass);

    this.physics.add.collider(this.player.sprite, this.walls);
    this.physics.add.collider(this.dummy.sprite, this.walls);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.computeZoom());

    const worldObjects = [...this.children.list];

    this.movement = new InputSystem(this);

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

    const dir = this.movement.getMoveVector(this.moveVec);
    this.player.move(dir);
    this.player.update();
    this.dummy.update();

    this.processActions();
    this.updateStatsHud();
    this.updateDebugOverlay();
  }

  private processActions(): void {
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
    this.player.playActionFeedback('attack');
    this.movement.showButtonCooldown('attack');

    if (!this.dummy.canReceiveDamage()) {
      this.setCombatResult('Attack missed');
      return;
    }

    if (this.isInAttackRange(this.dummy.x, this.dummy.y, this.dummy.radius)) {
      const result = this.dummy.takeDamage(this.player.attack);
      const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#ef4444');
      this.registerWorldObject(text);
      this.setCombatResult(`Attack hit ${result.finalDamage}`);
      if (result.killed) {
        this.time.delayedCall(2100, () => {
          if (!this.dummy.isDead()) this.setCombatResult('Dummy reset');
        });
      }
    } else {
      this.setCombatResult('Attack missed');
    }
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
      this.movement.state.lastAction = 'Skill on cooldown';
    } else if (result.reason === 'mana') {
      this.player.playDeniedFeedback('mana');
      this.movement.state.lastAction = 'Not enough mana';
    }
  }

  private applySkillCombatEffect(skill: SkillDefinition): void {
    const name = skill.name;

    if (skill.damage !== undefined) {
      const range = skill.range ?? 160;
      if (
        this.dummy.canReceiveDamage() &&
        this.isInSkillRange(this.dummy.x, this.dummy.y, this.dummy.radius, range)
      ) {
        const result = this.dummy.takeDamage(skill.damage);
        const text = showCombatText(this, this.dummy.x, this.dummy.y - 20, `-${result.finalDamage}`, '#f87171');
        this.registerWorldObject(text);
        this.setCombatResult(`${name} hit ${result.finalDamage}`);
        if (result.killed) {
          this.time.delayedCall(2100, () => {
            if (!this.dummy.isDead()) this.setCombatResult('Dummy reset');
          });
        }
      } else {
        this.setCombatResult(`${name} missed`);
      }
      return;
    }

    if (skill.heal !== undefined) {
      const healed = this.player.heal(skill.heal);
      if (healed > 0) {
        const text = showCombatText(this, this.player.x, this.player.y - 28, `+${healed}`, '#4ade80');
        this.registerWorldObject(text);
        this.setCombatResult(`Heal +${healed}`);
      } else {
        this.setCombatResult(`${name} (HP full)`);
      }
      return;
    }

    this.setCombatResult(`used ${name}`);
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

  private isInAttackRange(targetX: number, targetY: number, targetRadius: number): boolean {
    return (
      this.isWithinDistance(targetX, targetY, targetRadius, this.player.attackRange) &&
      this.isInFacingCone(targetX, targetY)
    );
  }

  private isInSkillRange(
    targetX: number,
    targetY: number,
    targetRadius: number,
    range: number,
  ): boolean {
    return this.isWithinDistance(targetX, targetY, targetRadius, range);
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

  private isInFacingCone(targetX: number, targetY: number): boolean {
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const angleToTarget = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(angleToTarget - this.player.getFacingAngle());
    return Math.abs(diff) <= ATTACK_CONE_HALF;
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
      const color = this.markerColor(m);
      const circle = this.add.circle(m.x, m.y, m.radius, color, 0.35);
      circle.setStrokeStyle(3, color, 1);
      circle.setDepth(1);

      this.add
        .text(m.x, m.y, m.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          color: COLORS.text,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(2);
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

    const lines = compact
      ? [
          CURRENT_PHASE_LABEL,
          `hero: ${p.heroName} hp: ${hp} mp: ${mana}`,
          `dummy: ${dummyHp} dist: ${dist}`,
          `combat: ${this.lastCombatResult}`,
          `joy#: ${joyId} move: ${move}`,
          `last: ${s.lastAction || '-'} act+move: ${actionWhileMove}`,
        ]
      : [
          CURRENT_PHASE_LABEL,
          `hero: ${p.heroName} (${p.heroClass}) hp: ${hp} mana: ${mana}`,
          `dummy: ${dummyHp}  dist: ${dist}  atkRange: ${p.attackRange}`,
          `combat: ${this.lastCombatResult}`,
          `input: ${s.inputMode}  move: ${move}`,
          `joy ptr: ${joyId}  action+move: ${actionWhileMove}`,
          `last: ${s.lastAction || '-'}`,
          `skill: ${this.skillRuntime.getLastResult() || '-'}`,
        ];

    this.debugText.setText(lines.join('\n'));
  }
}
