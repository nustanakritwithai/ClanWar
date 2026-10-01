# Real-browser stability gate

`browser-duel.cjs` runs the exact exported Web client with two independent Chromium
contexts, real Godot rendering, and an isolated unchanged-time-scale authoritative
server. It needs Playwright, Godot, and Tesseract, as the Pages CI job already does.

```sh
NODE_PATH=/path/to/browser-qa/node_modules \
  node deployment/browser-duel.cjs SITE_DIR GODOT_PROJECT REPORT_DIR
node --test deployment/test-browser-duel.cjs
```

The offline Node tests validate the harness, sanitization, real TCP proxy, camera
basis handling, and assertion failure modes (15 checks). They do **not** replace the hosted
real-browser run. This cloud container's Chromium process-singleton restriction
prevents a local browser pass from being claimed.

## Required evidence

1. Two real visible JOIN clicks, a two-player countdown, shared playing state
2. A real transport interruption, a server-observed pause, and automatic same-ID
   recovery without health, position, win, or round changes
3. Both players casting Q toward the other's actual ground position, both public
   telegraphs and projectiles, 24 damage to each duelist, and rendered `76 / 100`
   HP text checked with screenshot OCR
4. Both players using Space, replicated active dash states, and at least 2.5
   units of authoritative displacement
5. **Ten consecutive fights and ten completed two-click rematches**. Both browsers
   press E concurrently and must move, strike, and take opposing damage. One
   player then right-clicks the floor to disengage; the expected winner alternates.
   Each fight requires exactly converged public knockout state, the correct win increment,
   and rendered opposite VICTORY / ROUND LOST titles, individually OCR-checked
6. Every rematch proves a single ready is insufficient, both actual visible
   buttons restart countdown, HP and ready flags reset, win totals persist, round
   advances exactly once, and exact spawn positions swap relative to the previous
   round's **start**, rather than the positions reached during pursuit
7. An interruption exceeding the real six-second grace, a disconnect forfeit,
   automatic same-ID recovery within the retention window, shared result state,
   and opposite rendered result titles, followed by another real rematch
8. An interruption lasting until the server really removes the old slot after
   its unchanged 60-second TTL, automatic stale-session rejection and fresh-ID
   recovery, shared full-HP new-round state, correct preserved/reset wins, visible
   round text, and working pursuit/damage input from the replacement identity
9. A deliberate 15-second browser main-thread stall while idle, longer than the
   previous 128-packet/10 Hz queue window, then strictly post-stall shared state
   with unchanged players, exactly one socket and no closes/errors, and an actual
   engine receive-queue maximum of at most 16 packets
10. A real 390×844 portrait viewport with touch enabled: tap the rendered rival,
    observe shared opposing damage/strike count, capture the mobile combat image,
    and tap the floor to disengage/move before restoring the desktop viewport
11. Snapshot backpressure negotiated by the actual client and bounded client
   receive-queue telemetry, with no browser/server error or queue overflow

The required cycle count is a constant, not an environment-variable override.
Future camera fitting changes are supported through the read-only numeric
`window.__duelProjection` basis published by the client. This only selects physical
cursor coordinates; it cannot issue game commands or mutate the camera.

## Exact-state proof under independently sampled ticks

Snapshot ACK backpressure is negotiated separately by each real browser. Healthy
renderers can therefore observe permanently disjoint server ticks. The gate first
checks every overlapping tick relevant to the requested phase/round/freshness fence;
any same-tick disagreement is a hard failure, even if a different pair converges or
an outcome predicate would exclude the contradictory observation. Unrelated older
phases are not used as evidence for the current phase.

A fresh same-tick pair is preferred whenever available. Otherwise both browser
observations must exceed the requested tick fence, be no more than **20 simulation
ticks** behind the latest tick observed by either browser, and be within 20 ticks of
each other. Every retained public payload field must match exactly except `tick`.
There is no tolerance for health, positions, cooldowns, effects, rounds, ordering,
or value types. Both observations must independently satisfy the requested outcome
predicate. Stale observations cannot prove convergence.

Each returned proof contains `comparison.mode` (`same_tick` or
`fresh_exact_state`), both actual `comparison.observed_ticks`, the latest observed
tick and freshness limits. The snapshot's own `tick` remains Client A's actual tick;
it is never presented as a synthetic shared tick. Every comparison also records
this evidence in the report's `public_state_compared` timeline entry. This changes
sampling correctness only; input, outcome, OCR, queue, and error gates are unchanged.

The ten bidirectional melee/rematch cycles run before Q/Space checks. The complete
ability checks then use the full-HP round produced by the tenth actual rematch.

## Transport and security boundaries

Each browser connects through its own transparent loopback TCP proxy. Outages
close both TCP legs and reject new connections until restored. The proxy neither
parses nor modifies WebSocket messages. No test injects hello/ready/attack/resume
packets, edits server clocks, accelerates expiry, reloads the page to conceal a
recovery bug, or writes client game state.

The passive WebSocket observer retains only allow-listed public state, a negotiated
snapshot-ACK capability boolean, bounded transport timestamps/codes, and a generic
session-expiry marker. It never retains welcome packets, session credentials,
raw messages, close-reason text, or outgoing commands. No Playwright trace/HAR or
WebSocket frame dump is enabled.

A browser-generated WebSocket connection failure is expected only for the exact
client/loopback endpoint while that client's transport is intentionally interrupted
or recovering. These are recorded separately. Queue overflows, all script errors,
page errors, HTTP errors, and unrelated console errors remain hard failures,
including during the outage. Expected failures cannot turn a failed gameplay
assertion into a pass.

## Diagnostics and screenshots

`ci-duel-report.json` contains individual cycle evidence, sanitized final state,
proxy connection counters, and bounded timestamped operation/frame-gap/long-task
history. Screenshot start/end timings share epoch timestamps with renderer events
and console failures, making a rendering stall distinguishable from a deliberate
network interruption. Client diagnostics copy only explicit numeric fields.

Full screenshots cover JOIN, initial playing state, projectile damage, representative
first/final fight results, real portrait touch combat, and any failure. Cropped screenshot OCR proves both
result titles for **every** fight, reconnect results, and session recovery. Captures
are serialized rather than forcing two software renderers to read back simultaneously.
Tesseract runs asynchronously so it cannot block the Node process forwarding TCP.
The report preserves observed long gaps; it does not erase them or ignore errors
merely because an automated screenshot was being taken.

The scope is desktop Chromium on the exported build and local authoritative server.
It does not establish public-network reliability, real-device mobile quality, or
automatic AI retaliation. Both participants are explicitly controlled real clients.
