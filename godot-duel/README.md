# ClanWar Godot Duel / Lantern Vale

An original isometric 1v1 PvP vertical slice built entirely in Godot 4.6.3.
The existing Three.js ClanWar project at the repository root is preserved.
This is a separate playable duel prototype, not a complete port of the legacy
siege game or a persistent MMO.

## Play locally

1. Open `godot-duel/project.godot` with Godot 4.6.3 (Compatibility renderer).
2. Start the server from this directory:
   `godot --headless --path . --script scripts/server.gd -- --bind=127.0.0.1 --port=9080`
3. Run two client instances, enter different names, and join
   `ws://127.0.0.1:9080`. The match begins when two players join.

For the small deployment-only server project use `godot-duel/server/`.
It is the same tested 0.1.0 rules/transport script, without client resources.

## Controls

- Click/tap the floor to move; click the rival or press E to pursue and strike
- WASD moves relative to the isometric camera
- Q casts Lumen Bolt toward the cursor; a 0.4 second warning precedes the bolt
- Space dashes toward the cursor with a short invulnerability window
- On touch, select Lumen or Dash, then tap a direction
- Both players must choose Ready for Rematch after a round
- Server / Escape opens the connection settings; sound can be muted

## Fair server rules

Both duelists have 100 HP and identical abilities. The authoritative server
owns movement, arena boundaries, hit range, cooldowns, damage, projectile
travel, dash immunity, wins, match phase, rematches, and reconnect handling.
The simulation runs at 20 Hz and publishes snapshots at 10 Hz. The client
interpolates visuals and sends intent only. No account or paid service is
required.

A disconnected round pauses for up to six seconds before a forfeit. A client
can resume its in-memory session for up to 60 seconds. Reloading the browser
starts a new client; the old slot expires after the session window. There is
one duel per server process, no matchmaking, no persistence, and no spectator
slot. A monitoring client must not send `hello` because that uses a player slot.

## Web / GitHub Pages

The Web export is single-threaded Compatibility and does not require
cross-origin-isolation headers. The workflow builds the unchanged legacy site
at the Pages root and places this client at `godot-duel/`. It deploys only on
an explicit manual dispatch from the default branch, after its checks pass.
See `deployment/README.md` for the workflow and release gates.

HTTPS pages require a trusted `wss://` endpoint. Pass the endpoint via
`?server=wss%3A%2F%2Fyour-host%2Fclanwar%2Fws` or enter it in the game.
GitHub Pages hosts the client only; the WebSocket server is a separate process.
The server itself binds only to loopback behind a reverse proxy.

## Validation

- `python tests/integration.py --godot /path/to/godot` runs 17 real-WebSocket checks
- `godot --headless --path . --script tests/ui_layout.gd` checks HUD bounds at three aspect ratios
- `godot --headless --path . --script tests/ui_input.gd` checks actual Godot GUI hit testing
- `godot --headless --path . --script tests/client_behavior.gd` checks rematch input and expired-session handling
- `python deployment/test-deployment.py` checks safe Pages staging and export validation
- `godot --headless --path . --export-release Web build/web/index.html` exports the client

Native two-client visual proof covers shared player positions, movement,
targeted melee, knockout, and the corresponding opposite outcome screens.
Browser startup and gameplay are checked separately by CI. A successful export
alone is not evidence that a public backend or Pages deployment is reachable.

## Assets

The duelist SVG, arena geometry, UI, and synthesized sound effects are original
project-scoped assets. The Ragnarok inspiration is the isometric presentation
and click-to-move feel; no Ragnarok files, sprites, names, or proprietary code
are included.
