# Lantern Vale Duel wire protocol (v1, server 0.1.2)

A local-first, server-authoritative **two-player PvP prototype**. Both players have the same 100 HP, movement speed and three actions. There are no NPCs, loot, levels, paid advantages or client-authored damage values.

## Run

Godot 4.6.3, with native server:

```sh
mkdir -p /tmp/lantern-server/{data,cache,config}
XDG_DATA_HOME=/tmp/lantern-server/data \
XDG_CACHE_HOME=/tmp/lantern-server/cache \
XDG_CONFIG_HOME=/tmp/lantern-server/config \
godot --headless --path . --script scripts/server.gd -- --port=9080 --bind=127.0.0.1
```

The XDG variables keep test/runtime data in writable locations; omit them on an ordinary installation with writable user-data directories. Connect with `ws://127.0.0.1:9080`. Only loopback bindings are accepted. No public deployment, authentication, TLS termination, persistence, matchmaking or account security is provided. Resume tokens are temporary bearer capabilities for this running process, not accounts; do not share them.

Simulation is fixed 20 Hz. Public snapshots are offered at up to 10 Hz. Inputs can arrive between ticks. All coordinates are world X/Z in meters; increasing Z is the second ground-plane coordinate. Bounds are X −10…10 and Z −7…7. There are no obstacles. Starting positions are (−6,0) and (+6,0); ends swap each rematch.

## Client messages

Each message is one UTF-8 JSON **text** WebSocket frame containing an object. Additional fields have no authority and are ignored. Actions are processed only when the phase is `playing`, except `hello`, `ping`, `ready`, `snapshot_ack` and `critical_ack`.

| Action | Example | Meaning |
|---|---|---|
| Join | `{"type":"hello","name":"Ember","resume_token":""}` | Join a free slot; name trimmed to 24 non-control characters |
| Resume | `{"type":"hello","name":"Ember","resume_token":"TOKEN"}` | Resume an existing disconnected slot; existing name and state retained |
| Move | `{"type":"move","x":2.0,"z":1.0}` | Set destination, clamped to arena bounds; speed 4.5 m/s |
| Strike | `{"type":"attack","target":"p2"}` | Melee target player; 2 m range, 14 damage, 0.65 s cooldown |
| Aether bolt | `{"type":"skill","x":2.0,"z":1.0}` | Aim toward endpoint from current position; 0.4 s stationary-origin telegraph, 9 m/s projectile, 0.8 m hit radius, 24 damage, 3 s cooldown |
| Dash | `{"type":"dash","x":2.0,"z":1.0}` | Direction toward endpoint; exactly 3 m over 0.18 s, clamped to bounds; 4 s cooldown; invulnerable while `dashing` |
| Rematch | `{"type":"ready"}` | Mark ready in `finished`/`waiting`; both connected players must be ready |
| Ping | `{"type":"ping","clock":123.5}` | Application-level `pong`; optional finite numeric `clock` is echoed unchanged for clock-bound sampling |

Aim endpoints choose a direction, not a destination length. A non-zero direction is required for skill/dash. A dash lasts at most 0.18 s and does not teleport; its final simulation step can be shorter than 50 ms. Movement destination may be changed during a dash, but does not change its committed direction or 3 m travel. Skills launch from the telegraphed origin, even if the caster moves before launch. Projectiles are segment-tested to avoid tunneling, affect only the opponent, stop after one hit and expire after 3.5 s or leaving the arena margin. A dodged projectile passes through the invulnerable duelist. Valid melee strikes consume their cooldown even if the opponent is dashing.

## Server messages

### Welcome (private to this connection)

```json
{"type":"welcome","id":"p1","token":"48_HEX_CHARACTERS","resumed":false,"tick_rate":20,"snapshot_rate":10,"snapshot_ack":true,"critical_timeline":true,"server_version":"0.1.2","server_time":2.1}
```

Store token locally for reconnect. Tokens are never included in public snapshots or events. Reusing a token while its player is still connected returns `token_in_use`. This prevents accidental duplicate-session takeover; it is not account authentication.

### Snapshot (identical public state for both clients)

```json
{
  "type":"snapshot", "tick":42, "server_time":2.1,
  "players":[
    {"id":"p1","name":"Ember","x":-6.0,"z":0.0,"hp":100,"max_hp":100,
     "wins":0,"attack_seq":0,"skill_cd":0.0,"dash_cd":0.0,"attack_cd":0.0,
     "dashing":false,"connected":true,"ready":false}
  ],
  "projectiles":[{"id":"b2","owner":"p1","x":0.0,"z":0.0,"dx":1.0,"dz":0.0}],
  "telegraphs":[{"id":"t3","owner":"p2","x":6.0,"z":0.0,"dx":-1.0,"dz":0.0,"remaining":0.3}],
  "round":{"phase":"playing","winner":"","number":1,"countdown":0.0,"reason":""},
  "world":{"bounds":{"min_x":-10,"max_x":10,"min_z":-7,"max_z":7}}
}
```

- `server_time`: monotonic seconds since process launch, not UTC
- `tick`: monotonic fixed simulation tick, continuing during pauses
- `*_cd`: remaining cooldown seconds; frozen with combat while paused
- `attack_seq`: monotonically increasing accepted melee-strike counter, useful for swing animation
- `wins`: current process/session score; increments once per victory
- `dx`,`dz`: unit direction of bolt or telegraph
- `remaining`: telegraph seconds until launch
- `winner`: player ID or empty string; retained throughout finished round
- `reason`: empty until end, then `knockout`, `disconnect` or `abandoned`

Clients should render/interpolate these snapshots and send intentions. They never author authoritative positions, HP, damage, wins, cooldowns or round transitions.

### Events and errors

```json
{"type":"event","kind":"hit","text":"Ember hits Azure for 14.","tick":60,"player":"p1","target":"p2","amount":14,"source":"melee"}
{"type":"error","reason":"attack_cooldown"}
{"type":"pong","tick":60,"server_time":3.0}
```

Event kinds: `join`, `countdown`, `round_start`, `attack`, `cast`, `dash`, `dodge`, `hit`, `pause`, `resume`, `round_end`. Text is suitable for a local event feed. Optional event fields vary; only `type`, `kind`, `text` and `tick` are common.

Error reasons: `invalid_json`, `invalid_type`, `text_required`, `packet_too_large`, `rate_limit`, `hello_timeout`, `hello_required`, `invalid_hello`, `already_joined`, `invalid_resume_token`, `token_in_use`, `arena_full`, `unknown_type`, `round_not_playing`, `round_not_finished`, `invalid_coordinates`, `invalid_direction`, `invalid_target`, `out_of_range`, `attack_cooldown`, `skill_cooldown`, `dash_cooldown`, `slow_consumer`.

## Bounded delivery (0.1.1, backward compatible)

New clients negotiate `"snapshot_ack":true` on hello. Welcome echoes the flag
and `"server_version":"0.1.2"`. After consuming a snapshot the client sends
`{"type":"snapshot_ack","tick":123}` with that exact snapshot's tick.
Initial and resumed state arrive on the next normal broadcast (within 100 ms);
only that global broadcast constructs snapshots, so a tick names one identical
state for all recipients. Only one snapshot is in flight per negotiated connection. While it is awaiting
acknowledgement, the server does not enqueue more snapshots or cosmetic events.
It retains no backlog: the next normal simulation broadcast after a valid ack
sends the newest complete state. HP, position, attack counters, cooldowns,
projectiles and round outcomes are authoritative in that snapshot. Events are
best-effort presentation hints, not a reliable event log.

A repeated last acknowledgement is harmless. A malformed, stale, or future tick
cannot release a newer outstanding snapshot and returns `invalid_snapshot_ack`.
Acknowledgements count toward the existing input-rate limit. Legacy clients that
do not negotiate this flag retain the original 10 Hz behavior; new clients still
accept older servers that omit the welcome capability. Deploy the new server
before publishing the new client to gain the bound for Web clients.

This fixes producer/consumer imbalance when a browser's main thread is stalled:
10 Hz for 32 seconds used to produce over 300 messages for a 128-packet queue.
It does not claim to improve slow-device rendering speed or eliminate frame stalls.

## Bounded critical timeline (optional, server 0.1.2)

Negotiate `"critical_timeline":true` in `hello` (independently of
`"snapshot_ack":true`). `welcome` echoes both negotiated booleans, includes
`server_version` and monotonic `server_time`, and immediately supplies a current
critical timeline for a new or resumed connection. Both capability flags must
be JSON booleans; omitting either retains that channel's legacy behavior.

```json
{
  "type":"critical_timeline", "seq":4, "tick":123, "server_time":6.2,
  "round_number":1, "phase":"playing",
  "telegraphs":[{"id":"t1","owner":"p2","x":6.0,"z":0.0,"dx":-1.0,"dz":0.0,"expires_at":6.6}],
  "dashes":[{"owner":"p1","x":-6.0,"z":0.0,"dx":1.0,"dz":0.0,"expires_at":6.38}]
}
```

This is a complete, current critical state, not a reliable history of actions.
Accepted cast/dash, countdown, play, pause, resume, round end, session reset,
and natural cue expiry trigger an update independently of ordinary snapshot
credit. Each connection has at most **one critical packet in flight plus one
dirty bit**. Further changes set that bit, without storing packets or cues.
The receiver sends `{"type":"critical_ack","seq":4}` after consuming the
packet. Only the exact outstanding per-connection sequence releases its credit;
if dirty, the server immediately builds the latest state. Expired cues are never
replayed. A duplicate last ACK is harmless. Malformed, stale, future or
unnegotiated ACKs return `invalid_critical_ack` and cannot release credit.
The sequence starts at 1 on each connection; `tick` remains the global
simulation tick but is not a critical-event ID. Ordinary snapshot ticks still
identify one globally constructed snapshot, regardless of critical updates.

At most two telegraphs and two dashes can be active (two players and unchanged
cooldowns). Coordinates/directions come exclusively from accepted server state.
`expires_at` is absolute server-monotonic seconds, constructed from the current
remaining simulation duration. Deadlines respect the fixed 50 ms simulation
step; they do not lengthen the 0.4 s telegraph or 0.18 s dash. Non-playing packets
have empty arrays: paused effects remain frozen internally, and resume rebuilds
new deadlines from their remaining duration. Clients clear critical visuals
outside `playing`, filter already-expired entries and expire active entries
locally instead of keeping them until the next snapshot or critical packet.

For a conservative server-clock upper bound, record the local monotonic hello
send time and pair it with `welcome.server_time`. An optional
`{"type":"ping","clock":LOCAL_SEND_TIME}` returns the same finite numeric
`clock` plus `server_time` in `pong`; invalid values return `invalid_clock` (or
`invalid_json` for non-JSON numeric syntax). No-clock pings retain their original
response. The echo has no gameplay authority. Matching a response to its send
time bounds server clock from above without assuming a symmetric RTT; clients
can add a small margin for simulation quantization, and must not render a cue
whose expiry is already behind that conservative clock. A packet cannot make a
frame that takes longer than the warning window physically render on time.

This channel fixes a distinct omission in snapshot-only backpressure: an old
unacknowledged snapshot can cover an entire 0.4 s cast, and the next snapshot
contains only the launched projectile. The critical channel sends a currently
active warning while that ordinary snapshot is still blocked. Holding critical
credit may still coalesce an entire warning away; it deliberately never creates
a backlog or a late fake warning to hide client stalls.

## Round and reconnection lifecycle

1. First player waits in `waiting`. On the second initial join, both enter a 3 s `countdown` automatically.
2. `playing` permits combat and movement. A lethal hit produces `finished`, winner, reason `knockout`, and one score increment. There are no simultaneous-draw claims; this simple prototype processes messages deterministically in server poll order.
3. Each duelist sends `ready` after the result. When both are connected and ready, the next round resets HP/cooldowns/effects, swaps ends and starts another countdown. One ready never starts a round alone.
4. A disconnect during countdown/play changes phase to `paused`. Combat, projectiles, cooldowns and movement freeze. The clock allows 6 real seconds for reconnection.
5. Both reconnecting within grace restores the previous phase. Otherwise a connected opponent wins by `disconnect`, or the round ends `abandoned` if neither remains. Result is awarded once.
6. A disconnected slot/token survives for 60 s in memory. Reconnecting after forfeiture preserves the score/result, but does not undo the loss. After expiry the slot is freed; the remaining connected player returns to `waiting` for another player. Restarting the server erases all sessions and scores.

A clean disconnect is immediate. Network failures are detected via the WebSocket transport/heartbeat and then start the grace timer; this is not a production-grade dead-peer SLA.

## Defensive limits

- Application packet size ≤1024 bytes; input buffer 8192 bytes and max 64 queued packets
- Token bucket: 40 messages/s sustained, burst 64; queue overflow may disconnect earlier
- Maximum 16 transport connections and 2 player slots
- 10 s handshake/hello deadline; slow outgoing consumers disconnected
- Coordinates must be finite JSON numbers (not bool/string/null) with magnitude ≤1,000,000; movement targets then clamp to arena
- No arbitrary client state merges, persistence, file I/O commands or executable message fields

These are local-prototype guardrails, not a security audit or anti-cheat guarantee. Production online play needs secure transport, authenticated accounts, trusted hosting, stronger abuse controls, latency handling and load/security testing.

## Automated verification

```sh
python tests/integration.py
python tests/critical_timeline.py
```

The test runner starts a **fresh native Godot server on an isolated ephemeral loopback port**, uses two real simultaneous Python WebSocket clients, and stops only its own process. It does not reset the visual UI server. Results: `qa/server-test-report.json`; server output: `qa/server-test.log`. Uses Python package `websockets`.

The critical-timeline suite uses fresh isolated real-WebSocket servers to compare snapshot-only omission with independent on-time critical delivery, validate coalescing/ACK bounds, pause/resume/expiry, and confirm input/clock validation. It is protocol evidence, not proof of actual browser frames. Results: `qa/critical-timeline-report.json`.

Godot APIs: [Time](https://docs.godotengine.org/en/stable/classes/class_time.html), [WebSocketPeer](https://docs.godotengine.org/en/stable/classes/class_websocketpeer.html), [TCPServer](https://docs.godotengine.org/en/stable/classes/class_tcpserver.html).
