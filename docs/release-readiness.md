# 0.2.0 release readiness

Status: 0.2.0 is designated as a prerelease for testing. Version metadata and pinned download URLs target 0.2.0. Local artifacts are under `dist/`. See [verification](verification/0.2.0.md) for checks and limits.

## Release contents

- Plugin tag: `0.2.0`, matching `manifest.json` and `package.json`.
- Plugin assets: `main.js`, `manifest.json`, and `styles.css` from `dist/0.2.0/`.
- Component tag: `components-0.2.0`.
- Component assets: `dist/components/t3-core-0.2.0.json.gz` and `dist/components/t3-fonts-0.2.0.json.gz`.
- Release text: [release notes](release-notes.md).

The component URLs, byte counts, and SHA-256 values are pinned in `src/component-release.ts`. Publish the component assets before publishing the plugin. Missing or changed components block the embedded workspace until repaired.

## Publication and stable promotion checks

1. Run the cross-platform CI tests and build for the release commit.
2. Publish both archives under `components-0.2.0`.
3. Download the published archives and compare their sizes and SHA-256 values with `src/component-release.ts`.
4. Install the plugin in a disposable vault through both settings download buttons. Check pairing, draft Return and Cancel, theme following, tab switching, and Escape.
5. Complete visual acceptance for theme following. Automated theme assertions do not establish visual acceptance.
6. Publish the three plugin assets under `0.2.0` as a prerelease using the release notes. Complete the runtime and visual checks before stable promotion.

Preserve earlier releases for rollback. New feature runtime checks on Windows and macOS remain absent. The full upstream test suite has not been run. State these limits in the release notes.

The embedded client targets T3 0.1.11, orchestration protocol 2. Future incompatible API changes can require an update. The plugin does not install, patch, start, or stop a server.
