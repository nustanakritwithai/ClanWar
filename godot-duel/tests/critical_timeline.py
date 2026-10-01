#!/usr/bin/env python3
"""Bounded critical-timeline regressions over real isolated WebSockets.

No combat duration or clock is mocked. The snapshot-only control deliberately
holds an old snapshot's ACK for an entire real 0.4s cast. The negotiated case
holds the same credit but receives the current warning independently. This
proves protocol delivery before expiry, not whether a browser actually draws.
A simultaneous two-cast/two-dash burst is delivered with NO critical ACKs and
held ordinary snapshot credit; the fixed four-entry window then coalesces
expiries into one fresh state rather than keeping historical action packets.
Run: python tests/critical_timeline.py --godot /path/to/godot
"""
from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
from pathlib import Path
import shutil
import time
import traceback

from integration import Client, player
from stability import ManualClient, isolated_server

ROOT = Path(__file__).resolve().parents[1]
REPORT = {"suite": "bounded-critical-timeline-real-websocket", "tests": [], "status": "running",
          "evidence_scope": "real protocol delivery and expiry; not browser-frame proof"}


def record(name, details, **metrics):
    REPORT["tests"].append({"name": name, "status": "passed", "details": details, **metrics})
    print(f"PASS {name}: {details}", flush=True)


class TimelineClient(ManualClient):
    def __init__(self, connection):
        super().__init__(connection)
        self.messages = []
        self.welcome = None
        self.critical = None

    @classmethod
    async def join(cls, url, name, *, critical=True, snapshot_ack=True, token=""):
        client = await cls.open(url)
        try:
            await client.send(type="hello", name=name, resume_token=token,
                              snapshot_ack=snapshot_ack, critical_timeline=critical)
            welcome = await client.until(lambda m: m.get("type") == "welcome")
            client.id, client.token = welcome["id"], welcome["token"]
            client.welcome = welcome
            assert welcome["critical_timeline"] is critical, welcome
            assert welcome["snapshot_ack"] is snapshot_ack, welcome
            assert welcome["server_version"] == "0.1.2", welcome
            assert isinstance(welcome["server_time"], (int, float)), welcome
            return client
        except BaseException:
            await client.close()
            raise

    async def receive(self, timeout=3):
        message = await super().receive(timeout)
        self.messages.append(message)
        if message.get("type") == "critical_timeline":
            self.critical = message
            assert 0 <= len(message["telegraphs"]) <= 2, message
            assert 0 <= len(message["dashes"]) <= 2, message
            assert message["phase"] == "playing" or not (message["telegraphs"] or message["dashes"]), message
            assert all(cue["expires_at"] > message["server_time"] for cue in message["telegraphs"] + message["dashes"]), message
        return message

    async def critical_ack(self, message):
        await self.send(type="critical_ack", seq=message["seq"])

    async def pump_until(self, predicate, timeout=5, *, snapshots=True, critical=True):
        deadline = time.monotonic() + timeout
        while True:
            message = await self.receive(max(.001, deadline - time.monotonic()))
            if predicate(message):
                return message
            if message.get("type") == "snapshot" and snapshots:
                await self.ack(message)
            elif message.get("type") == "critical_timeline" and critical:
                await self.critical_ack(message)

    async def timeline(self, predicate=lambda m: True, timeout=5):
        return await self.pump_until(lambda m: m.get("type") == "critical_timeline" and predicate(m), timeout,
                                     snapshots=False, critical=True)


async def close_all(clients):
    for client in clients:
        with contextlib.suppress(Exception):
            await client.close()


async def playing_pair(url, *, critical=True):
    a = await TimelineClient.join(url, "Critical observer", critical=critical)
    b, _ = await Client.connect(url, "Authoritative caster")
    try:
        anchor = await a.pump_until(lambda m: m.get("type") == "snapshot" and m["round"]["phase"] == "playing")
        # The playing snapshot stays unacknowledged throughout each test.
        await b.until(lambda s: s["round"]["phase"] == "playing")
        messages, _ = await a.drain_to_pong()
        for message in messages:
            if message.get("type") == "critical_timeline":
                await a.critical_ack(message)
        return a, b, anchor
    except BaseException:
        await close_all([a, b])
        raise


async def snapshot_only_control(url):
    a, b, anchor = await playing_pair(url, critical=False)
    try:
        start = len(a.messages)
        await b.send(type="skill", x=-6, z=0)
        await b.until(lambda s: len(s["telegraphs"]) == 1)
        await asyncio.sleep(.55)
        drained, _ = await a.drain_to_pong()
        assert not any(m.get("type") in {"snapshot", "critical_timeline"} for m in drained), drained
        assert not any(m.get("kind") == "cast" for m in drained), drained
        await a.ack(anchor)
        fresh = await a.until(lambda m: m.get("type") == "snapshot")
        assert not fresh["telegraphs"] and fresh["projectiles"], fresh
        assert not any(m.get("telegraphs") for m in a.messages[start:]), a.messages[start:]
        await b.until(lambda s: player(s, a.id)["hp"] == 76)
        record("snapshot_only_skips_entire_cast", "Held old snapshot credit through a real 0.4s cast; next state had a launched bolt but no warning; unchanged bolt dealt 24 damage",
               blocked_tick=anchor["tick"], recovery_tick=fresh["tick"], skipped_warning=True)
    finally:
        await close_all([a, b])


async def independent_delivery(url):
    a, b, anchor = await playing_pair(url)
    try:
        start = len(a.messages)
        sent = time.monotonic()
        await b.send(type="skill", x=-6, z=0)
        cue = await a.timeline(lambda m: len(m["telegraphs"]) == 1)
        elapsed = time.monotonic() - sent
        remaining = cue["telegraphs"][0]["expires_at"] - cue["server_time"]
        # This conservative local bound includes the complete request/response
        # duration rather than assuming half an RTT for one-way latency.
        remaining_upper_bound = remaining - elapsed
        assert remaining_upper_bound > .15, (remaining, elapsed, cue)
        assert cue["phase"] == "playing" and cue["round_number"] == 1
        assert cue["telegraphs"][0]["owner"] == b.id
        assert not any(m.get("type") == "snapshot" for m in a.messages[start:]), a.messages[start:]
        await a.critical_ack(cue)
        expired = await a.timeline(lambda m: not m["telegraphs"])
        assert expired["seq"] == cue["seq"] + 1, (cue, expired)
        await a.critical_ack(expired)
        await b.until(lambda s: player(s, a.id)["hp"] == 76)
        drained, _ = await a.drain_to_pong()
        assert not any(m.get("type") == "snapshot" for m in drained), drained
        record("critical_delivery_bypasses_snapshot_credit", "Received an active warning with time remaining while the old ordinary snapshot was unacknowledged; natural expiry cleared it and the authoritative bolt still dealt 24",
               blocked_tick=anchor["tick"], critical_tick=cue["tick"], request_to_cue_seconds=round(elapsed, 4),
               conservative_remaining_seconds=round(remaining_upper_bound, 4))
        phases = [m["phase"] for m in a.messages if m.get("type") == "critical_timeline"]
        assert phases[:3] == ["waiting", "countdown", "playing"], phases
        record("join_countdown_play_timelines", "Immediate initial timeline and distinct countdown/play changes were delivered independently of ordinary snapshots", phases=phases)
    finally:
        await close_all([a, b])


async def coalescing_and_ack_validation(url):
    a, b, _ = await playing_pair(url)
    try:
        # playing_pair consumes/ACKs all initial phase timelines and its ping
        # barrier proves those ACKs were processed before the burst. Hold the
        # ordinary snapshot and send NO critical ACK until all four starts are
        # consumed, so a one-credit implementation deterministically fails.
        initial_seq = a.critical["seq"]
        sent = time.monotonic()
        await asyncio.gather(
            b.send(type="skill", x=6, z=7), b.send(type="dash", x=6, z=7),
            a.send(type="skill", x=-6, z=7), a.send(type="dash", x=-6, z=7),
        )
        frames = []
        delivery_remaining = []
        while len(frames) < 4:
            message = await a.receive()
            assert message.get("type") != "snapshot", message
            if message.get("type") == "critical_timeline":
                elapsed = time.monotonic() - sent
                frames.append(message)
                remaining = [cue["expires_at"] - message["server_time"] - elapsed
                             for cue in message["telegraphs"] + message["dashes"]]
                assert remaining and min(remaining) > 0, (elapsed, message)
                delivery_remaining.append(min(remaining))
        combined = frames[-1]
        assert [m["seq"] for m in frames] == list(range(initial_seq + 1, initial_seq + 5)), frames
        assert [len(m["telegraphs"]) + len(m["dashes"]) for m in frames] == [1, 2, 3, 4], frames
        assert {cue["owner"] for cue in combined["telegraphs"]} == {a.id, b.id}
        assert {cue["owner"] for cue in combined["dashes"]} == {a.id, b.id}
        assert all(0 < cue["expires_at"] - combined["server_time"] <= .4 + 1e-8 for cue in combined["telegraphs"])
        assert all(0 < cue["expires_at"] - combined["server_time"] <= .18 + 1e-8 for cue in combined["dashes"])
        record("four_start_window_without_critical_acks", "Both players' simultaneous cast/dash starts produced four ordered active timelines before expiry with no critical ACK and an old snapshot still blocked",
               initial_phase_ack_seq=initial_seq, delivered_sequences=[m["seq"] for m in frames],
               max_pending_critical_frames=4, telegraphs=2, dashes=2,
               minimum_conservative_remaining_seconds=round(min(delivery_remaining), 4))

        # Natural expiry generates changes, but the full window cannot enqueue
        # a fifth packet. Only one dirty bit is retained until valid credit.
        await asyncio.sleep(.55)
        messages, _ = await a.drain_to_pong()
        assert not any(m.get("type") == "critical_timeline" for m in messages), messages
        malformed = [({}, "missing"), ({"seq": None}, "null"), ({"seq": True}, "boolean"),
                     ({"seq": str(combined["seq"])}, "string"), ({"seq": []}, "array"),
                     ({"seq": {}}, "object"), ({"seq": combined["seq"] + .5}, "fractional"),
                     ({"seq": -1}, "negative"), ({"seq": 0}, "zero"), ({"seq": 1e30}, "huge"),
                     ({"seq": combined["seq"] + 1}, "future"), ({"seq": initial_seq - 1}, "stale"),
                     ({"seq": float("nan")}, "nonfinite")]
        for payload, label in malformed:
            await a.send(type="critical_ack", **payload)
            messages, _ = await a.drain_to_pong()
            assert not any(m.get("type") == "critical_timeline" for m in messages), (label, messages)
            assert any(m.get("reason") in {"invalid_critical_ack", "invalid_json"} for m in messages), (label, messages)
        # Repeating the last phase ACK does not release any newer action packet.
        await a.send(type="critical_ack", seq=initial_seq)
        messages, _ = await a.drain_to_pong()
        assert not any(m.get("type") in {"critical_timeline", "error"} for m in messages), messages
        # A valid third packet's ACK cumulatively releases the first three;
        # the fourth remains outstanding and exactly one dirty state is sent.
        await a.critical_ack(frames[2])
        latest = await a.timeline()
        assert latest["seq"] == combined["seq"] + 1
        assert not latest["telegraphs"] and not latest["dashes"], latest
        assert latest["server_time"] > max(cue["expires_at"] for cue in combined["telegraphs"])
        await a.critical_ack(frames[2])
        messages, _ = await a.drain_to_pong()
        assert not any(m.get("type") in {"critical_timeline", "error"} for m in messages), messages
        # These formerly outstanding values must now be stale, proving the
        # cumulative release actually removed predecessors as well as packet3.
        for old in frames[:2]:
            await a.critical_ack(old)
            messages, _ = await a.drain_to_pong()
            assert any(m.get("reason") == "invalid_critical_ack" for m in messages), messages
            assert not any(m.get("type") == "critical_timeline" for m in messages), messages
        await a.critical_ack(combined)
        await a.critical_ack(latest)
        await a.critical_ack(latest)
        messages, _ = await a.drain_to_pong()
        assert not any(m.get("type") in {"critical_timeline", "error"} for m in messages), messages
        record("invalid_ack_and_expired_dirty_coalescing", "Full four-packet window queued nothing on expiry; 13 invalid ACK variants and a duplicate phase ACK could not unlock it; exact outstanding ACK cumulatively released predecessors and rebuilt one empty current state",
               invalid_variants=[label for _, label in malformed],
               cumulative_ack_seq=frames[2]["seq"], rebuilt_seq=latest["seq"], expired_cues_replayed=0)

        # Gameplay fields, client expiry and event sequence have no authority.
        await a.send(type="skill", x=True, z=0, expires_at=1e20, seq=99999)
        await a.until(lambda m: m.get("reason") == "invalid_coordinates")
        await a.send(type="critical_timeline", seq=99999, telegraphs=[{"owner": a.id, "expires_at": 1e20}])
        await a.until(lambda m: m.get("reason") == "unknown_type")
        await a.send(type="dash", x=-6, z=7, expires_at=1e20)
        await a.until(lambda m: m.get("reason") == "dash_cooldown")
        messages, _ = await a.drain_to_pong()
        assert not any(m.get("type") == "critical_timeline" for m in messages), messages
        assert all(p["hp"] == 100 for p in b.snapshot["players"]), b.snapshot
        record("critical_inputs_have_no_gameplay_authority", "Forged timelines, boolean coordinates and dash cooldown bypass attempts were rejected without generating accepted cues or changing HP")
    finally:
        await close_all([a, b])


async def pause_resume_end(url):
    a, b, _ = await playing_pair(url)
    clients = [a, b]
    try:
        token = b.token
        await a.send(type="skill", x=-6, z=7)
        cast = await a.timeline(lambda m: bool(m["telegraphs"]))
        await a.critical_ack(cast)
        await b.close()
        paused = await a.timeline(lambda m: m["phase"] == "paused")
        assert not paused["telegraphs"] and not paused["dashes"]
        await a.critical_ack(paused)
        await asyncio.sleep(.65)
        messages, _ = await a.drain_to_pong()
        assert not any(m.get("type") == "critical_timeline" for m in messages), messages
        resumed_b = await TimelineClient.join(url, "Ignored rename", token=token)
        clients.append(resumed_b)
        assert resumed_b.welcome["resumed"] is True
        resumed = await a.timeline(lambda m: m["phase"] == "playing")
        assert resumed["telegraphs"][0]["id"] == cast["telegraphs"][0]["id"], (cast, resumed)
        assert resumed["server_time"] > cast["telegraphs"][0]["expires_at"]
        assert 0 < resumed["telegraphs"][0]["expires_at"] - resumed["server_time"] <= .4 + 1e-8
        joined = await resumed_b.timeline()
        assert joined["seq"] == 1 and joined["phase"] == "playing"
        assert joined["telegraphs"][0]["id"] == cast["telegraphs"][0]["id"]
        await resumed_b.critical_ack(joined)
        await a.critical_ack(resumed)
        expired = await a.timeline(lambda m: not m["telegraphs"])
        await a.critical_ack(expired)
        record("pause_resume_rebases_active_windows", "Pause cleared wall-clock cues; after waiting beyond the original deadline, resume rebuilt the frozen cast deadline and the rejoined connection started with sequence 1 current state",
               original_expiry=cast["telegraphs"][0]["expires_at"], resumed_expiry=resumed["telegraphs"][0]["expires_at"])

        await resumed_b.close()
        paused_again = await a.timeline(lambda m: m["phase"] == "paused")
        await a.critical_ack(paused_again)
        finished = await a.timeline(lambda m: m["phase"] == "finished", timeout=8)
        assert not finished["telegraphs"] and not finished["dashes"]
        await a.critical_ack(finished)
        returning_b = await TimelineClient.join(url, "Return after forfeit", token=token)
        clients.append(returning_b)
        joined_finished = await returning_b.timeline()
        assert joined_finished["seq"] == 1 and joined_finished["phase"] == "finished"
        await returning_b.critical_ack(joined_finished)
        await a.send(type="ready")
        await returning_b.send(type="ready")
        countdown = await a.timeline(lambda m: m["phase"] == "countdown")
        assert countdown["round_number"] == 2
        await a.critical_ack(countdown)
        playing = await a.timeline(lambda m: m["phase"] == "playing")
        assert playing["round_number"] == 2
        assert not playing["telegraphs"] and not playing["dashes"]
        record("forfeit_rejoin_and_rematch_phase_updates", "With the original ordinary snapshot still blocked, critical phase covered pause, six-second forfeit, finished-state rejoin, round 2 countdown and play")
    finally:
        await close_all(clients)


async def negotiation_and_clock(url):
    raw = await TimelineClient.open(url)
    clients = [raw]
    try:
        await raw.send(type="critical_ack", seq=1)
        await raw.until(lambda m: m.get("reason") == "hello_required")
        for value in [1, "true", None, [], {}]:
            await raw.send(type="hello", name="Validation", critical_timeline=value)
            await raw.until(lambda m: m.get("reason") == "invalid_hello")
        await raw.send(type="hello", name="Legacy validation")
        welcome = await raw.until(lambda m: m.get("type") == "welcome")
        assert welcome["critical_timeline"] is False
        await raw.send(type="critical_ack", seq=1)
        await raw.until(lambda m: m.get("reason") == "invalid_critical_ack")
        for value in [None, True, "1.0", [], {}, float("inf")]:
            await raw.send(type="ping", clock=value)
            await raw.until(lambda m: m.get("reason") in {"invalid_clock", "invalid_json"})
        for clock in [0, -1, 123.456, 1e30]:
            await raw.send(type="ping", clock=clock)
            pong = await raw.until(lambda m: m.get("type") == "pong")
            assert pong["clock"] == clock and pong["server_time"] >= welcome["server_time"], pong
        drained, pong = await raw.drain_to_pong()
        assert "clock" not in pong
        assert not any(m.get("type") == "critical_timeline" for m in raw.messages)
        record("hello_and_clock_validation_legacy_compatibility", "Boolean-only capability negotiation, pre-hello/unnegotiated ACK rejection, finite numeric clock echo and no-clock ping compatibility passed; legacy connection received no critical packets")

        # Capability is independent: no snapshot ACK negotiation is required.
        independent = await TimelineClient.join(url, "Critical only", snapshot_ack=False)
        clients.append(independent)
        current = await independent.timeline()
        assert current["seq"] == 1 and current["phase"] == "countdown"
        await independent.critical_ack(current)
        messages, _ = await independent.drain_to_pong()
        await asyncio.sleep(.25)
        messages, _ = await independent.drain_to_pong()
        assert len([m for m in messages if m.get("type") == "snapshot"]) >= 2
        record("critical_negotiation_independent_of_snapshot_ack", "Critical channel negotiates independently while ordinary legacy snapshots continue at 10 Hz")
    finally:
        await close_all(clients)


async def main(args):
    started = time.monotonic()
    report_path = args.report.resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    REPORT.update({"server_script": str(args.server_script.resolve()), "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})

    async def run(label, test):
        try:
            async with isolated_server(args.godot, args.server_script.resolve(), "critical-" + label, report_path.parent) as url:
                await asyncio.wait_for(test(url), 30)
        except Exception as exc:
            REPORT["tests"].append({"name": label, "status": "failed", "failure": str(exc), "traceback": traceback.format_exc()})
            traceback.print_exc()

    await asyncio.gather(*(run(label, test) for label, test in [
        ("control", snapshot_only_control), ("delivery", independent_delivery),
        ("bounds", coalescing_and_ack_validation), ("lifecycle", pause_resume_end),
        ("validation", negotiation_and_clock)]))
    REPORT["status"] = "failed" if any(t["status"] == "failed" for t in REPORT["tests"]) else "passed"
    REPORT["passed_count"] = sum(t["status"] == "passed" for t in REPORT["tests"])
    REPORT["duration_seconds"] = round(time.monotonic() - started, 3)
    report_path.write_text(json.dumps(REPORT, indent=2) + "\n")
    print(f"{REPORT['status'].upper()}: {REPORT['passed_count']} checks in {REPORT['duration_seconds']}s; report {report_path}")
    return 0 if REPORT["status"] == "passed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", default=shutil.which("godot") or "godot")
    parser.add_argument("--server-script", type=Path, default=ROOT / "scripts/server.gd")
    parser.add_argument("--report", type=Path, default=ROOT / "qa/critical-timeline-report.json")
    raise SystemExit(asyncio.run(main(parser.parse_args())))
