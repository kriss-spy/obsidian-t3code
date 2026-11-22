# macOS verification for 0.1.1

Tested on November 22, 2026, in the Intel macOS VM. The VM runs macOS 26.5.2, build 25F84. The isolated test app uses Obsidian 1.15.1. The native T3 server uses unmodified 0.1.11 server files from the official Intel app archive.

The test vault is `/Users/krisspy/obsidian-t3-gate-macos/vault`. The Obsidian app, profile, and T3 data directory are separate from existing installations and notes.

## Changes

Removed the macOS rejection in local vault verification. macOS now uses the same two temporary challenges as Windows. One challenge is in the vault, and the other is in the host user's temporary directory. Both are removed after success or failure. Linux retains its machine-ID comparison.

The first runtime attempt exposed another rejection in the embedded client. Its temporary challenge validation required a Windows drive-letter vault path. The client now accepts absolute macOS paths while retaining generation, path traversal, vault boundary, and challenge filename checks. The regression test failed before this correction and passed afterward.

The rebuilt client identifies itself as `obsidian-host-v1.6`. The plugin requires this build. The CI matrix now includes `macos-latest`.

## Verification

- `npm test`: all 49 tests passed on Linux and in the macOS VM.
- `npm run build`: TypeScript checking and production build passed on both systems.
- The pinned web client production build passed using Node 26.13.0.
- `node scripts/verify-packaged-client.mjs <web-dist>` verified 29 manifest entries.
- Reverse patch verification passed against the isolated upstream checkout at `59651c1761f6c63e9b6056839067066968e6a406`.
- Actual Obsidian pairing completed. The plugin reported `Connected to standard T3 0.1.11. Local vault access verified.`
- The native Markdown callback opened `Mac test 空 格.md` at line 5.
- The actual Add current note command included unsaved editor text in the T3 draft.
- Reconnect preserved the draft and verified local access again.
- Concurrent Open requests retained one workspace view.
- Disable removed the guest. Enable restored a verified connection.
- The guest retained sandboxing, context isolation, and web security. Node integration was disabled, and Node globals were absent.
- Temporary proof files were removed.
- A native T3 CLI created an outside-vault project. Its name stayed absent from the embedded DOM and project list. The vault project remained included.

The reproducible native check is:

```sh
node scripts/check-native-host.mjs http://127.0.0.1:9223 /Users/krisspy/obsidian-t3-gate-macos/vault /Users/krisspy/obsidian-t3-gate-macos/runtime-evidence.json
```

It requires the paired disposable vault, a file named `Mac test 空 格.md` with at least five lines, and an existing draft. It temporarily edits that fixture and restores its text.

See [recorded evidence](evidence/macos-0.1.1.json).

## Limits and packaging

No paid agent turn, physical drag, or physical Cmd-click was tested. Native opening was checked through the plugin callback. Apple Silicon runtime behavior and hosted CI remain unverified.

The required and optional component archives are prepared in `dist/components/`. Their staged release tag is `components-0.1.1-macos`. This release has not been published. The new source pins those staged URLs, so settings downloads require publication before distribution. The VM used the checksum-verified local archive.

The existing Obsidian app and personal vault were not upgraded. The isolated test app and server remain available under `/Users/krisspy/obsidian-t3-gate-macos/`.
