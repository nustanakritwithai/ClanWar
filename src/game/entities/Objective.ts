import Phaser from 'phaser';
import type { ObjectiveCombatState, ObjectiveDefinition } from '../data/objectives';

const GATE_DISPLAY_SIZE = 112;
const CORE_DISPLAY_SIZE = 144;

/** World sprite for a gate/core objective — visuals driven by ObjectiveSystem state. */
export class Objective {
  public readonly definition: ObjectiveDefinition;
  public readonly baseSprite: Phaser.GameObjects.Image;
  public readonly overlaySprite: Phaser.GameObjects.Image;
  public readonly vulnerableOverlay: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    definition: ObjectiveDefinition,
    baseTextureKey: string,
    register: (obj: Phaser.GameObjects.GameObject) => void,
  ) {
    this.definition = definition;
    const displaySize = definition.type === 'gate' ? GATE_DISPLAY_SIZE : CORE_DISPLAY_SIZE;

    this.baseSprite = scene.add
      .image(definition.x, definition.y, baseTextureKey)
      .setDisplaySize(displaySize, displaySize)
      .setDepth(20);

    this.overlaySprite = scene.add
      .image(definition.x, definition.y, 'objective_under_attack')
      .setDisplaySize(displaySize + 16, displaySize + 16)
      .setDepth(21)
      .setVisible(false);

    const vulnKey = definition.team === 'blue' ? 'core_vulnerable_blue' : 'core_vulnerable_red';
    this.vulnerableOverlay = scene.add
      .image(definition.x, definition.y, vulnKey)
      .setDisplaySize(displaySize + 20, displaySize + 20)
      .setDepth(22)
      .setVisible(false);

    register(this.baseSprite);
    register(this.overlaySprite);
    register(this.vulnerableOverlay);
  }

  public applyVisualState(state: ObjectiveCombatState, textureKey: string): void {
    this.baseSprite.setTexture(textureKey);
    const displaySize = this.definition.type === 'gate' ? GATE_DISPLAY_SIZE : CORE_DISPLAY_SIZE;
    this.baseSprite.setDisplaySize(displaySize, displaySize);

    const isCore = this.definition.type === 'core';
    const showUnderAttack = state === 'under_attack';
    const showVulnerable = isCore && (state === 'vulnerable' || state === 'under_attack');

    this.overlaySprite.setVisible(showUnderAttack);
    this.vulnerableOverlay.setVisible(showVulnerable);
  }

  public destroy(): void {
    this.baseSprite.destroy();
    this.overlaySprite.destroy();
    this.vulnerableOverlay.destroy();
  }
}
