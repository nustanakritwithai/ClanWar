# ClanWar: combined GitHub Pages build

Prepared 2026-10-01. This directory is deployment tooling, not the live site. No push, merge, Pages dispatch, server install, or endpoint verification was performed by this preparation task. The parent task separately approved/pushed a draft branch and later verified the external WSS endpoint with normal TLS validation.

## What to add

1. Put the Godot project at repository path `godot-duel/`: `project.godot`, `export_presets.cfg`, the project `.gitignore`, source `assets/`, `scenes/`, `scripts/`, `tests/`, `docs/`, and this `deployment/` directory. Keep `.gdignore` markers in `tests/`, `docs/`, `deployment/`, and `qa/`. Do not commit `.godot/`, `qa/` reports, `build/` binaries, `deployment/.validation/`, or `__pycache__/`.
2. Keep the existing server checkpoint under `godot-duel/server/`. Add **`godot-duel/server/.gdignore`** so its source, reports, launcher, and any runtime are never imported into the browser game. The deployment validator enforces this whenever that directory exists. The existing `scripts/server.gd` exclusion remains required as well.
3. Copy `godot-duel/deployment/godot-duel-pages.yml` to the repository-root **`.github/workflows/godot-duel-pages.yml`**. This is the only new file outside `godot-duel/`.
4. Preserve every existing legacy source/config file, including root `package.json`, `package-lock.json`, `vite.config.ts`, `index.html`, `src/`, `public/`, and `render.yaml`.

The default branch verified through GitHub is **`claude/game-file-analysis-a20xup`**, at initial inspection commit `28f1d3d0ab7d0ff8fa3361037c0847d9e4230a18`. The earlier concatenated string ending `a20xup28f1d3d0` is not a branch. No existing `.github/workflows/` was present at inspection. Reconcile with any newer workflow before adding a competing Pages publisher.

## Build and publication behavior

- Pushes to the verified default branch and pull requests targeting it run CI. The workflow preserves the legacy command **`npm ci` then `npm run build`** and its `dist/` output. It does not change Vite's existing `base: './'` or Render configuration.
- CI installs official Godot **4.6.3**, verifies pinned SHA256 digests before extraction, installs matching single-thread Web export templates, imports resources, checks scripts, runs the headless layout, client-behavior, and real GUI input regressions and real loopback WebSocket integration suite, then exports the `Web` preset.
- The combined artifact copies the complete legacy `dist/` to the site root, then appends only `godot-duel/`. Every legacy byte is checked against a SHA256 manifest. A pre-existing `dist/godot-duel/`, symlink, hard link, or hidden file causes an explicit failure instead of silently overwriting or omitting content.
- Portable Chromium gates check desktop/mobile-viewport startup without COOP/COEP, then launch two actual browser clients against an isolated loopback Godot server. The duel gate clicks JOIN, uses E for pursuit and melee, checks shared snapshots and knockout, OCRs opposite VICTORY/ROUND LOST titles, and clicks both rematch buttons to verify reset and swapped spawns. Screenshots and sanitized reports retain no welcome/resume tokens. This does not establish real-device mobile quality or public multiplayer readiness.
- **Adding/pushing the workflow does not publish.** Deployment requires a manual workflow dispatch on the default branch with `deploy=true`, after review/merge and explicit deployment approval. The `github-pages` environment's protection rules also apply. Manual dispatch with `deploy=false` only validates.
- Only the deploy job gets `pages: write` and `id-token: write`. No PAT, secret, third-party hosting account, repository write token, or paid service is required. Checkout does not persist its token. Existing Pages configuration is read without automatically enabling/changing settings.

The artifact is one combined site. Never deploy an artifact containing only the Godot directory, because a Pages deployment replaces the previously published site artifact.

## URLs and configurable backend

For the normal project-site configuration, the expected URLs are:

- Legacy: `https://nustanakritwithai.github.io/ClanWar/`
- Godot: `https://nustanakritwithai.github.io/ClanWar/godot-duel/`

These are **expected paths, not confirmed live URLs**. Use the actual `page_url` returned by a successful deployment if a custom domain/base URL differs.

The client accepts a server address in its join form and the URL's `server` query parameter. The parent task verified `wss://157.85.96.139/clanwar/ws` externally with normal TLS validation and is setting it as the client default. This workflow never changes that setting; CI's duel test explicitly overrides it with an isolated loopback server. To prefill the public route explicitly, append:

```text
?server=wss%3A%2F%2F157.85.96.139%2Fclanwar%2Fws
```

An HTTPS client must use a working secure WebSocket route with a publicly trusted certificate matching its IP address or hostname. The reverse proxy must support WebSocket upgrade and reach the Godot service. Never bypass certificate warnings or use an insecure `ws://` public fallback. GitHub Pages serves static files and cannot run the authoritative server. Normal external TLS validation is reported passed by the parent task; public two-client gameplay remains a separate release check and is not established by these isolated CI tests.

## Git-based VPS source staging

The parent task verified a server-only checkpoint at commit **`f7315ca8f0a12e13f9704710ba506c33fe13b689`**, branch `codex/godot-clanwar-duel`, Draft PR **71**, under `godot-duel/server/`. Full client additions may produce a later commit; keep server staging pinned to an exact approved commit rather than a moving branch.

The VPS task can obtain the plain-text server project directly from that GitHub commit, with no Library transfer or bundled binaries. Preserve the existing server project file, `scripts/server.gd`, protocol, and `run-server.cmd` byte-for-byte. If creating a new isolated server directory from the full source tree instead, use the unchanged `scripts/server.gd` and server `project.godot`; the existing `build/server-package/run-server.cmd` is a ready launcher that may be copied into the server project root as an addition. Do not use the client's scene-launching project settings to rewrite the server protocol.

The launcher expects an approved official portable Godot 4.6.3 Windows console runtime at `runtime/Godot_v4.6.3-stable_win64_console.exe`, or an explicitly set `GODOT_EXE`. Its companion ordinary EXE must remain beside it. No runtime is included in the Git staging plan. Starting it binds only **`127.0.0.1:8910`**. The intended isolated proxy path is `/clanwar/ws`; do not expose that loopback port externally, replace other sites, change firewall/security settings, or install persistent supervision as part of this client workflow. Server installation, proxy/TLS changes, and deployment must stay inside the VPS task's granted approval.

## Verification and remaining gates

Preparation checks actually completed locally:

- 13 offline deployment tests, including exact legacy preservation and rejection of collisions, nested output, links, hidden files, missing assets, bad WASM, threaded workers, and loader size mismatch
- YAML parsing plus checks for pinned first-party action SHAs, default-off manual publication, job dependency, and least-privilege permissions
- `bash -n install-godot.sh`, every embedded workflow shell block, and `node --check` on both browser scripts
- Validator against the existing project and its actual Godot 4.6.3 single-thread export
- Staged the actual seven-file Godot export beside a two-file legacy fixture, preserving the fixture byte-for-byte
- Mock WebSocket observer test: welcome ignored, unapproved/token fields stripped, no outgoing injection, and retained history capped at 300 snapshots

Not yet established by this preparation task: a complete GitHub-hosted run, the live legacy Vite build, a successful public Pages deployment, public two-client gameplay, or Windows server execution. Local Chromium execution is blocked by the container's process-singleton socket restriction (`Operation not permitted`), including after an escalation attempt. Neither browser gate is counted as locally passing; their JavaScript syntax and workflow wiring have been checked. Browser gameplay must pass on the hosted runner before this can be called fully verified. Actionlint could not be obtained in this environment (the `go` command is not the Go toolchain; direct release download timed out), so YAML validation is structural rather than full Actionlint validation. The runner workflow includes the real build, test, import, export, and browser gates; review their result on the exact pushed commit before merge/publication.

The official template archive is about **1.26 GB** compressed. CI verifies that entire archive before extracting only the two required Web templates; do not substitute an unverified mirror or skip checksum checks to reduce download time.

## Official references and pin provenance

- [Inspected legacy package script](https://github.com/nustanakritwithai/ClanWar/blob/28f1d3d0ab7d0ff8fa3361037c0847d9e4230a18/package.json)
- [Inspected legacy Vite configuration](https://github.com/nustanakritwithai/ClanWar/blob/28f1d3d0ab7d0ff8fa3361037c0847d9e4230a18/vite.config.ts)
- [Official Godot 4.6.3 release](https://github.com/godotengine/godot-builds/releases/tag/4.6.3-stable), [release asset metadata](https://api.github.com/repos/godotengine/godot-builds/releases/tags/4.6.3-stable)
- [Godot 4.6 Web export documentation](https://docs.godotengine.org/en/4.6/tutorials/export/exporting_for_web.html)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Godot release SHA256 values, pinned from the official release asset metadata on 2026-10-01:

```text
d0bc2113065e481c9c2c2b2c37daa4e8be3fe9e27f0ab9ab0b6096e9a37907f3  Godot_v4.6.3-stable_linux.x86_64.zip
3fbe2c0e2dec9d537ab9ec97bcf8da91dcf23357fc51f67092dd068d839290a8  Godot_v4.6.3-stable_export_templates.tpz
```

First-party actions are pinned to the official commit referenced by each major-version tag at preparation time. The workflow comments retain the corresponding tag. Godot loader validation deliberately checks `GODOT_THREADS_ENABLED=false`, not `ensureCrossOriginIsolationHeaders`, because Godot emits that latter configuration value as true even for a valid non-PWA, single-thread export.
