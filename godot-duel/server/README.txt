CLANWAR DUEL - HEADLESS SERVER SOURCE BUNDLE
Version 0.1.1 | Godot 4.6.3 | Tested on official Linux 4.6.3 runtime

Contents: original authoritative 1v1 server, protocol, 17-check local test report.
Windows runtime is NOT bundled. A fresh official portable Godot 4.6.3 Windows
x86_64 download must be approved before running it. No installer is needed.
The runtime's console EXE and its companion ordinary EXE must stay together.
Place both in runtime/ or set GODOT_EXE to the approved console EXE path.

Start: run-server.cmd
Equivalent:
Godot_v4.6.3-stable_win64_console.exe --headless --path . --script scripts/server.gd -- --bind=127.0.0.1 --port=8910

It listens on LOOPBACK ONLY. Do not open port8910 externally.
For the user-approved hosting route, reverse proxy an isolated Apache WSS path
/clanwar/ws to ws://127.0.0.1:8910. Do not replace other sites or proxy routes.
Public TLS route must be validated from outside after deployment. A static
GitHub Pages client cannot host this long-running server itself.

No persistence, real accounts, chat, purchases, inventory, or MMO scaling.
Two duelists per process. Resume tokens are temporary in-memory capabilities,
not production authentication. Server restart resets rounds and scores.
Use this as a small invite-based prototype. Public adversarial testing,
origin allowlisting, process supervision and capacity planning remain future
hardening; do not call this production ready.

The 17 test cases include two real clients, 20Hz/10Hz rates, movement replication,
input validation, anti-forgery, melee range/cooldown, telegraphed projectiles,
dash bounds/invulnerability/cooldown, knockout-once, rematch and side swap,
reconnect/forfeit, token protection, and packet/rate limits.
This candidate requires exact-commit CI and coordinated VPS rollout before publication.
New clients use negotiated one-in-flight snapshot acknowledgements to avoid
receive-queue overflow during renderer stalls. Old clients remain compatible.
Do not overwrite the 0.1.0 rollback artifact; retain its pinned Git commit.
Run tests/stability.py for bounded-delivery, malformed-ACK and expiry checks.
