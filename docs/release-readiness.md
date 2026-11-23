# 0.2.0 release readiness

Status: stable publication authorized after the maintainer reported that review passed. Version metadata and pinned download URLs target 0.2.0. Local artifacts are under `dist/`. See [verification](verification/0.2.0.md) for checks and limits.

## Release contents

- Plugin tag: `0.2.0`, matching `manifest.json` and `package.json`.
- Plugin assets: `main.js`, `manifest.json`, and `styles.css` from `dist/0.2.0/`.
- Component tag: `components-0.2.0`.
- Component assets: `dist/components/t3-core-0.2.0.json.gz` and `dist/components/t3-fonts-0.2.0.json.gz`.
- Release text: [release notes](release-notes.md).

The component URLs, byte counts, and SHA-256 values are pinned in `src/component-release.ts`. Publish the component assets before publishing the plugin. Missing or changed components block the embedded workspace until repaired.

## Publication checks and verification limits

1. Cross-platform CI passed for reviewed source commit `dcc3da1` on Linux, Windows, and macOS.
2. Both archives are published under `components-0.2.0`.
3. Published component and prerelease plugin downloads were checked against their local SHA-256 values.
4. Install the plugin in a disposable vault through both settings download buttons. Check pairing, draft Return and Cancel, theme following, tab switching, and Escape.
5. The maintainer reported that review passed and authorized stable publication. Automated theme assertions alone do not establish visual acceptance.
6. Refresh the plugin assets from the reviewed source and promote `0.2.0` to the latest stable release.

Preserve earlier releases for rollback. New feature runtime checks on Windows and macOS remain absent. The full upstream test suite has not been run. State these limits in the release notes.

The embedded client targets T3 0.1.11, orchestration protocol 2. Future incompatible API changes can require an update. The plugin does not install, patch, start, or stop a server.
