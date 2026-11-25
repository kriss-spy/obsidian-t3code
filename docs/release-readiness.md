# 0.3.0 release readiness

Status: 0.3.0 and components-0.3.0 were published on 2026-11-25. The production build, all 120 unit tests, candidate comparisons, public archive hashes, and both settings downloads passed. See [verification](verification/0.3.0.md) for checks and limits.

## Prepared contents

- Plugin tag to create: `0.3.0`, matching package, lockfile, manifest, and compatibility metadata.
- Plugin assets: `dist/0.3.0/main.js`, `manifest.json`, and `styles.css`.
- Release text and checksums: `dist/0.3.0/release-notes.md` and `SHA256SUMS`.
- Component tag to create: `components-0.3.0`.
- Component assets: `dist/components/t3-core-0.3.0.json.gz` and `dist/components/t3-fonts-0.3.0.json.gz`.
- Component metadata and checksums: `dist/components/assets.json` and `SHA256SUMS-0.3.0`.

The component URLs, byte counts, and SHA-256 values are pinned in `src/component-release.ts`. Both archives must be published before the plugin. Missing or changed components block the embedded workspace until repaired.

## Preparation checklist (historical)

1. Verify a rendered T3 modified folder click in a paired disposable vault. Cover native fallback and the configured host action. Never use personal notes for this check.
2. Run the current release through Windows and macOS CI and runtime checks. The existing workflow runs tests, builds, and earliest/latest Obsidian checks. It does not publish assets.
3. Review the source diff and the local review warnings. The filesystem warning describes intentional desktop component installation and canonical path checks. Sentence-case warnings concern T3 branding.
4. Commit the reviewed source and metadata. Rebuild and refresh checksums if any source changes. Current artifacts include uncommitted changes and record the base revision separately.
5. After explicit publication authorization, create `components-0.3.0` and upload the two pinned archives. Preserve their exact bytes.
6. Verify published component hashes. Install through both settings download buttons in a disposable vault. Check pairing, folder actions, draft Return and Cancel, font stability, tab switching, and Escape.
7. After these checks pass, create plugin tag `0.3.0` and publish the three plugin assets with the prepared release notes. Verify published asset hashes and record the source revision.

Preserve earlier releases for rollback. GitHub artifact attestation checks and the full upstream test suite were not run during preparation. No release, tag, commit, push, or personal-vault deployment was performed.

## Publication result

Published [plugin 0.3.0](https://github.com/kriss-spy/obsidian-t3code/releases/tag/0.3.0) from `c425060e210df1e7e131d5b63471a75aca91046b`, after publishing [components-0.3.0](https://github.com/kriss-spy/obsidian-t3code/releases/tag/components-0.3.0). Both public component archives were downloaded and matched the pinned SHA-256 values. Both settings download buttons installed those public archives in a disposable Obsidian 1.13.4 vault and passed production file checks. See [download log](verification/0.3.0/published-downloads.log).

Cross-platform unit tests initially exposed a temporary-root path alias in the folder test fixture. The fixture now resolves the root as the production plugin does. The corrected unit tests and builds passed on Linux, Windows, and macOS. All six Obsidian runtime combinations passed on the preceding release-source commit, which produces identical plugin assets. On the final source commit, five runtime combinations passed and the earliest macOS run timed out while opening the workspace. The rerun passed. All nine CI jobs now pass for the tagged source revision: unit tests and builds on three platforms, plus earliest/latest Obsidian runtime checks on all three platforms. Full rendered modified-folder-click verification and GitHub attestations remain outside the verified release evidence.
