# Phase 6B — Map & Structures 3D

> Status: **IMPLEMENTED — verified in browser (all three routes + all 12 markers)**
> Parent plan: [phase-6-3d-threejs-upgrade-plan.md](phase-6-3d-threejs-upgrade-plan.md)
> Previous slice: [phase-6a-renderer-foundation.md](phase-6a-renderer-foundation.md)

## What this phase delivers

The full Small Twin Fortress battlefield as low-poly 3D placeholders, replacing
the 6A marker discs. All geometry derives from `MapDefinition` plus the same
route bands the 2D `MapRenderer` paints (docs/map-layout-spec.md):

- **Zoned ground** (vertex-colored plane + faint checker): main route
  (packed-earth road, x 1300–1700), high ground (stone, x 600–1050), shadow
  route (dark violet, x 2070–2350), blue/red base floors, midfield neutral
  patch. Colors lifted from the dominant fills of the 2D map SVG tiles
  (`render3d/palette3d.ts`).
- **Structures per marker** (`render3d/structures.ts`): spawn platforms with
  team banners, core crystals (emissive, spin + bob) on flat daises, gate
  arches (pillars outside the walkable 1140–1860 opening + lintel above head
  height), open-frame watchtower, siege-ruin broken columns, resource-camp
  crates + gold ore, forward-camp tents. Each with a subtle team-colored
  radius ring matching the marker's gameplay radius.
- **Route extras**: crossing plazas at the three junction hubs (1500 ×
  3550/2100/650), high-ground ramp slats (x 820), sewer mouths with purple
  trim (x 2150) — MapRenderer parity positions.
- **Decorative props**: ~70 instanced trees + ~46 instanced rocks, seeded RNG
  (identical every load), rejection-sampled to avoid routes, bases, walls,
  and marker radii — decor never suggests fake collision.

## Visual honesty rule (new, carried forward)

The 2D sim has colliders only for `WallRect`s — markers are walkable. So any
structure ON a walkable spot must read as walkable: the watchtower is an
open frame you walk under (it sits mid-route), core/spawn platforms are flat
daises, ruins are scattered low columns. Anything that looks solid at body
height must sit on a real collider (gate pillars overlap the wall ends).

## Verified (Playwright, dev build)

- Screenshots at blue base, mid cross, high ground, shadow route, red gate,
  red base — all structures present at map-data coordinates.
- Collision regression: west edge clamps x=62, gate flank clamps y=3242
  (identical to 6A/2D values); all three routes walkable north.
- No page errors; `npm run build` clean; 3D chunk 129 KB gzip (still no
  Phaser in the 3D path).

## Out of scope (next slices)

Combat port (6C), bots (6D), objectives runtime + HUD (6E), GLTF models,
shadows, quality tiers (6F/6G).
