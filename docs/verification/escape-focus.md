# Escape focus transfer

Verified on 2026-11-23 in the disposable Linux Obsidian vault at `/home/krisspy/.cache/obsidian-t3-gate-issue17/vault`.

Unused Escape transfers focus from the embedded T3 workspace to its Obsidian view. The T3 tab stays active. Ctrl+P then opens Obsidian's palette. Clicking the composer restores T3 focus and its Ctrl+P palette.

T3's ProseMirror editor normally prevents every native Escape, including unused Escape. The embedded client patch lets unused Escape bubble after the composer command handler declines it. Ordinary T3 clients keep their existing behavior.

The plugin snapshots visible popups before dismissal and waits for the remaining key handlers. It does not transfer focus for consumed Escape, terminal input, input method composition, repeated Escape, or modified Escape. Closing popups do not block later Escape presses.

Passed checks:

- `npm run build`: TypeScript and production plugin build.
- `npm test`: 83 tests, including disconnect and stale focus requests.
- Upstream `vp test run --project browser src/components/ComposerPromptEditorTiptap.input.browser.test.tsx`: 64 tests, including used and unused Escape in ordinary and embedded clients.
- `node scripts/check-escape-focus.mjs http://127.0.0.1:39287 /home/krisspy/.cache/obsidian-t3-gate-issue17/vault`: native Escape and Ctrl+P, real composer click, palette dismissal, and synthetic consumed Escape, terminal, composition, repeat, and modifier cases.
- `node scripts/check-palette-focus.mjs http://127.0.0.1:39287 /home/krisspy/.cache/obsidian-t3-gate-issue17/vault`: file and command palettes retain their existing Escape behavior after tab switching.
- `node scripts/check-upstream-patch.mjs /home/krisspy/.cache/issue17-clean-patch-check`: patch applies to pinned T3 revision `59651c1761f6c63e9b6056839067066968e6a406`.
- `node scripts/verify-packaged-client.mjs /home/krisspy/.cache/threecode-issue17-upstream/apps/web/dist`: 34 client assets match the pinned manifest.

The core component was rebuilt at `dist/components/t3-core-0.1.2.json.gz`. The plugin pins its checksum and the proposed `components-0.1.2-escape-focus` release URL. This release has not been published. Download installation requires publishing that component first. The main vault was not updated. Windows and macOS runtime checks were not run for this change.
