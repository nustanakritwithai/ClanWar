import { MAP_HEIGHT, MAP_WIDTH } from '../constants';
import type { MapDefinition } from '../types';

// Coordinates taken directly from planning doc section 5.2 (Map Coordinate
// Reference). Blue fortress is at the bottom, Red at the top, symmetric around
// the vertical center line (x = 1500).
export const smallTwinFortress: MapDefinition = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  playerSpawn: { x: 1500, y: 3900 },
  markers: [
    // --- Blue side (player) ---
    { id: 'blueSpawn', type: 'spawn', team: 'blue', label: 'Blue Spawn', x: 1500, y: 3900, radius: 70 },
    { id: 'blueCore', type: 'core', team: 'blue', label: 'Blue Core', x: 1500, y: 3700, radius: 90 },
    { id: 'blueGate', type: 'gate', team: 'blue', label: 'Blue Gate', x: 1500, y: 3200, radius: 60 },
    { id: 'forwardCampL', type: 'forwardCamp', team: 'neutral', label: 'Forward Camp L', x: 900, y: 2550, radius: 60 },
    { id: 'forwardCampR', type: 'forwardCamp', team: 'neutral', label: 'Forward Camp R', x: 2100, y: 2550, radius: 60 },

    // --- Center battlefield ---
    { id: 'siegeRuins', type: 'siegeRuins', team: 'neutral', label: 'Siege Ruins', x: 1500, y: 2100, radius: 75 },
    { id: 'resourceCampL', type: 'resource', team: 'neutral', label: 'Resource Camp L', x: 850, y: 1700, radius: 60 },
    { id: 'resourceCampR', type: 'resource', team: 'neutral', label: 'Resource Camp R', x: 2150, y: 1700, radius: 60 },
    { id: 'watchtower', type: 'watchtower', team: 'neutral', label: 'Watchtower', x: 1500, y: 1600, radius: 55 },

    // --- Red side (enemy) ---
    { id: 'redGate', type: 'gate', team: 'red', label: 'Red Gate', x: 1500, y: 1000, radius: 60 },
    { id: 'redCore', type: 'core', team: 'red', label: 'Red Core', x: 1500, y: 500, radius: 90 },
    { id: 'redSpawn', type: 'spawn', team: 'red', label: 'Red Spawn', x: 1500, y: 300, radius: 70 },
  ],
  walls: buildWalls(),
};

// Placeholder collision: map-edge frame plus simple gate-flanking wall segments
// so the player cannot freely walk around each Gate. Real fortress geometry is
// refined in later phases; this is just enough to prove collision works.
function buildWalls() {
  const t = 40; // wall thickness
  const w = MAP_WIDTH;
  const h = MAP_HEIGHT;

  const gateWallY = (gateY: number) => [
    // left wall segment from map edge toward the gate opening
    { id: `wallL@${gateY}`, x: 0, y: gateY - t / 2, width: 1140, height: t },
    // right wall segment from the gate opening toward the map edge
    { id: `wallR@${gateY}`, x: 1860, y: gateY - t / 2, width: w - 1860, height: t },
  ];

  return [
    // Outer frame (keeps player inside the world).
    { id: 'edgeTop', x: 0, y: 0, width: w, height: t },
    { id: 'edgeBottom', x: 0, y: h - t, width: w, height: t },
    { id: 'edgeLeft', x: 0, y: 0, width: t, height: h },
    { id: 'edgeRight', x: w - t, y: 0, width: t, height: h },
    // Fortress walls flanking each gate (gap in the middle = the gate opening).
    ...gateWallY(3200), // Blue Gate line
    ...gateWallY(1000), // Red Gate line
  ];
}
