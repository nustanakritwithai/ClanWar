#!/usr/bin/env python3
"""Preserve the legacy dist byte-for-byte, adding only /godot-duel/."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil


def manifest(root: Path) -> dict[str, str]:
    assert root.is_dir(), f"Missing build directory: {root}"
    result = {}
    for path in sorted(root.rglob("*")):
        assert not path.is_symlink(), f"Symlink refused: {path}"
        if path.is_file():
            assert not any(p.startswith(".") for p in path.relative_to(root).parts), f"Pages upload action omits hidden paths; review {path}"
            assert path.stat().st_nlink == 1, f"Hard link refused: {path}"
            result[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def stage(legacy: Path, web: Path, destination: Path) -> dict:
    legacy, web, destination = legacy.resolve(), web.resolve(), destination.resolve()
    assert legacy != web, "Legacy and Godot builds must be separate"
    for source in [legacy, web]:
        assert destination != source and destination not in source.parents and source not in destination.parents, "Use a separate empty staging directory"
    assert not destination.exists(), "Refusing to replace an existing directory"
    before = manifest(legacy)
    exported = manifest(web)
    assert "index.html" in before, "Legacy Vite build did not produce index.html"
    assert not any(p == "godot-duel" or p.startswith("godot-duel/") for p in before), "Legacy already owns /godot-duel/; review before replacing it"
    assert not (legacy / "godot-duel").exists(), "Legacy path collision, including an empty directory"
    assert all(p in exported for p in ["index.html", "index.js", "index.wasm", "index.pck"]), "Incomplete Godot export"
    shutil.copytree(legacy, destination)
    shutil.copytree(web, destination / "godot-duel")
    after = manifest(destination)
    assert all(after.get(path) == digest for path, digest in before.items()), "Legacy output was changed"
    assert set(after) == set(before) | {"godot-duel/" + p for p in exported}, "Unexpected site files"
    assert all(after["godot-duel/" + p] == digest for p, digest in exported.items()), "Godot copy changed"
    return {"status": "passed", "legacy_files_preserved": len(before), "godot_files_added": len(exported), "legacy_sha256": before, "godot_sha256": exported}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", required=True, type=Path)
    parser.add_argument("--web", required=True, type=Path)
    parser.add_argument("--destination", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args()
    report = stage(args.legacy, args.web, args.destination)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(f"PASS: preserved {report['legacy_files_preserved']} legacy files; added {report['godot_files_added']} Godot files")


if __name__ == "__main__":
    main()
