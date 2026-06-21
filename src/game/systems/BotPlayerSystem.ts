import type Phaser from 'phaser';
import type { HeroClassId, HeroStats, DamageResult } from '../types';
import type { BotPlayer, BotState } from '../entities/BotPlayer';
import type { BotBrainSnapshot } from '../ai/BotBrain';
import {
  BOT_PLAYER,
  DEFAULT_BOT_DIFFICULTY,
  MULTI_BOT_SEPARATION,
  type BotPlayerConfig,
  type BotDifficulty,
} from '../data/bot-player-config';
import {
  BotUnit,
  type BotSystemHooks,
  type BotSnapshot,
  type BotDifficultyInfo,
  type PlayerMeleeHitResult,
} from './BotUnit';

export type { BotSystemHooks, BotSnapshot, BotDifficultyInfo, PlayerMeleeHitResult } from './BotUnit';

/**
 * Phase 5B-1 BotPlayerSystem — manager for a COLLECTION of AI-controlled players.
 *
 * Through Phase 5A this class WAS the single bot's brain/combat runtime; in 5B-1
 * that runtime was extracted unchanged into {@link BotUnit}, and this class became
 * a thin manager that owns one or more units. Each unit is fully independent
 * (own id / class / spawn / brain / cooldown / skill runtime / mana / HP); there
 * is deliberately NO shared targeting, squad AI, objective AI, or commander —
 * those are out of scope for the spawn foundation.
 *
 * Backward compatibility: when constructed with a single config (the legacy
 * call shape) it holds exactly one unit, and every single-bot accessor
 * (`bot`, `getBotSnapshot`, `tryPlayerMeleeHit`, the debug hooks, …) delegates
 * to that primary unit — so the entire 5A regression surface is unchanged.
 */
export class BotPlayerSystem {
  private readonly units: BotUnit[];

  constructor(
    scene: Phaser.Scene,
    hooks: BotSystemHooks,
    configs: BotPlayerConfig | readonly BotPlayerConfig[] = BOT_PLAYER,
    difficulty: BotDifficulty = DEFAULT_BOT_DIFFICULTY,
  ) {
    const list = Array.isArray(configs) ? configs : [configs as BotPlayerConfig];
    const cfgs = list.length > 0 ? list : [BOT_PLAYER];
    this.units = cfgs.map((cfg, i) => new BotUnit(scene, hooks, cfg, difficulty, `bot-${i}`));
  }

  /** Primary unit — the single-bot back-compat target for legacy accessors. */
  private get primary(): BotUnit {
    return this.units[0];
  }

  // --- back-compat single-bot surface (delegates to the primary unit) ---

  /** Primary bot entity (MatchScene collider + legacy `botSystem.bot` tests). */
  public get bot(): BotPlayer {
    return this.primary.bot;
  }

  public update(deltaMs: number): void {
    for (const unit of this.units) unit.update(deltaMs);

    // Phase 5B-2: soft bot-vs-bot separation post-process. Each unit has already
    // computed its own brain/controller intent; here the manager feeds every unit
    // a snapshot of its neighbours (sampled BEFORE any push, so the result is
    // order-independent) and lets each unit nudge itself apart. Single-bot matches
    // skip this entirely, so the whole 5A regression surface is byte-for-byte
    // unchanged. This is NOT squad AI / shared targeting / objective AI.
    if (this.units.length > 1 && MULTI_BOT_SEPARATION.enabled) {
      const samples = this.units.map((u) => u.getSeparationSample());
      for (let i = 0; i < this.units.length; i++) {
        this.units[i].applySeparation(i, samples, MULTI_BOT_SEPARATION);
      }
    }
  }

  /**
   * Player melee swing vs. the bots. The melee arc naturally cleaves: every live
   * bot inside the arc takes damage (each through the shared per-bot path). The
   * closest hit is returned for the single HUD feedback line, preserving the
   * legacy single-bot return contract.
   */
  public tryPlayerMeleeHit(
    casterX: number,
    casterY: number,
    facingAngle: number,
    range: number,
    rawDamage: number,
  ): PlayerMeleeHitResult | null {
    let closest: PlayerMeleeHitResult | null = null;
    let closestDist = Infinity;
    for (const unit of this.units) {
      const hit = unit.tryPlayerMeleeHit(casterX, casterY, facingAngle, range, rawDamage);
      if (!hit) continue;
      const d = Math.hypot(hit.x - casterX, hit.y - casterY);
      if (d < closestDist) {
        closestDist = d;
        closest = hit;
      }
    }
    return closest;
  }

  public isBotAlive(): boolean {
    return this.primary.isBotAlive();
  }

  public getBotState(): BotState {
    return this.primary.getBotState();
  }

  public getBotSnapshot(): BotSnapshot {
    return this.primary.getBotSnapshot();
  }

  public getBrainSnapshot(): BotBrainSnapshot {
    return this.primary.getBrainSnapshot();
  }

  public getDifficultyInfo(): BotDifficultyInfo {
    return this.primary.getDifficultyInfo();
  }

  public getClassBaseline(): HeroStats {
    return this.primary.getClassBaseline();
  }

  public getSkillInfo(): ReturnType<BotUnit['getSkillInfo']> {
    return this.primary.getSkillInfo();
  }

  public getSkillCastDebug(): ReturnType<BotUnit['getSkillCastDebug']> {
    return this.primary.getSkillCastDebug();
  }

  public getRangedSpacingInfo(): ReturnType<BotUnit['getRangedSpacingInfo']> {
    return this.primary.getRangedSpacingInfo();
  }

  public debugSetClass(classId: HeroClassId): void {
    this.primary.debugSetClass(classId);
  }

  public debugDamageBot(amount: number): DamageResult {
    return this.primary.debugDamageBot(amount);
  }

  public debugSetStuck(value: boolean | null): void {
    this.primary.debugSetStuck(value);
  }

  public debugSetCooldown(ms: number): void {
    this.primary.debugSetCooldown(ms);
  }

  public debugTeleportBot(x: number, y: number): void {
    this.primary.debugTeleportBot(x, y);
  }

  /** Difficulty is a global setting — applied to every unit. */
  public debugSetDifficulty(difficulty: BotDifficulty): void {
    for (const unit of this.units) unit.debugSetDifficulty(difficulty);
  }

  // --- multi-bot surface (Phase 5B-1) ---

  /** Number of bots currently managed. */
  public getBotCount(): number {
    return this.units.length;
  }

  /** All bot entities (e.g. so MatchScene can add a wall collider per body). */
  public getBotEntities(): BotPlayer[] {
    return this.units.map((u) => u.bot);
  }

  /** Snapshot of every bot, in spawn order. */
  public getBotSnapshots(): BotSnapshot[] {
    return this.units.map((u) => u.getBotSnapshot());
  }

  /** Brain snapshot of every bot, in spawn order. */
  public getBrainSnapshots(): BotBrainSnapshot[] {
    return this.units.map((u) => u.getBrainSnapshot());
  }

  /** Skill info of every bot, in spawn order. */
  public getSkillInfos(): ReturnType<BotUnit['getSkillInfo']>[] {
    return this.units.map((u) => u.getSkillInfo());
  }

  /** Skill-cast debug mirror of every bot, in spawn order. */
  public getSkillCastDebugs(): ReturnType<BotUnit['getSkillCastDebug']>[] {
    return this.units.map((u) => u.getSkillCastDebug());
  }

  private unitAt(index: number): BotUnit | undefined {
    return this.units[index];
  }

  public getBotSnapshotAt(index: number): BotSnapshot | null {
    return this.unitAt(index)?.getBotSnapshot() ?? null;
  }

  public getBrainSnapshotAt(index: number): BotBrainSnapshot | null {
    return this.unitAt(index)?.getBrainSnapshot() ?? null;
  }

  public getSkillInfoAt(index: number): ReturnType<BotUnit['getSkillInfo']> | null {
    return this.unitAt(index)?.getSkillInfo() ?? null;
  }

  public getSkillCastDebugAt(index: number): ReturnType<BotUnit['getSkillCastDebug']> | null {
    return this.unitAt(index)?.getSkillCastDebug() ?? null;
  }

  public debugDamageBotAt(index: number, amount: number): DamageResult | null {
    return this.unitAt(index)?.debugDamageBot(amount) ?? null;
  }

  public debugSetCooldownAt(index: number, ms: number): void {
    this.unitAt(index)?.debugSetCooldown(ms);
  }

  public debugSetCooldownAll(ms: number): void {
    for (const unit of this.units) unit.debugSetCooldown(ms);
  }

  public debugTeleportBotAt(index: number, x: number, y: number): void {
    this.unitAt(index)?.debugTeleportBot(x, y);
  }

  public destroy(): void {
    for (const unit of this.units) unit.destroy();
  }
}
