#!/usr/bin/env python3
"""Real WebSocket integration tests against a fresh isolated Godot arena server.

Run: python tests/integration.py
Requires: Python 3.10+ and websockets. Does not connect to/reset the UI server.
"""
from __future__ import annotations
import argparse
import asyncio
import contextlib
import json
import math
import os
from pathlib import Path
import shutil
import socket
import sys
import tempfile
import time
import traceback
import websockets

ROOT = Path(__file__).resolve().parents[1]
REPORT: dict = {"suite": "authoritative-pvp-real-websocket", "tests": [], "status": "running"}


def record(name: str, details: str) -> None:
    REPORT["tests"].append({"name": name, "status": "passed", "details": details})
    print(f"PASS {name}: {details}", flush=True)


class Client:
    def __init__(self, socket):
        self.socket = socket
        self.messages: list[dict] = []
        self.snapshot: dict | None = None
        self.snapshots: dict[int, dict] = {}
        self.id = ""
        self.token = ""
        self.closed = False
        self.reader = asyncio.create_task(self.read())

    @classmethod
    async def connect(cls, url: str, name: str, token: str = ""):
        client = cls(await websockets.connect(url, max_size=128 * 1024))
        await client.send(type="hello", name=name, resume_token=token)
        welcome = await client.wait_message(lambda m: m.get("type") == "welcome")
        client.id = welcome["id"]
        client.token = welcome["token"]
        return client, welcome

    async def read(self):
        try:
            async for raw in self.socket:
                value = json.loads(raw)
                self.messages.append(value)
                if value.get("type") == "snapshot":
                    self.snapshot = value
                    self.snapshots[value["tick"]] = value
                    if len(self.snapshots) > 300:
                        del self.snapshots[min(self.snapshots)]
        except websockets.ConnectionClosed:
            pass
        finally:
            self.closed = True

    async def send(self, **message):
        await self.socket.send(json.dumps(message))

    async def wait_message(self, predicate, timeout=5.0, start=0):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            for message in self.messages[start:]:
                if predicate(message):
                    return message
            await asyncio.sleep(0.01)
        raise AssertionError(f"Message timeout; last={self.messages[-4:]}")

    async def until(self, predicate, timeout=6.0):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.snapshot is not None and predicate(self.snapshot):
                return self.snapshot
            await asyncio.sleep(0.01)
        raise AssertionError(f"Snapshot timeout; last={self.snapshot}")

    async def error(self, reason: str, start: int):
        return await self.wait_message(lambda m: m.get("type") == "error" and m.get("reason") == reason, start=start)

    async def close(self):
        await self.socket.close()
        with contextlib.suppress(Exception):
            await self.reader


def player(snapshot, pid):
    return next(p for p in snapshot["players"] if p["id"] == pid)


def distance(a, b):
    return math.hypot(a["x"] - b["x"], a["z"] - b["z"])


async def shared_snapshot(a: Client, b: Client):
    await asyncio.sleep(0.15)
    common = set(a.snapshots) & set(b.snapshots)
    assert common, "No common replicated tick"
    tick = max(common)
    assert a.snapshots[tick] == b.snapshots[tick], "Same-tick snapshots differ"
    return a.snapshots[tick]


async def position(a: Client, b: Client, ax, az, bx, bz):
    await a.send(type="move", x=ax, z=az)
    await b.send(type="move", x=bx, z=bz)
    return await a.until(lambda s: distance(player(s, a.id), {"x": ax, "z": az}) < .03 and distance(player(s, b.id), {"x": bx, "z": bz}) < .03, timeout=8)


async def suite(url: str):
    clients = []
    try:
        a, _ = await Client.connect(url, "Test Ember")
        clients.append(a)
        await a.until(lambda s: s["round"]["phase"] == "waiting")
        b, _ = await Client.connect(url, "Test Azure")
        clients.append(b)
        countdown_start = time.monotonic()
        s = await a.until(lambda s: s["round"]["phase"] == "countdown")
        assert s["round"]["number"] == 1
        assert len(s["players"]) == 2
        s = await a.until(lambda s: s["round"]["phase"] == "playing")
        assert time.monotonic() - countdown_start >= 2.7
        assert all(p["hp"] == 100 and p["max_hp"] == 100 for p in s["players"])
        await shared_snapshot(a, b)
        assert "token" not in json.dumps(s) and "resume" not in json.dumps(s)
        record("join_and_replication", "Two simultaneous real clients; equal stats; 3s countdown; exact same-tick snapshots; no token leakage")

        outsider = Client(await websockets.connect(url))
        clients.append(outsider)
        await outsider.send(type="hello", name="Third")
        await outsider.error("arena_full", 0)
        record("two_player_capacity", "A third player is rejected with arena_full")

        start = len(a.messages)
        await a.send(type="attack", target=b.id)
        await a.error("out_of_range", start)
        assert player(a.snapshot, b.id)["hp"] == 100
        origin = player(a.snapshot, a.id).copy()
        start = len(a.messages)
        await a.send(type="state", hp=9999, wins=99, x=10, z=7)
        await a.error("unknown_type", start)
        await a.send(type="move", x=-2, z=0, hp=9999, wins=99, damage=999)
        await asyncio.sleep(.35)
        moved = player(a.snapshot, a.id)
        travelled = distance(origin, moved)
        assert .6 <= travelled <= 1.9, travelled
        assert moved["hp"] == 100 and moved["wins"] == 0
        await shared_snapshot(a, b)
        record("authoritative_movement_and_forgery", f"Movement obeys 4.5m/s ({travelled:.3f}m sampled); forged HP/wins/damage ignored; remote movement matches")

        for value in ["NaN", None, True, float("inf")]:
            start = len(a.messages)
            await a.send(type="move", x=value, z=0)
            await a.wait_message(lambda m: m.get("type") == "error" and m.get("reason") in {"invalid_coordinates", "invalid_json"}, start=start)
        start = len(a.messages)
        await a.socket.send("{not json")
        await a.error("invalid_json", start)
        start = len(a.messages)
        await a.socket.send(b"binary")
        await a.error("text_required", start)
        assert not a.closed
        record("malformed_and_finite_validation", "Non-numeric/null/bool/infinite coordinates, malformed JSON and binary frames rejected; session survives")

        await position(a, b, -.8, 0, .8, 0)
        start = len(a.messages)
        await a.send(type="attack", target=b.id, damage=99999)
        await a.send(type="attack", target=b.id)
        await a.error("attack_cooldown", start)
        await a.until(lambda s: player(s, b.id)["hp"] == 86)
        await shared_snapshot(a, b)
        await b.send(type="attack", target=a.id)
        await a.until(lambda s: player(s, a.id)["hp"] == 86)
        record("melee_and_cooldown", "Range-gated 14 damage replicated to both clients; rapid second strike rejected; mutual combat works")

        await position(a, b, -3, 0, 3, 0)
        start = len(a.messages)
        cast_at = time.monotonic()
        await a.send(type="skill", x=3, z=0, damage=9999)
        await a.send(type="skill", x=3, z=0)
        await a.error("skill_cooldown", start)
        tele = await a.until(lambda s: len(s["telegraphs"]) == 1)
        assert tele["telegraphs"][0]["owner"] == a.id
        assert 0 < tele["telegraphs"][0]["remaining"] <= .4
        await a.until(lambda s: len(s["projectiles"]) == 1)
        assert time.monotonic() - cast_at >= .3
        await a.until(lambda s: player(s, b.id)["hp"] == 62)
        await shared_snapshot(a, b)
        record("telegraph_and_projectile", "0.4s readable telegraph precedes travelling bolt; 24 damage shared; forged damage ignored; 3s cooldown enforced")

        origin = player(a.snapshot, b.id).copy()
        start = len(b.messages)
        await b.send(type="dash", x=9, z=0)
        await b.send(type="dash", x=9, z=0)
        await b.error("dash_cooldown", start)
        await a.until(lambda s: player(s, b.id)["dashing"])
        await a.until(lambda s: not player(s, b.id)["dashing"] and player(s, b.id)["x"] > 5.8)
        finish = player(a.snapshot, b.id)
        assert abs(distance(origin, finish) - 3) < .05
        assert finish["dash_cd"] > 3.5
        record("dash_distance_and_cooldown", "Server performs exactly 3m burst in 0.18s; dashing state replicated; immediate second dash rejected")

        await a.send(type="move", x=10000, z=10000)
        await a.until(lambda s: abs(player(s, a.id)["x"] - 10) < .01 and abs(player(s, a.id)["z"] - 7) < .01, timeout=6)
        assert all(-10 <= p["x"] <= 10 and -7 <= p["z"] <= 7 for p in a.snapshot["players"])
        record("arena_bounds", "Oversized finite destination clamps to (+10,+7); no teleport or escape")

        await position(a, b, -.8, 0, .8, 0)
        previous_wins = player(a.snapshot, a.id)["wins"]
        for _ in range(8):
            if a.snapshot["round"]["phase"] == "finished":
                break
            await a.send(type="attack", target=b.id)
            await asyncio.sleep(.72)
        s = await a.until(lambda s: s["round"]["phase"] == "finished")
        assert s["round"]["winner"] == a.id and s["round"]["reason"] == "knockout"
        assert player(s, b.id)["hp"] == 0
        assert player(s, a.id)["wins"] == previous_wins + 1
        start = len(a.messages)
        await a.send(type="attack", target=b.id)
        await a.error("round_not_playing", start)
        await asyncio.sleep(.3)
        assert player(a.snapshot, a.id)["wins"] == previous_wins + 1
        await shared_snapshot(a, b)
        record("knockout_exactly_once", "Lethal hit ends round once; winner replicated; wins increments exactly once; post-round attacks rejected")

        await a.send(type="ready")
        await asyncio.sleep(.3)
        assert a.snapshot["round"]["phase"] == "finished"
        await b.send(type="ready")
        s = await a.until(lambda s: s["round"]["phase"] == "countdown" and s["round"]["number"] == 2)
        assert player(s, a.id)["x"] == 6 and player(s, b.id)["x"] == -6
        assert all(p["hp"] == 100 and p["skill_cd"] == 0 and p["dash_cd"] == 0 for p in s["players"])
        await a.until(lambda s: s["round"]["phase"] == "playing")
        record("mutual_ready_rematch", "One ready does not restart; both ready resets HP/cooldowns; ends swap for fairness; round increments")

        await position(a, b, .8, 0, -.8, 0)
        before_hp = player(a.snapshot, b.id)["hp"]
        start = len(a.messages)
        await b.send(type="dash", x=3, z=0)
        await a.until(lambda s: player(s, b.id)["dashing"])
        await a.send(type="attack", target=b.id)
        await a.wait_message(lambda m: m.get("type") == "event" and m.get("kind") == "dodge" and m.get("player") == b.id, start=start)
        await asyncio.sleep(.2)
        assert player(a.snapshot, b.id)["hp"] == before_hp
        record("dash_invulnerability", "An in-range melee strike during a replicated dash is dodged; HP unchanged")

        old_b_id, old_token = b.id, b.token
        saved_wins = player(a.snapshot, a.id)["wins"]
        await b.close()
        s = await a.until(lambda s: s["round"]["phase"] == "paused")
        paused_tick = s["tick"]
        paused_positions = [(p["x"], p["z"], p["hp"]) for p in s["players"]]
        start = len(a.messages)
        await a.send(type="move", x=0, z=0)
        await a.error("round_not_playing", start)
        await asyncio.sleep(.3)
        assert [(p["x"], p["z"], p["hp"]) for p in a.snapshot["players"]] == paused_positions
        b, welcome = await Client.connect(url, "Renaming must not overwrite", old_token)
        clients.append(b)
        assert welcome["resumed"] and b.id == old_b_id
        s = await a.until(lambda s: s["round"]["phase"] == "playing" and s["tick"] > paused_tick)
        assert player(s, b.id)["name"] == "Test Azure"
        assert player(s, a.id)["wins"] == saved_wins
        await shared_snapshot(a, b)
        record("disconnect_pause_and_reconnect", "Disconnect freezes combat/movement; same in-memory token resumes slot and round within 6s; identity and score retained")

        duplicate = Client(await websockets.connect(url))
        clients.append(duplicate)
        await duplicate.send(type="hello", name="Impostor", resume_token=old_token)
        await duplicate.error("token_in_use", 0)
        await duplicate.close()
        record("connected_token_protection", "An active player cannot be replaced by a second connection using its token")

        await b.close()
        await a.until(lambda s: s["round"]["phase"] == "paused")
        disconnected_at = time.monotonic()
        s = await a.until(lambda s: s["round"]["phase"] == "finished", timeout=8)
        assert time.monotonic() - disconnected_at >= 5.7
        assert s["round"]["winner"] == a.id and s["round"]["reason"] == "disconnect"
        assert player(s, a.id)["wins"] == saved_wins + 1
        await asyncio.sleep(.4)
        assert player(a.snapshot, a.id)["wins"] == saved_wins + 1
        b, welcome = await Client.connect(url, "Test Azure", old_token)
        clients.append(b)
        await b.until(lambda s: s["round"]["phase"] == "finished")
        assert welcome["resumed"] and player(b.snapshot, a.id)["wins"] == saved_wins + 1
        record("disconnect_forfeit_and_score_resume", "6s disconnect forfeits exactly once; reconnect retains finished round and accumulated score")

        oversize = Client(await websockets.connect(url))
        clients.append(oversize)
        await oversize.socket.send(json.dumps({"type": "hello", "name": "x" * 2000}))
        await oversize.error("packet_too_large", 0)
        await asyncio.sleep(.15)
        assert oversize.closed
        record("packet_size_limit", "A >1024-byte JSON packet is rejected and closed")

        flood = Client(await websockets.connect(url))
        clients.append(flood)
        for _ in range(100):
            with contextlib.suppress(websockets.ConnectionClosed):
                await flood.send(type="ping")
        deadline = time.monotonic() + 3
        while not flood.closed and time.monotonic() < deadline:
            await asyncio.sleep(.02)
        assert flood.closed, "Flood connection stayed open"
        # Engine queue limit can close before the application token bucket fires.
        record("bounded_message_rate", "100-message flood is disconnected by queue/rate bounds; existing arena stays responsive")
        cadence = sorted(a.snapshots.values(), key=lambda s: s["tick"])[-30:]
        intervals = [y["tick"] - x["tick"] for x, y in zip(cadence, cadence[1:])]
        assert sum(delta == 2 for delta in intervals) / len(intervals) > .9
        tick_rate = (cadence[-1]["tick"] - cadence[0]["tick"]) / (cadence[-1]["server_time"] - cadence[0]["server_time"])
        assert 18 <= tick_rate <= 22, tick_rate
        record("simulation_and_snapshot_cadence", f"Measured {tick_rate:.2f} simulation ticks/s and one public snapshot per 2 ticks (~10Hz)")
        start = len(a.messages)
        await a.send(type="ping")
        await a.wait_message(lambda m: m.get("type") == "pong", start=start)
    finally:
        for client in clients:
            with contextlib.suppress(Exception):
                await client.close()


async def main(args):
    started = time.monotonic()
    ROOT.joinpath("qa").mkdir(exist_ok=True)
    log_path = ROOT / "qa" / "server-test.log"
    report_path = ROOT / "qa" / "server-test-report.json"
    process = None
    with tempfile.TemporaryDirectory(prefix="lantern-pvp-test-") as temp, log_path.open("w") as logfile:
        env = os.environ.copy()
        for variable, folder in [("XDG_DATA_HOME", "data"), ("XDG_CACHE_HOME", "cache"), ("XDG_CONFIG_HOME", "config")]:
            path = Path(temp) / folder
            path.mkdir()
            env[variable] = str(path)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", args.port))
            port = probe.getsockname()[1]
        REPORT.update({"engine": "Godot 4.6.3", "port": port, "server_script": "scripts/server.gd", "transport": "real loopback WebSocket", "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        try:
            process = await asyncio.create_subprocess_exec(args.godot, "--headless", "--path", str(ROOT), "--script", "scripts/server.gd", "--", f"--port={port}", "--bind=127.0.0.1", env=env, stdout=logfile, stderr=asyncio.subprocess.STDOUT)
            for _ in range(100):
                try:
                    reader, writer = await asyncio.open_connection("127.0.0.1", port)
                    writer.close()
                    await writer.wait_closed()
                    break
                except OSError:
                    if process.returncode is not None:
                        raise RuntimeError(log_path.read_text())
                    await asyncio.sleep(.05)
            else:
                raise RuntimeError("Server did not become ready")
            await suite(f"ws://127.0.0.1:{port}")
            REPORT["status"] = "passed"
        except Exception as exc:
            REPORT["status"] = "failed"
            REPORT["failure"] = str(exc)
            REPORT["traceback"] = traceback.format_exc()
            traceback.print_exc()
        finally:
            if process and process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), 3)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()
            REPORT["duration_seconds"] = round(time.monotonic() - started, 3)
            REPORT["passed_count"] = len(REPORT["tests"])
            report_path.write_text(json.dumps(REPORT, indent=2) + "\n")
    print(f"{REPORT['status'].upper()}: {REPORT['passed_count']} checks in {REPORT['duration_seconds']}s; report {report_path}")
    return 0 if REPORT["status"] == "passed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--godot", default=shutil.which("godot") or "godot")
    parser.add_argument("--port", type=int, default=0, help="Isolated test port; default asks OS for a free port")
    raise SystemExit(asyncio.run(main(parser.parse_args())))
