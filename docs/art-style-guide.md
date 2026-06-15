# Clan Siege Arena — Art Style Guide

> Visual kit for the browser MOBA/siege-arena. This guide defines the look of
> all icons and UI art so the game reads clearly on a mobile phone in landscape.
> It is **art direction only** — it does not change gameplay, balance, or runtime
> code. Assets live under `public/assets/**` and `public/icons/**`.

---

## 1. Overview / Style

- **Theme:** dark fantasy siege arena. Stone, steel, banners, arcane energy.
- **Form language:** bold flat silhouettes with a single dark outline. One clear
  idea per icon, readable at a glance during a fast fight.
- **Mood:** serious but readable — not gritty-realistic, not cartoon-cute. Closer
  to clean mobile-MOBA iconography (think readable HUD glyphs, not painted art).
- **Rendering:** hand-authored SVG using primitives only (paths, circles, rects,
  lines, gradients). No external/raster art, no third-party assets, no fonts
  baked into icons.

---

## 2. Color Palette

Base palette is shared with the runtime (`src/game/constants.ts` `COLORS`) so art
and gameplay stay visually consistent.

| Token        | Hex       | Use                                   |
|--------------|-----------|---------------------------------------|
| Background   | `#10151d` | App/scene background                  |
| Background 2 | `#0b0e13` | Deepest shadow, outlines, app icon bg |
| Ground       | `#182230` | Map ground fill                       |
| Wall / stone | `#3a4658` | Walls, towers, ruins                  |
| Stone light  | `#4a5870` | Raised stone faces                    |
| Text / line  | `#e6edf3` | UI text, light strokes                |
| Team Blue    | `#3b82f6` | Blue team, mana                       |
| Team Red     | `#ef4444` | Red team                              |
| Neutral      | `#9ca3af` | Neutral objectives / ground patches   |
| Gate gold    | `#cfa14a` | Gates, siege objectives               |
| Core gold    | `#f4d35e` | Core/nexus, holy energy, highlights   |
| HP green     | `#4ade80` | Health fills                          |

**Outline rule:** every icon uses `#0b0e13` as its primary outline color so
icons keep contrast on both light and dark backgrounds.

---

## 3. Class Color Identity

Each class owns one signature hue. Skill icons for a class use that hue as their
dominant color so players can pre-attentively group a kit.

| Class    | Identity      | Hex (main / light)      | Symbol motif            |
|----------|---------------|-------------------------|-------------------------|
| Guardian | Steel Blue    | `#2563eb` / `#5b9bff`   | Shield, fortress, tower |
| Warrior  | Crimson       | `#dc2626` / `#ff6b6b`   | Heavy axe, slash, fury  |
| Ranger   | Emerald       | `#16a34a` / `#4ade80`   | Bow, arrow, eagle       |
| Mage     | Arcane Purple | `#9333ea` / `#a855f7`   | Orb, flame, frost, rune |
| Priest   | Holy Gold     | `#f4d35e` / `#fff7d6`   | Cross, staff, light     |

Secondary accents are allowed (e.g. fire-orange inside a Mage Fireball, gold heat
inside Warrior Rage) but the class hue must remain dominant.

---

## 4. Skill Visual Language

A skill icon answers two questions instantly: **whose kit** (class hue) and
**what it does** (motif).

- **Damage / strike** → blades, bursts, sharp impact lines (Cleave, Power Shot).
- **Area / zone** → a dashed ground ellipse or ring under the effect (Arrow Rain,
  Frost Zone, Holy Circle).
- **Defense / control** → shields, walls, jaws, taunt waves.
- **Heal / support** → cross glyph, droplet, soft glow (Heal, Cleanse).
- **Ultimate** → always wrapped in a **dashed aura ring** (`stroke-dasharray`)
  at the icon edge, so ultimates are visually heavier than basic skills
  (Fortress Stand, Gate Breaker, Eagle Barrage, Meteor Siege, Revival Prayer).

Motion is implied with 2–3 short accent strokes, never with many tiny lines.

---

## 5. Objective Icon Language

Objectives are **team-neutral** by default — tint them with team blue/red at
runtime if owned. Shared traits:

- Built from stone (`#3a4658` / `#4a5870`) with gold (`#cfa14a` / `#f4d35e`)
  signalling value or energy.
- A faint ground ellipse grounds free-standing structures.
- **Core** = glowing crystal nexus (most important, brightest gold).
- **Gate** = arch + portcullis (the thing you siege).
- **Watchtower** = vision (eye + sight beams).
- **Resource Camp** = treasure/coins (economy).
- **Siege Ruins / Forward Camp** = capturable midfield points.
- **Spawn** = blue portal with an up-arrow (respawn/return).

---

## 6. Mobile Readability Rules

Icons are seen small (HUD buttons ~64–96 px) on a phone, often mid-action.

1. **One concept per icon.** If it needs a sentence to read, simplify.
2. **Thick strokes.** Outlines ≥ ~8 units at a 256 viewBox; never hairlines.
3. **High contrast.** Class hue against the dark `#0b0e13` outline; avoid
   low-contrast hue-on-hue.
4. **Silhouette test.** The icon must be recognizable as a solid black
   silhouette. If it isn't, the shape is too busy.
5. **No tiny text** inside icons. Letters (Q/E/R, 1/2) are UI labels drawn by the
   runtime, not part of the art.
6. **Transparent background** for all gameplay icons (classes, skills, objectives,
   UI frames) so they composite over any scene. Only **app/PWA icons** carry a
   solid background.

---

## 7. Icon Sizing Rules

| Asset group   | viewBox     | Intended display | Background  |
|---------------|-------------|------------------|-------------|
| Class icons   | `512×512`   | Select screen    | Transparent |
| Skill icons   | `256×256`   | HUD buttons      | Transparent |
| Objective     | `256×256`   | Minimap / world  | Transparent |
| UI frames     | varies      | HUD chrome       | Transparent |
| App / PWA     | `512×512`   | Installed icon   | Solid       |

- Author at the listed viewBox; SVG scales cleanly to any on-screen size.
- Keep meaningful content within ~90% of the canvas (gameplay icons) and within
  the **central 80% safe zone** for `maskable-icon.svg` (platforms crop edges).
- Use even, round coordinates where possible for crisp scaling.

---

## 8. "Don'ts" — keep icons clean

- ❌ No fine detail that vanishes at 64 px (filigree, faces, tiny runes).
- ❌ No more than ~2 accent colors beyond the class hue + outline.
- ❌ No drop shadows, blurs, or photoreal gradients (one simple gradient max).
- ❌ No baked-in text labels.
- ❌ No external images, icon fonts, or downloaded SVGs.
- ❌ No full-icon backgrounds on gameplay assets (breaks compositing).
- ❌ Don't encode team ownership into the base objective art — tint at runtime.

---

*This kit is intentionally decoupled from the game runtime. Wiring assets into
scenes/HUD (and any manifest icon entries) is an integration step owned by the
runtime track, not by this asset kit.*
