# Phase 2.6: Mobile UX Hotfix

Short viewport fixes for real mobile browsers before Phase 3 combat.

## What changed

- **Fullscreen entry** — Menu Start requests fullscreen + landscape lock (best effort);
  Match has a fallback Fullscreen button when not already fullscreen.
- **PWA readiness** — `public/manifest.webmanifest` + mobile meta tags in `index.html`.
- **Compact control layout** — when `height < 480`, skill buttons use a tighter cluster;
  War Action moves above ATK/skills to avoid overlap; joystick shrinks.
- **Compact HUD** — shorter hint text and smaller fonts on short screens.

## Still not implemented

Combat, damage, shop, bots, economy runtime, balance changes.

## Test viewports

- 915 × 412 (phone landscape)
- 800 × 360
- 1024 × 600
- 800 × 1000 portrait (rotate hint)

```bash
npm run build
npm run preview
```
