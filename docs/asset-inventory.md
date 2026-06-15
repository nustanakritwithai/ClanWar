# Asset Inventory — Visual Kit

> Catalogue of all visual-kit assets produced for Clan Siege Arena. These are
> **static, standalone assets** — not yet wired into the runtime. Integration
> (loading into scenes/HUD, manifest icon entries) is owned by the runtime track.
>
> **Totals:** 40 SVG assets — 5 class · 20 skill · 7 objective · 6 UI · 2 app/PWA.
> Plus 2 docs (this file + `art-style-guide.md`).
>
> Status legend: ✅ done · ⬜ placeholder/optional pending

## Class Icons (`public/assets/classes/`)

| Asset path | Type | Purpose | Related class | Status | Notes |
|---|---|---|---|---|---|
| `classes/guardian.svg` | Class icon | Class-select emblem | Guardian | ✅ | Shield + fortress, steel blue |
| `classes/warrior.svg` | Class icon | Class-select emblem | Warrior | ✅ | Heavy double-bit axe, crimson |
| `classes/ranger.svg` | Class icon | Class-select emblem | Ranger | ✅ | Bow + nocked arrow, emerald |
| `classes/mage.svg` | Class icon | Class-select emblem | Mage | ✅ | Arcane orb + flame, purple |
| `classes/priest.svg` | Class icon | Class-select emblem | Priest | ✅ | Staff + healing orb/cross, gold |

## Skill Icons (`public/assets/skills/`)

Filenames use the short skill name; runtime skill IDs (`skills.ts`) are prefixed
with the class (e.g. `guardian_shield_bash`). Mapping shown in the ID column.

| Asset path | Type | Purpose | Class · Slot · Skill ID | Status | Notes |
|---|---|---|---|---|---|
| `skills/shield_bash.svg` | Skill icon | HUD skill button | Guardian · skill1 · `guardian_shield_bash` | ✅ | Tilted shield + impact |
| `skills/guard_wall.svg` | Skill icon | HUD skill button | Guardian · skill2 · `guardian_guard_wall` | ✅ | Three interlocked shields |
| `skills/war_taunt.svg` | Skill icon | HUD skill button | Guardian · skill3 · `guardian_war_taunt` | ✅ | Helmet + taunt waves |
| `skills/fortress_stand.svg` | Skill icon | HUD ultimate button | Guardian · ultimate · `guardian_fortress_stand` | ✅ | Tower + aura ring |
| `skills/cleave.svg` | Skill icon | HUD skill button | Warrior · skill1 · `warrior_cleave` | ✅ | Sweeping slash arc |
| `skills/leap_strike.svg` | Skill icon | HUD skill button | Warrior · skill2 · `warrior_leap_strike` | ✅ | Leap arc + impact wave |
| `skills/rage.svg` | Skill icon | HUD skill button | Warrior · skill3 · `warrior_rage` | ✅ | Fury flame |
| `skills/gate_breaker.svg` | Skill icon | HUD ultimate button | Warrior · ultimate · `warrior_gate_breaker` | ✅ | Cracked gate + aura ring |
| `skills/power_shot.svg` | Skill icon | HUD skill button | Ranger · skill1 · `ranger_power_shot` | ✅ | Charged single arrow |
| `skills/arrow_rain.svg` | Skill icon | HUD skill button | Ranger · skill2 · `ranger_arrow_rain` | ✅ | Falling arrows + zone |
| `skills/trap.svg` | Skill icon | HUD skill button | Ranger · skill3 · `ranger_trap` | ✅ | Toothed jaw trap |
| `skills/eagle_barrage.svg` | Skill icon | HUD ultimate button | Ranger · ultimate · `ranger_eagle_barrage` | ✅ | Eagle + arrows + aura ring |
| `skills/fireball.svg` | Skill icon | HUD skill button | Mage · skill1 · `mage_fireball` | ✅ | Flaming sphere + trail |
| `skills/frost_zone.svg` | Skill icon | HUD skill button | Mage · skill2 · `mage_frost_zone` | ✅ | Snowflake + zone disc |
| `skills/arcane_wall.svg` | Skill icon | HUD skill button | Mage · skill3 · `mage_arcane_wall` | ✅ | Glowing rune panels |
| `skills/meteor_siege.svg` | Skill icon | HUD ultimate button | Mage · ultimate · `mage_meteor_siege` | ✅ | Meteor + impact + aura ring |
| `skills/heal.svg` | Skill icon | HUD skill button | Priest · skill1 · `priest_heal` | ✅ | Cross + sparkles |
| `skills/holy_circle.svg` | Skill icon | HUD skill button | Priest · skill2 · `priest_holy_circle` | ✅ | Radiant ring + cross |
| `skills/cleanse.svg` | Skill icon | HUD skill button | Priest · skill3 · `priest_cleanse` | ✅ | Purifying droplet |
| `skills/revival_prayer.svg` | Skill icon | HUD ultimate button | Priest · ultimate · `priest_revival_prayer` | ✅ | Rising phoenix + aura ring |

## Objective Icons (`public/assets/objectives/`)

| Asset path | Type | Purpose | Related objective | Status | Notes |
|---|---|---|---|---|---|
| `objectives/core.svg` | Objective icon | Base/nexus marker | Core | ✅ | Glowing crystal nexus |
| `objectives/gate.svg` | Objective icon | Siege target marker | Gate | ✅ | Arch + portcullis |
| `objectives/resource_camp.svg` | Objective icon | Economy point marker | Resource Camp | ✅ | Treasure chest + coins |
| `objectives/watchtower.svg` | Objective icon | Vision point marker | Watchtower | ✅ | Tower + sight eye |
| `objectives/siege_ruins.svg` | Objective icon | Midfield capture marker | Siege Ruins | ✅ | Broken columns + rubble |
| `objectives/forward_camp.svg` | Objective icon | Forward base marker | Forward Camp | ✅ | Tent + banner |
| `objectives/spawn.svg` | Objective icon | Respawn point marker | Spawn | ✅ | Blue portal + up-arrow |

## UI Assets (`public/assets/ui/`)

| Asset path | Type | Purpose | Related system | Status | Notes |
|---|---|---|---|---|---|
| `ui/button_frame.svg` | UI frame | Action button chrome | HUD buttons | ✅ | Circular bevel ring |
| `ui/cooldown_overlay.svg` | UI overlay | Cooldown sweep template | HUD buttons | ✅ | Radial wedge; runtime redraws angle |
| `ui/hp_bar_frame.svg` | UI frame | Health bar chrome | HUD bars | ✅ | Example fill at ~70% |
| `ui/mana_bar_frame.svg` | UI frame | Mana bar chrome | HUD bars | ✅ | Slimmer; example fill ~55% |
| `ui/joystick_base.svg` | UI control | Joystick base art | Virtual joystick | ✅ | Decorative only; runtime joystick is procedural |
| `ui/joystick_knob.svg` | UI control | Joystick knob art | Virtual joystick | ✅ | Decorative only; runtime joystick is procedural |

## App / PWA Icons (`public/icons/`)

| Asset path | Type | Purpose | Related system | Status | Notes |
|---|---|---|---|---|---|
| `icons/app-icon.svg` | App icon | PWA / favicon source | Install / manifest | ✅ | Solid bg, crossed swords + shield |
| `icons/maskable-icon.svg` | App icon | PWA maskable source | Install / manifest | ✅ | Full-bleed bg, content in 80% safe zone |
| `icons/icon-192.png` | App icon (raster) | PWA 192px | Install / manifest | ⬜ | Not generated — no SVG→PNG tool in env; avoided adding a build dep to prevent `package.json` conflict |
| `icons/icon-512.png` | App icon (raster) | PWA 512px | Install / manifest | ⬜ | Same as above |

## Documentation (`docs/`)

| Asset path | Type | Purpose | Status | Notes |
|---|---|---|---|---|
| `docs/art-style-guide.md` | Doc | Art direction & rules | ✅ | Palette, class identity, readability rules |
| `docs/asset-inventory.md` | Doc | This catalogue | ✅ | — |

## Integration notes (for the runtime track)

- All gameplay icons (class/skill/objective/UI) have **transparent backgrounds**
  and are safe to composite over any scene.
- Objective icons are **team-neutral**; tint blue/red at runtime for ownership.
- `cooldown_overlay.svg` is a **template** — the runtime should redraw the wedge
  angle each frame for real cooldown progress.
- The joystick art is **decorative**; the live `VirtualJoystick` is drawn
  procedurally in code and does not require these files.
- **Manifest was intentionally NOT modified** to avoid a merge conflict with the
  runtime track. To enable installable PWA icons later, add an `icons` array to
  `public/manifest.webmanifest` referencing `icons/app-icon.svg` (any) and
  `icons/maskable-icon.svg` (`purpose: "maskable"`), and add raster `192/512`
  PNGs once a converter is available in the build.
