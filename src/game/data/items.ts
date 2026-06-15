import type { ItemDefinition } from '../types';

/** Shop item stats for Phase 3+. No shop UI or purchase runtime yet. */
export const ITEMS: ItemDefinition[] = [
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    price: 500,
    attack: 20,
  },
  {
    id: 'war_axe',
    name: 'War Axe',
    price: 900,
    attack: 35,
    gateDamageBonus: 0.1,
  },
  {
    id: 'berserker_blade',
    name: 'Berserker Blade',
    price: 1400,
    attack: 50,
    attackSpeedBonus: 0.15,
  },
  {
    id: 'chain_armor',
    name: 'Chain Armor',
    price: 500,
    armor: 15,
  },
  {
    id: 'fortress_plate',
    name: 'Fortress Plate',
    price: 1200,
    armor: 30,
    hp: 200,
  },
  {
    id: 'guardian_shield',
    name: 'Guardian Shield',
    price: 1500,
    activeDamageReduction: 0.3,
    activeDuration: 3,
  },
  {
    id: 'mage_staff',
    name: 'Mage Staff',
    price: 600,
    magicPower: 35,
  },
  {
    id: 'arcane_orb',
    name: 'Arcane Orb',
    price: 1200,
    magicPower: 60,
    mana: 100,
  },
  {
    id: 'siege_codex',
    name: 'Siege Codex',
    price: 1500,
    magicPower: 40,
    gateDamageBonus: 0.2,
  },
  {
    id: 'healing_charm',
    name: 'Healing Charm',
    price: 800,
    healingBonus: 0.2,
  },
  {
    id: 'swift_boots',
    name: 'Swift Boots',
    price: 700,
    moveSpeed: 25,
  },
  {
    id: 'rally_banner',
    name: 'Rally Banner',
    price: 1300,
    activeMoveSpeedBonus: 0.2,
    activeDuration: 4,
  },
  {
    id: 'repair_kit',
    name: 'Repair Kit',
    price: 300,
    repairAmount: 300,
  },
  {
    id: 'siege_bomb',
    name: 'Siege Bomb',
    price: 500,
    gateDamage: 500,
  },
  {
    id: 'field_trap',
    name: 'Field Trap',
    price: 350,
    slow: 0.4,
    duration: 3,
  },
  {
    id: 'war_ladder',
    name: 'War Ladder',
    price: 600,
    placeholder: true,
  },
];
