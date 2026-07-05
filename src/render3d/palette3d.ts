// Phase 6B: 3D map palette, lifted from the dominant fills of the Phase 4A/4E
// map SVG tiles (public/assets/map/*.svg) so the 3D battlefield reads as the
// same place as the 2D one. Team/structure accents come from game/constants.

export const PALETTE = {
  // Ground zones (per docs/map-layout-spec.md route bands)
  zoneMain: 0x4a3d2e, // main/army route — packed earth road
  zoneMainEdge: 0x6b5a42, // road shoulder accent
  zoneHigh: 0x4a5870, // high ground — stone
  zoneShadow: 0x2d2840, // shadow/sewer route — dark violet
  zoneBlueBase: 0x1a2a40,
  zoneRedBase: 0x2a1418,
  zoneNeutral: 0x1e2a22, // midfield neutral patch — mossy
  // Structures / props
  stone: 0x5b6d88,
  stoneDark: 0x39465a,
  wood: 0x6b5a42,
  gold: 0xcfa14a,
  purple: 0x9333ea, // sewer accent
  treeFoliage: 0x2f4a38,
  treeTrunk: 0x453626,
  tent: 0x8a7350,
} as const;
