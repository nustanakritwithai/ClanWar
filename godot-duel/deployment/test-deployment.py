#!/usr/bin/env python3
"""Fast offline tests. Only creates disposable files below the system temp root."""
from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

HERE = Path(__file__).resolve().parent


def load(name: str):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


stage = load("stage-pages")
webcheck = load("validate-web")


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="clanwar-deployment-test-")
        self.root = Path(self.temp.name)
        self.legacy = self.root / "legacy"
        self.web = self.root / "web"
        self.output = self.root / "site"
        self.legacy.mkdir()
        (self.legacy / "index.html").write_text("legacy threejs page")
        (self.legacy / "assets").mkdir()
        (self.legacy / "assets/game.js").write_bytes(b"unchanged-legacy-byte-sequence")
        self.web.mkdir()
        (self.web / "index.js").write_text("/* fixture only */")
        (self.web / "index.wasm").write_bytes(b"\0asm\x01\0\0\0")
        (self.web / "index.pck").write_bytes(b"fixture")
        self.config = {
            "executable": "index", "gdextensionLibs": [],
            "ensureCrossOriginIsolationHeaders": True,
            "fileSizes": {"index.wasm": 8, "index.pck": 7},
        }
        self.write_html()

    def tearDown(self):
        self.temp.cleanup()

    def write_html(self, threads="false"):
        (self.web / "index.html").write_text(
            "const GODOT_CONFIG = " + json.dumps(self.config) + ";\n"
            + f"const GODOT_THREADS_ENABLED = {threads};\n"
            + "const missing = Engine.getMissingFeatures({\n threads: GODOT_THREADS_ENABLED,\n});\n"
        )

    def test_preserves_root_and_adds_subdirectory(self):
        before = stage.manifest(self.legacy)
        report = stage.stage(self.legacy, self.web, self.output)
        self.assertEqual(report["legacy_files_preserved"], 2)
        self.assertEqual(report["godot_files_added"], 4)
        self.assertEqual(stage.manifest(self.legacy), before)
        self.assertEqual((self.output / "index.html").read_text(), "legacy threejs page")
        self.assertTrue((self.output / "godot-duel/index.html").is_file())

    def test_refuses_existing_destination(self):
        self.output.mkdir()
        with self.assertRaises(AssertionError):
            stage.stage(self.legacy, self.web, self.output)

    def test_refuses_namespace_collision(self):
        (self.legacy / "godot-duel").mkdir()
        with self.assertRaises(AssertionError):
            stage.stage(self.legacy, self.web, self.output)

    def test_refuses_symlink(self):
        (self.legacy / "link").symlink_to(self.web / "index.pck")
        with self.assertRaises(AssertionError):
            stage.stage(self.legacy, self.web, self.output)

    def test_refuses_hard_link(self):
        os.link(self.web / "index.pck", self.legacy / "hardlink")
        with self.assertRaises(AssertionError):
            stage.stage(self.legacy, self.web, self.output)

    def test_refuses_hidden_file_filtered_by_pages_upload(self):
        (self.legacy / ".secret").write_text("must not be published")
        with self.assertRaises(AssertionError):
            stage.stage(self.legacy, self.web, self.output)

    def test_refuses_nested_destination(self):
        with self.assertRaises(AssertionError):
            stage.stage(self.legacy, self.web, self.legacy / "site")

    def test_accepts_official_single_thread_loader(self):
        webcheck.validate_export(self.web)

    def test_rejects_threaded_loader(self):
        self.write_html(threads="true")
        with self.assertRaises(AssertionError):
            webcheck.validate_export(self.web)

    def test_rejects_missing_file(self):
        (self.web / "index.pck").unlink()
        with self.assertRaises(AssertionError):
            webcheck.validate_export(self.web)

    def test_rejects_loader_size_mismatch(self):
        self.config["fileSizes"]["index.wasm"] = 100
        self.write_html()
        with self.assertRaises(AssertionError):
            webcheck.validate_export(self.web)

    def test_rejects_worker(self):
        (self.web / "index.worker.js").write_text("worker")
        with self.assertRaises(AssertionError):
            webcheck.validate_export(self.web)

    def test_rejects_non_wasm_binary(self):
        (self.web / "index.wasm").write_bytes(b"not-wasm")
        with self.assertRaises(AssertionError):
            webcheck.validate_export(self.web)


if __name__ == "__main__":
    unittest.main(verbosity=2)
