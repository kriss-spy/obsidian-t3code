# Alias and explorer-drop repair

Adapter `obsidian-host-v1.4` fixes the two failures reported after the v1.3 installation. The approved client manifest is `77634e68ed7116c98e8c503bd63b8221807381155ba539b20a6fa2cd55af7e50`.

## Causes and changes

Normal file results consumed the full result limit before aliases were appended. An exact alias could therefore disappear in a large result set. Alias matches now participate before truncation, with exact aliases first. Remaining normal results keep their order. The metadata cache's first `resolved` event also hydrates the index once, covering startup before cached frontmatter is ready.

The old reference handler depended on a native drop reaching the guest. Trusted explorer input showed no guest drop events. Clicking the source can also hide or unregister the guest composer before an asynchronous target lookup finishes. The replacement captures the intended route, starts only after a drag gesture, reveals the existing T3 workspace, and creates a host drop target over that composer's public bounds. Completion checks the registered composer again and returns focus to T3. Ordinary note clicks do not activate the drop target.

The earlier alias runtime fixture contained literal newline escapes. Fuzzy path results could satisfy its assertions without valid aliases. The fixture now uses JSON encoding for the host evaluation and requires parsed frontmatter before search. Earlier v1.3 evidence is retained as historical evidence, not proof of these repaired cases.

## Passing checks

- `npm test`: 35 tests pass, including a full 200-result regression that failed before the fix and a stale native-composer drop check.
- `npm run build`: passes.
- Upstream web typecheck, targeted lint, production client/server builds, and 19 adjacent web tests pass.
- Local plugin review: zero source errors. Warnings concern deliberate filesystem access, product names, and the host drop label. Its existing numeric-summary warning remains.
- After a cold start, the [real Ctrl+P picker](extra-feature-repair-alias.json) returned `extracurricular/ACG/games/gacha game/Blue Archive/Blue Archive.md` first for `蔚蓝档案`, with 200 results. The note and 200 competing files were disposable fixtures.
- [Note and folder drag checks](extra-feature-repair-drag.json) pass with the normal plugin bundle. They use trusted Electron mouse input for the source and Chromium drag delivery to the host target. Both insert a reference, preserve the route and message count, keep T3 active, and remove the target afterward.
- [Scope regression checks](extra-feature-repair-scope.json) pass. Sandboxing, context isolation, and web security stay enabled; Node stays disabled. Excluded-content DOM observations remain zero.

The native-input test exercises the application's real source and drop handlers. It does not independently verify an operating-system mouse release. A manual CloudNotes check remains useful after reloading the newly installed plugin.

The older broad extra-feature script did not complete its rerun because its virtualized explorer/menu targeting timed out. Do not report that rerun as passing. The focused picker, drag, and scope checks above passed separately. Full UI parity and the previously recorded new-draft reload ordering gap remain open under #10. No issue is closed by this repair.

## Reproduce

Use only a disposable integration vault and profile. The Blue Archive fixture must have a real `aliases` property containing `蔚蓝档案`. Add 200 competing file matches to exercise truncation.

```sh
npm test
npm run build
node scripts/check-alias-picker.mjs <CDP> <disposable-vault> <alias-evidence.json>
node scripts/check-explorer-drag.mjs <CDP> <disposable-vault> <note-path> <folder-path> <drag-evidence.json>
```

Both runtime scripts refuse personal vaults. Tests never edit CloudNotes notes or submit prompts. Installation preserves settings, partition identity, the server address, and its data directory.
