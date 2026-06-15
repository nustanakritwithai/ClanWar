import type { HeroDefinition } from '../types';

/** Base hero stats for Phase 3+. Not applied to the placeholder player yet. */
export const HEROES: Record<string, HeroDefinition> = {
  guardian: {
    id: 'guardian',
    name: 'Guardian',
    stats: {
      hp: 1200,
      mana: 300,
      attack: 45,
      armor: 25,
      moveSpeed: 170,
      attackRange: 60,
    },
  },
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    stats: {
      hp: 950,
      mana: 250,
      attack: 70,
      armor: 15,
      moveSpeed: 190,
      attackRange: 65,
      gateDamageBonus: 0.2,
    },
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    stats: {
      hp: 700,
      mana: 350,
      attack: 55,
      armor: 8,
      moveSpeed: 200,
      attackRange: 320,
    },
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    stats: {
      hp: 650,
      mana: 600,
      attack: 35,
      magicPower: 80,
      armor: 5,
      moveSpeed: 185,
      attackRange: 250,
    },
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    stats: {
      hp: 750,
      mana: 700,
      attack: 30,
      armor: 8,
      moveSpeed: 185,
      attackRange: 230,
    },
  },
};
