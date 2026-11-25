# 0.3.0 release readiness

Status: publication authorized on 2026-11-25. The production build, all 120 unit tests, and candidate file comparisons passed again before publication. See [verification](verification/0.3.0.md) for checks and limits.

## Prepared contents

- Plugin tag to create: `0.3.0`, matching package, lockfile, manifest, and compatibility metadata.
- Plugin assets: `dist/0.3.0/main.js`, `manifest.json`, and `styles.css`.
- Release text and checksums: `dist/0.3.0/release-notes.md` and `SHA256SUMS`.
- Component tag to create: `components-0.3.0`.
- Component assets: `dist/components/t3-core-0.3.0.json.gz` and `dist/components/t3-fonts-0.3.0.json.gz`.
- Component metadata and checksums: `dist/components/assets.json` and `SHA256SUMS-0.3.0`.

The component URLs, byte counts, and SHA-256 values are pinned in `src/component-release.ts`. Both archives must be published before the plugin. Missing or changed components block the embedded workspace until repaired.

## Remaining checks and publication steps

1. Verify a rendered T3 modified folder click in a paired disposable vault. Cover native fallback and the configured host action. Never use personal notes for this check.
2. Run the current release through Windows and macOS CI and runtime checks. The existing workflow runs tests, builds, and earliest/latest Obsidian checks. It does not publish assets.
3. Review the source diff and the local review warnings. The filesystem warning describes intentional desktop component installation and canonical path checks. Sentence-case warnings concern T3 branding.
4. Commit the reviewed source and metadata. Rebuild and refresh checksums if any source changes. Current artifacts include uncommitted changes and record the base revision separately.
5. After explicit publication authorization, create `components-0.3.0` and upload the two pinned archives. Preserve their exact bytes.
6. Verify published component hashes. Install through both settings download buttons in a disposable vault. Check pairing, folder actions, draft Return and Cancel, font stability, tab switching, and Escape.
7. After these checks pass, create plugin tag `0.3.0` and publish the three plugin assets with the prepared release notes. Verify published asset hashes and record the source revision.

Preserve earlier releases for rollback. GitHub artifact attestation checks and the full upstream test suite were not run during preparation. No release, tag, commit, push, or personal-vault deployment was performed.
