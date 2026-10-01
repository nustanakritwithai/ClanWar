#!/usr/bin/env python3
"""Fail closed on a mismatched Godot preset or incomplete Web export."""
from __future__ import annotations

import argparse
import configparser
import json
from pathlib import Path
import re


def validate_project(project: Path) -> None:
    preset = configparser.ConfigParser(interpolation=None)
    preset.read(project / "export_presets.cfg")
    sections = [s for s in preset.sections() if re.fullmatch(r"preset\.\d+", s)]
    web = [s for s in sections if preset[s].get("name") == '"Web"']
    assert len(web) == 1, "Exactly one export preset named Web is required"
    base = preset[web[0]]
    options = preset[web[0] + ".options"]
    assert base.get("platform") == '"Web"', "Web preset platform changed"
    assert options.get("variant/thread_support") == "false", "Threaded Web cannot use this deployment"
    assert options.get("variant/extensions_support") == "false", "Extension support needs a separate hosting review"
    assert options.get("progressive_web_app/enabled") == "false", "No service-worker/header workaround is expected"
    assert options.get("custom_template/release", '""') == '""', "Use the checksum-pinned official template"
    assert "scripts/server.gd" in base.get("exclude_filter", ""), "Do not pack the dedicated server in the client"
    settings = configparser.ConfigParser(interpolation=None)
    settings.read_string("[godot_file]\n" + (project / "project.godot").read_text())
    assert settings["rendering"].get("renderer/rendering_method") == '"gl_compatibility"', "Web needs Compatibility"
    assert (project / "deployment" / ".gdignore").is_file(), "Keep deployment tooling out of the game pack"
    if (project / "server").exists():
        assert (project / "server" / ".gdignore").is_file(), "Keep the separately staged server subtree out of the client export"


def validate_export(web: Path) -> None:
    assert web.is_dir(), f"Missing Web export directory: {web}"
    for name in ["index.html", "index.js", "index.wasm", "index.pck"]:
        path = web / name
        assert path.is_file() and path.stat().st_size > 0, f"Missing or empty {name}"
    for path in web.rglob("*"):
        assert not path.is_symlink(), f"Do not publish symlinks: {path}"
    with (web / "index.wasm").open("rb") as wasm:
        assert wasm.read(4) == b"\0asm", "Invalid WebAssembly magic"
    html = (web / "index.html").read_text()
    match = re.search(r"const GODOT_CONFIG\s*=\s*(\{[^\n]*\});", html)
    assert match, "Official Godot loader configuration missing"
    config = json.loads(match[1])
    assert config.get("executable") == "index", "Keep the original export filenames"
    assert config.get("gdextensionLibs") == [], "Unexpected dynamic libraries"
    # Godot writes ensureCrossOriginIsolationHeaders=true even for non-PWA,
    # non-threaded exports. The generated loader's feature check is authoritative.
    assert re.search(r"const GODOT_THREADS_ENABLED\s*=\s*false;", html), "Loader requires threads or has an unreviewed format"
    assert re.search(r"getMissingFeatures\(\s*\{\s*threads:\s*GODOT_THREADS_ENABLED,?\s*\}\s*\)", html), "Loader thread feature check changed"
    assert config.get("serviceWorker", "") == "", "Unexpected service worker"
    for name, size in config.get("fileSizes", {}).items():
        assert Path(name).name == name, f"Unexpected asset path: {name}"
        assert (web / name).is_file() and (web / name).stat().st_size == size, f"Loader size mismatch: {name}"
    assert not list(web.glob("*.service.worker.js")), "Unexpected PWA service worker"
    assert not list(web.glob("*.worker.js")), "Unexpected threaded worker"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path)
    parser.add_argument("--web", type=Path)
    args = parser.parse_args()
    if not args.project and not args.web:
        parser.error("Provide --project and/or --web")
    if args.project:
        validate_project(args.project)
    if args.web:
        validate_export(args.web)
    print("PASS: single-thread Compatibility Web export checks")


if __name__ == "__main__":
    main()
