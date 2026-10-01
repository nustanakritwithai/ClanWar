#!/usr/bin/env python3
"""Real-WebSocket stall, ACK, reconnect, and 60-second session regressions.

Run: python tests/stability.py --godot /path/to/godot
Optional historical control: --baseline-server /path/to/old/server.gd

This is a protocol regression harness, not visual/browser proof. A manual
client deliberately stops calling recv() and sending commands for 32 real
seconds. The WebSocket network layer keeps accepting packets, as a browser
does while its Godot main thread is stalled. max_queue=None is intentional:
Python's receive-queue backpressure must not hide the application's backlog.
No server clock, session TTL, or packet timing is mocked or accelerated.
Native probes additionally reproduce WebSocketPeer's 128-packet queue saturation,
then verify the negotiated transport survives the same queue bound. Native
WSLPeer stops reading at its limit; unlike Web EMWSPeer it does not emit the Web
overflow error. Neither this suite nor its native probe claims browser proof.

Every case owns a fresh loopback server and terminates only that subprocess.
The existing 17-check integration suite is imported for its client helpers;
it is not modified or invoked in place of these additional checks.
"""
from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import os
from pathlib import Path
import shutil
import socket
import tempfile
import time
import traceback

import websockets

from integration import Client, distance, player


ROOT = Path(__file__).resolve().parents[1]
LEGACY_STALL_SECONDS = 14.0
ACK_STALL_SECONDS = 32.0
SESSION_TTL_SECONDS = 60.0
GODOT_BROWSER_PACKET_LIMIT = 128
REPORT: dict = {
    "suite": "real-websocket-stability",
    "transport": "real loopback WebSocket",
    "evidence_scope": "protocol and simulated application packet drain; not visual proof",
    "tests": [],
    "status": "running",
}


def record(name: str, details: str, **metrics) -> None:
    REPORT["tests"].append({"name": name, "status": "passed", "details": details, **metrics})
    print(f"PASS {name}: {details}", flush=True)


class ManualClient:
    """No application reader task: recv and ACK happen only when requested."""

    def __init__(self, connection):
        self.socket = connection
        self.id = ""
        self.token = ""
        self.snapshot = None
        self.sent_count = 0
        self.received_count = 0
        self.received_bytes = 0

    @classmethod
    async def open(cls, url: str):
        connection = await websockets.connect(
            url, max_size=128 * 1024, max_queue=None,
            ping_interval=None, close_timeout=2,
        )
        return cls(connection)

    @classmethod
    async def connect(cls, url: str, name: str, *, ack=False, token=""):
        client = await cls.open(url)
        try:
            hello = {"type": "hello", "name": name, "resume_token": token}
            if ack:
                hello["snapshot_ack"] = True
            await client.send(**hello)
            welcome = await client.until(lambda m: m.get("type") == "welcome")
            client.id, client.token = welcome["id"], welcome["token"]
            if ack:
                assert welcome.get("snapshot_ack") is True, welcome
            else:
                assert not welcome.get("snapshot_ack", False), welcome
            return client, welcome
        except BaseException:
            await client.close()
            raise

    async def send(self, **message):
        self.sent_count += 1
        await self.socket.send(json.dumps(message))

    async def receive(self, timeout=3.0):
        raw = await asyncio.wait_for(self.socket.recv(), timeout)
        self.received_count += 1
        self.received_bytes += len(raw.encode() if isinstance(raw, str) else raw)
        message = json.loads(raw)
        if message.get("type") == "snapshot":
            self.snapshot = message
        return message

    async def ack(self, snapshot):
        await self.send(type="snapshot_ack", tick=snapshot["tick"])

    async def until(self, predicate, timeout=5.0, *, auto_ack=False):
        deadline = time.monotonic() + timeout
        seen = []
        while time.monotonic() < deadline:
            message = await self.receive(max(.001, deadline - time.monotonic()))
            seen.append(message)
            # An accepted snapshot remains outstanding unless explicitly ACKed.
            if predicate(message):
                return message
            if auto_ack and message.get("type") == "snapshot":
                await self.ack(message)
        raise AssertionError(f"No matching message; last={seen[-3:]}")

    async def drain_to_pong(self):
        """A same-stream barrier counts everything queued before the ping."""
        await self.send(type="ping")
        drained = []
        deadline = time.monotonic() + 4.0
        while True:
            message = await self.receive(max(.001, deadline - time.monotonic()))
            if message.get("type") == "pong":
                return drained, message
            drained.append(message)

    async def close(self):
        await self.socket.close()


@contextlib.asynccontextmanager
async def isolated_server(godot: str, script: Path, label: str, log_dir: Path):
    log_path = log_dir / f"stability-{label}-server.log"
    process = None
    with tempfile.TemporaryDirectory(prefix=f"lantern-stability-{label}-") as temp:
        env = os.environ.copy()
        for variable, folder in [("XDG_DATA_HOME", "data"), ("XDG_CACHE_HOME", "cache"), ("XDG_CONFIG_HOME", "config")]:
            path = Path(temp) / folder
            path.mkdir()
            env[variable] = str(path)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        with log_path.open("w") as logfile:
            try:
                process = await asyncio.create_subprocess_exec(
                    godot, "--headless", "--path", str(ROOT), "--script", str(script),
                    "--", f"--port={port}", "--bind=127.0.0.1",
                    env=env, stdout=logfile, stderr=asyncio.subprocess.STDOUT,
                )
                deadline = time.monotonic() + 10
                while time.monotonic() < deadline:
                    log = log_path.read_text()
                    if "LANTERN_ARENA_READY" in log:
                        break
                    if process.returncode is not None:
                        raise AssertionError(f"Server exited: {log}")
                    await asyncio.sleep(.05)
                else:
                    raise AssertionError(f"Server failed to start: {log_path.read_text()}")
                yield f"ws://127.0.0.1:{port}"
                assert process.returncode is None, "Isolated server exited during regression"
            finally:
                if process is not None and process.returncode is None:
                    process.terminate()
                    try:
                        await asyncio.wait_for(process.wait(), 3)
                    except asyncio.TimeoutError:
                        process.kill()
                        await process.wait()


async def legacy_stall(url: str):
    client, _ = await ManualClient.connect(url, "Legacy stall control")
    try:
        initial = await client.until(lambda m: m.get("type") == "snapshot")
        sent, received = client.sent_count, client.received_count
        started = time.monotonic()
        await asyncio.sleep(LEGACY_STALL_SECONDS)
        elapsed = time.monotonic() - started
        assert client.sent_count == sent and client.received_count == received
        drained, pong = await client.drain_to_pong()
        snapshots = [m for m in drained if m.get("type") == "snapshot"]
        count = len(snapshots)
        assert count > GODOT_BROWSER_PACKET_LIMIT, f"Backlog did not reproduce: {count}"
        assert 9 * elapsed <= count <= 11 * elapsed + 2, (count, elapsed)
        ticks = [m["tick"] for m in snapshots]
        assert all(y - x == 2 for x, y in zip(ticks, ticks[1:])), ticks
        assert pong["tick"] - initial["tick"] >= 18 * elapsed
        record(
            "legacy_snapshot_backlog_control",
            f"No recv/commands for {elapsed:.3f}s produced {count} queued snapshots, exceeding the 128-packet browser limit",
            stall_seconds=round(elapsed, 3), queued_snapshots=count,
            browser_packet_limit=GODOT_BROWSER_PACKET_LIMIT,
            first_tick=ticks[0], last_tick=ticks[-1],
        )
    finally:
        await client.close()


def authoritative_fields(snapshot):
    return [
        {key: p[key] for key in ("id", "name", "x", "z", "hp", "max_hp", "wins", "attack_seq", "connected")}
        for p in snapshot["players"]
    ]


async def negotiated_stall_and_reconnect(url: str):
    clients = []
    try:
        a, welcome = await ManualClient.connect(url, "ACK Ember", ack=True)
        clients.append(a)
        b, _ = await Client.connect(url, "Legacy Azure")
        clients.append(b)
        await b.until(lambda s: s["round"]["phase"] == "playing")
        anchor = await a.until(lambda m: m.get("type") == "snapshot" and m["round"]["phase"] == "playing", auto_ack=True)
        await a.ack(anchor)
        sent, received, received_bytes = a.sent_count, a.received_count, a.received_bytes
        started = time.monotonic()
        await asyncio.sleep(ACK_STALL_SECONDS)
        elapsed = time.monotonic() - started
        assert a.sent_count == sent and a.received_count == received
        drained, pong = await a.drain_to_pong()
        snapshots = [m for m in drained if m.get("type") == "snapshot"]
        assert len(snapshots) == 1, f"Expected one in-flight snapshot, got {len(snapshots)}"
        outstanding = snapshots[0]
        assert 0 < outstanding["tick"] - anchor["tick"] <= 4
        simulation_rate = (pong["tick"] - anchor["tick"]) / elapsed
        assert 18 <= simulation_rate <= 22, simulation_rate
        assert b.snapshot["tick"] >= pong["tick"] - 4, "Other client stopped progressing"
        # Draining the packet alone must not release the gate; only an ACK can.
        await asyncio.sleep(.45)
        extra, _ = await a.drain_to_pong()
        assert not [m for m in extra if m.get("type") == "snapshot"], extra
        resumed = time.monotonic()
        await a.ack(outstanding)
        fresh = await a.until(lambda m: m.get("type") == "snapshot")
        recovery_latency = time.monotonic() - resumed
        assert recovery_latency < 1.0, recovery_latency
        tick_jump = fresh["tick"] - outstanding["tick"]
        state_time_jump = fresh["server_time"] - outstanding["server_time"]
        assert tick_jump >= 18 * elapsed, (tick_jump, elapsed)
        assert state_time_jump >= elapsed - .3, (state_time_jump, elapsed)
        assert abs(fresh["tick"] - b.snapshot["tick"]) <= 4, "Recovery replayed stale queued state"
        assert authoritative_fields(fresh) == authoritative_fields(b.snapshot)
        record(
            "negotiated_snapshot_backpressure",
            f"{elapsed:.3f}s without recv/commands queued exactly one snapshot; consuming without ACK kept gate closed; ACK jumped {tick_jump} ticks to current state in {recovery_latency:.3f}s",
            server_version=welcome.get("server_version"), stall_seconds=round(elapsed, 3),
            queued_snapshots=len(snapshots), snapshots_after_drain_without_ack=0,
            drained_bytes=a.received_bytes - received_bytes,
            simulation_ticks_per_second=round(simulation_rate, 3),
            recovery_tick_jump=tick_jump, recovery_state_seconds=round(state_time_jump, 3),
            recovery_latency_seconds=round(recovery_latency, 3),
        )

        # One new snapshot is outstanding. Invalid values and replays cannot
        # acknowledge it, even after a periodic-send opportunity has passed.
        fixed_state = authoritative_fields(fresh)
        malformed = [
            ("missing", {}), ("null", {"tick": None}),
            ("bool", {"tick": True}), ("string", {"tick": str(fresh["tick"])}),
            ("array", {"tick": [fresh["tick"]]}), ("object", {"tick": {}}),
            ("fractional", {"tick": fresh["tick"] + .5}),
            ("negative", {"tick": -1}), ("nonfinite", {"tick": float("nan")}),
            ("huge", {"tick": 1e30}), ("future", {"tick": fresh["tick"] + 2}),
            ("stale", {"tick": anchor["tick"]}),
            ("replayed_ack", {"tick": outstanding["tick"]}),
        ]
        for label, payload in malformed:
            await a.send(type="snapshot_ack", **payload)
            await asyncio.sleep(.18)
            messages, _ = await a.drain_to_pong()
            assert not [m for m in messages if m.get("type") == "snapshot"], f"{label} unlocked the ACK gate: {messages}"
            assert authoritative_fields(b.snapshot) == fixed_state, f"{label} corrupted state"
        await a.ack(fresh)
        next_snapshot = await a.until(lambda m: m.get("type") == "snapshot")
        assert next_snapshot["tick"] > fresh["tick"]
        assert authoritative_fields(next_snapshot) == fixed_state
        await asyncio.sleep(.25)
        messages, _ = await a.drain_to_pong()
        assert not [m for m in messages if m.get("type") == "snapshot"]
        record(
            "invalid_ack_cannot_unlock_or_corrupt",
            f"{len(malformed)} malformed/future/stale/replayed ACK variants kept one snapshot in flight; exact ACK alone released the next fresh snapshot; state unchanged",
            invalid_variants=[label for label, _ in malformed],
        )

        # Combat before and after a reconnect proves retained authority, and an
        # old connection's outstanding ACK cannot wedge the resumed connection.
        await a.send(type="move", x=-.8, z=0)
        await b.send(type="move", x=.8, z=0)
        await b.until(lambda s: distance(player(s, a.id), {"x": -.8, "z": 0}) < .03 and distance(player(s, b.id), {"x": .8, "z": 0}) < .03)
        await a.send(type="attack", target=b.id, damage=99999)
        await b.until(lambda s: player(s, b.id)["hp"] == 86)
        await b.send(type="attack", target=a.id)
        await b.until(lambda s: player(s, a.id)["hp"] == 86)
        old_id, old_token = a.id, a.token
        await a.close()
        await b.until(lambda s: s["round"]["phase"] == "paused")
        a, resumed_welcome = await ManualClient.connect(url, "Ignored rename", ack=True, token=old_token)
        clients.append(a)
        assert resumed_welcome["resumed"] is True and a.id == old_id
        rejoined = await a.until(lambda m: m.get("type") == "snapshot" and m["round"]["phase"] == "playing", auto_ack=True)
        assert player(rejoined, a.id)["name"] == "ACK Ember"
        assert all(p["hp"] == 86 and p["wins"] == 0 for p in rejoined["players"])
        await a.ack(rejoined)
        await asyncio.sleep(.7)
        await a.send(type="attack", target=b.id, damage=99999, hp=9999, wins=99)
        await a.send(type="attack", target=b.id)
        await a.until(lambda m: m.get("type") == "error" and m.get("reason") == "attack_cooldown", auto_ack=True)
        await b.until(lambda s: player(s, b.id)["hp"] == 72)
        before = authoritative_fields(b.snapshot)
        await a.send(type="state", hp=9999, wins=99, x=9, z=6)
        await a.until(lambda m: m.get("type") == "error" and m.get("reason") == "unknown_type", auto_ack=True)
        await a.send(type="move", x=True, z=0)
        await a.until(lambda m: m.get("type") == "error" and m.get("reason") == "invalid_coordinates", auto_ack=True)
        await asyncio.sleep(.3)
        assert authoritative_fields(b.snapshot) == before
        assert player(b.snapshot, a.id)["hp"] == 86 and player(b.snapshot, b.id)["hp"] == 72
        await a.drain_to_pong()
        record(
            "ack_reconnect_and_damage_authority",
            "Reconnect with an unacknowledged old snapshot reset flow control, retained identity/86 HP, and resumed combat; forged damage dealt only 14, double attack hit cooldown, forged state and boolean movement changed nothing",
            resumed_player_id=a.id, attacker_hp=86, target_hp=72, authoritative_melee_damage=14,
        )
    finally:
        for client in clients:
            with contextlib.suppress(Exception):
                await client.close()


async def real_session_expiry(url: str):
    clients = []
    try:
        a, _ = await Client.connect(url, "Expiring Ember")
        b, _ = await Client.connect(url, "Surviving Azure")
        clients.extend([a, b])
        await b.until(lambda s: s["round"]["phase"] == "playing")
        token, old_id = a.token, a.id
        await a.close()
        disconnected = time.monotonic()
        await b.until(lambda s: s["round"]["phase"] == "paused")
        finished = await b.until(lambda s: s["round"]["phase"] == "finished", timeout=8)
        assert finished["round"]["winner"] == b.id
        assert player(finished, b.id)["wins"] == 1
        # The actual session window stays 60s. Check that a slot is still
        # reserved near its end; do not shorten the server constant for QA.
        await asyncio.sleep(max(0, 58.0 - (time.monotonic() - disconnected)))
        assert any(p["id"] == old_id for p in b.snapshot["players"])
        outsider = await ManualClient.open(url)
        clients.append(outsider)
        await outsider.send(type="hello", name="Too early")
        await outsider.until(lambda m: m.get("type") == "error" and m.get("reason") == "arena_full")
        await outsider.close()
        expired = await b.until(lambda s: all(p["id"] != old_id for p in s["players"]), timeout=7)
        expiry_elapsed = time.monotonic() - disconnected
        assert SESSION_TTL_SECONDS - .5 <= expiry_elapsed <= SESSION_TTL_SECONDS + 4, expiry_elapsed
        assert expired["round"]["phase"] == "waiting"
        assert player(expired, b.id)["wins"] == 1

        replacement = await ManualClient.open(url)
        clients.append(replacement)
        await replacement.send(type="hello", name="Expired resume", resume_token=token, snapshot_ack=True)
        await replacement.until(lambda m: m.get("type") == "error" and m.get("reason") == "invalid_resume_token")
        await replacement.send(type="hello", name="Fresh Ember", snapshot_ack=True)
        welcome = await replacement.until(lambda m: m.get("type") == "welcome")
        assert welcome["resumed"] is False and welcome["id"] != old_id
        assert welcome["snapshot_ack"] is True and welcome["token"] != token
        snapshot = await replacement.until(lambda m: m.get("type") == "snapshot")
        fresh_player = player(snapshot, welcome["id"])
        assert fresh_player["hp"] == 100 and fresh_player["wins"] == 0
        assert player(snapshot, b.id)["wins"] == 1
        assert snapshot["round"]["phase"] == "countdown"
        await replacement.ack(snapshot)
        await b.until(lambda s: s["round"]["phase"] == "playing")
        await replacement.drain_to_pong()
        record(
            "real_sixty_second_session_expiry",
            f"Slot remained reserved at 58s and expired after {expiry_elapsed:.3f}s; old token rejected, new ID/token admitted with 100 HP/0 wins, survivor score retained and next round started",
            configured_ttl_seconds=SESSION_TTL_SECONDS,
            measured_expiry_seconds=round(expiry_elapsed, 3),
            reservation_check_seconds=58, expired_player_id=old_id,
            replacement_player_id=welcome["id"],
        )
    finally:
        for client in clients:
            with contextlib.suppress(Exception):
                await client.close()


async def native_queue_probe(godot: str, url: str, ack: bool, log_dir: Path):
    label = "ack" if ack else "legacy-saturation-control"
    log_path = log_dir / f"stability-native-{label}-client.log"
    process = None
    with tempfile.TemporaryDirectory(prefix=f"lantern-native-queue-{label}-") as temp:
        env = os.environ.copy()
        for variable, folder in [("XDG_DATA_HOME", "data"), ("XDG_CACHE_HOME", "cache"), ("XDG_CONFIG_HOME", "config")]:
            path = Path(temp) / folder
            path.mkdir()
            env[variable] = str(path)
        command = [godot, "--headless", "--path", str(ROOT), "--script", "tests/queue_probe.gd", "--", f"--url={url}"]
        if ack:
            command.append("--ack")
        with log_path.open("w") as logfile:
            try:
                process = await asyncio.create_subprocess_exec(*command, env=env, stdout=logfile, stderr=asyncio.subprocess.STDOUT)
                await asyncio.wait_for(process.wait(), 45)
            finally:
                if process is not None and process.returncode is None:
                    process.terminate()
                    try:
                        await asyncio.wait_for(process.wait(), 3)
                    except asyncio.TimeoutError:
                        process.kill()
                        await process.wait()
        log = log_path.read_text()
        assert process.returncode == 0, f"Native probe failed ({process.returncode}): {log}"
        result_lines = [line.removeprefix("QUEUE_PROBE_RESULT ") for line in log.splitlines() if line.startswith("QUEUE_PROBE_RESULT ")]
        assert len(result_lines) == 1, f"Missing/duplicate native result: {log}"
        result = json.loads(result_lines[0])
        assert result["status"] == "passed", result
        if ack:
            assert result["max_queued_packets"] == 1, result
            assert result["stall_seconds"] >= ACK_STALL_SECONDS, result
            assert "ERROR:" not in log and "Too many packets" not in log, log
            record(
                "native_ack_queue_stall_recovery",
                f"Native WebSocketPeer with max_queued_packets=128 held exactly one packet for {result['stall_seconds']:.3f}s, then recovered {result['recovery_tick_jump']} ticks forward",
                native_result=result, client_log=str(log_path),
            )
        else:
            assert result["max_queued_packets"] == GODOT_BROWSER_PACKET_LIMIT, result
            assert result["drained_snapshots"] > GODOT_BROWSER_PACKET_LIMIT, result
            assert result["connection_remained_open"] is True, result
            assert result["native_overflow_error_reproduced"] is False, result
            assert "ERROR:" not in log and "Too many packets" not in log, log
            record(
                "native_legacy_packet_queue_saturation",
                f"Native WebSocketPeer saturated its 128-packet queue during {result['stall_seconds']:.3f}s and then replayed {result['drained_snapshots']} snapshots; native transport remained open, so this is not the Web overflow error",
                native_result=result, legacy_control_log=str(log_path),
            )


async def main(args):
    started = time.monotonic()
    report_path = args.report.resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    log_dir = report_path.parent
    script = ROOT / "scripts/server.gd"
    baseline = args.baseline_server.resolve() if args.baseline_server else script
    REPORT.update({
        "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "server_script": str(script), "legacy_control_script": str(baseline),
        "selected_cases": args.only or ["legacy", "flow", "ttl", "native-legacy", "native-ack"],
    })

    async def run(label, server_script, test, timeout):
        try:
            async with isolated_server(args.godot, server_script, label, log_dir) as url:
                await asyncio.wait_for(test(url), timeout)
        except Exception as exc:
            REPORT["tests"].append({"name": label, "status": "failed", "failure": str(exc), "traceback": traceback.format_exc()})
            traceback.print_exc()

    cases = {
        "legacy": (baseline, legacy_stall, 25),
        "flow": (script, negotiated_stall_and_reconnect, 60),
        "ttl": (script, real_session_expiry, 80),
        "native-legacy": (baseline, lambda url: native_queue_probe(args.godot, url, False, log_dir), 50),
        "native-ack": (script, lambda url: native_queue_probe(args.godot, url, True, log_dir), 50),
    }
    await asyncio.gather(*(run(label, *cases[label]) for label in REPORT["selected_cases"]))
    REPORT["status"] = "failed" if any(t["status"] == "failed" for t in REPORT["tests"]) else "passed"
    REPORT["passed_count"] = sum(t["status"] == "passed" for t in REPORT["tests"])
    REPORT["duration_seconds"] = round(time.monotonic() - started, 3)
    report_path.write_text(json.dumps(REPORT, indent=2) + "\n")
    print(f"{REPORT['status'].upper()}: {REPORT['passed_count']} additional checks in {REPORT['duration_seconds']}s; report {report_path}")
    return 0 if REPORT["status"] == "passed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", default=shutil.which("godot") or "godot")
    parser.add_argument("--baseline-server", type=Path, help="Optional historical server script for legacy overflow control; default uses compatible non-ACK mode")
    parser.add_argument("--only", choices=("legacy", "flow", "ttl", "native-legacy", "native-ack"), nargs="+", help="Run selected cases; default runs all five isolated cases concurrently")
    parser.add_argument("--report", type=Path, default=ROOT / "qa/stability-report.json")
    raise SystemExit(asyncio.run(main(parser.parse_args())))
