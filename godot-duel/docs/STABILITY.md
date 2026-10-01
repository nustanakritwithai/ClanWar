# Phase 1 stability release, server 0.1.1

## Reproduced failure and correction

Released commit `150855df62d2b322bd8a91af317c9253bd204a3e` passed its publication
run `36915149324`. A subsequent validation of that same commit, run
`36915379830`, completed browser knockout and rematch but failed its strict
console-error gate: Godot reported `Too many packets in queue! Dropping data.`
Its two browsers recorded 21.9 s and 32.0 s main-thread stalls, continuously open
WebSockets, matching outcomes, and a clean dedicated-server log. This evidence
does not establish a public-server outage or identify every slow rendering call.

The failure mechanism is a producer/consumer mismatch: at 10 snapshots per
second a stalled consumer accumulates more than its 128-packet receive bound.
TCP delivery alone does not acknowledge that Godot consumed a snapshot.
Increasing that bound only postpones the same failure.

Native and Web behavior differ in Godot 4.6.3: the native WSL transport stops
reading when packet slots are full, whereas the Web EMWS transport writes each
browser callback into the bounded queue and `poll()` is a no-op. The native
control therefore establishes queue saturation, not the exact Web log error.
The failed Web CI artifact supplies that direct error evidence.
[Native source](https://github.com/godotengine/godot/blob/4.6.3-stable/modules/websocket/wsl_peer.cpp#L541-L546),
[Web source](https://github.com/godotengine/godot/blob/4.6.3-stable/modules/websocket/emws_peer.cpp).

Version 0.1.1 negotiates application-level snapshot acknowledgements. It permits
one outstanding snapshot and sends fresh current state after acknowledgement,
without retaining a history queue. Cosmetic events are suppressed while that
snapshot is outstanding. Reliable welcome/error replies remain distinct.
See [PROTOCOL.md](PROTOCOL.md). Legacy clients remain compatible, and the new
client accepts an older server, but bounded delivery requires the new server.

Client recovery clears stale combat intent, handles expired/in-use tokens,
times out a half-dead open connection, bounds outgoing input backlog, and
rejects older snapshots. Numeric diagnostics expose queue high-water and
reconnect counters without names or credentials.

## Combat expectations

This is two-human-player PvP. Each player must select the rival or press/tap
STRIKE to pursue and attack. Receiving damage does not create a bot or
automatically retaliate. Floor movement, Lumen, and Dash cancel pursuit;
select the rival again to resume melee. Combat, range, cooldowns and damage
remain server-authoritative. The stability gate exercises both players' inputs
and shared HP, rather than only hitting an idle opponent.

## Required gates

- Existing 17 real-WebSocket authority, combat and malformed-input checks
- Native receive-queue reproduction and bounded-delivery control
- 32-second consumer stall, invalid ACK rejection, same-ID reconnect,
  real six-second forfeit and 60-second session expiry
- Full playable-field projection inside usable HUD-safe screen bounds at
  desktop, phone portrait and short landscape sizes
- Two actual browser clients: bidirectional melee, casts and dashes,
  10 consecutive combat/rematch rounds, matching results and visible HP
- Every browser console error remains a failure; no queue-error suppression
- Exact legacy output preservation and exact-commit CI before deployment

CI browser viewport tests are not a real-phone FPS measurement. Application
flow control bounds queued state; it does not make a slow renderer fast.

## Rollout and rollback

Deploy only a tested exact server commit, then publish the matching web client.
Restarting the in-memory server interrupts the one arena and clears sessions
and wins. Keep server checkpoint `f7315ca8f0a12e13f9704710ba506c33fe13b689`
and the original 0.1.0 archive intact for rollback. The prior public site was
published from `150855df62d2b322bd8a91af317c9253bd204a3e`.

The static publication still combines all legacy output at `/` and the Godot
client at `/godot-duel/`. There are no new accounts, paid services, firewall
changes, extra public endpoints, or reboot/crash supervision in this phase.
