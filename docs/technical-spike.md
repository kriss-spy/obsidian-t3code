# Technical feasibility spike

Date: 2026-11-21. These are desktop runtime results, not a finished plugin.

## Decision

Keep the full T3 web application in an isolated Electron webview inside an Obsidian view. Add a small host adapter for file navigation, context insertion, theme colors, and workspace restoration.

The runtime checks below establish that this approach is feasible on the installed Linux desktop. They do not establish complete web UI parity or cross-platform compatibility.

Do not implement another provider client or copy T3's settings into Obsidian. No T3 fork is needed for the hosting, plain-text composer insertion, or theme injection tested here. Reliable semantic file callbacks may require a small upstream hook or a version-specific adapter.

## Tested environment

- Obsidian app: `1.15.1`, installer `1.15.0`, Flatpak desktop.
- Running T3 server: `0.1.11`, orchestration protocol `2`, database migration `102`, port `3773`.
- Installed standalone CLI: `0.1.7`. It differs from the running desktop server.
- Version source: `GET http://127.0.0.1:3773/.well-known/t3/environment`.
- Tests used temporary panes in the running `bluenotes` window and disposable files outside the vault. Existing notes were not edited.

The old CLI pairing command warned about newer migration history. Subsequent pairing used the matching `t3@0.1.11` CLI. Production should read the server descriptor and avoid running an older CLI against its data directory.

## Runtime results

1. **Full application hosting passed.** The page loaded in an Electron `webview`. After read-only pairing, the actual T3 application showed its new-thread control and composer. The initial pairing screen was not treated as sufficient proof.
2. **Isolation passed.** Guest preferences reported `contextIsolation:true`, `sandbox:true`, `nodeIntegration:false`, and `webSecurity:true`. Both `require` and `process` were undefined in the page.
3. **No header changes were needed.** The live server returned CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY`. A webview loaded as its own document. A normal iframe remains unsuitable.
4. **Pairing persisted across reload.** An isolated persistent partition retained the read-only browser session. No bearer token or pairing URL was printed in the report.
5. **Composer insertion passed.** Electron `webContents.insertText` inserted a fixed fixture into the actual empty T3 composer. No prompt was submitted. The fixture survived a reload of the same page.
6. **Theme injection passed.** `webview.insertCSS` applied the host's background and text colors. Computed colors matched the supplied values. Complete theme coverage and live theme-change handling remain implementation work.
7. **External Markdown editing passed.** `app.vault.getFileByPath('file:' + absolutePath)` followed by `leaf.openFile` opened the original file in the Markdown editor. Edits saved to disk for plain names, spaces, Chinese names, and `#` characters. The test explicitly opened source mode; manipulating an inactive editor while in reading mode did not save edits.
8. **Semantic request transport passed with a fixture.** A guest event entered a bounded request queue. The host retrieved it through `executeJavaScript`, checked its origin and exact fixture identity, and opened the file in Obsidian. This did not test a click on a real T3 file chip.
9. **Custom preload was unavailable in this test.** A requested webview preload did not expose its bridge. No preload appeared in the resulting guest preferences. The cause was not established. The successful queue transport does not depend on a custom preload.

The last result is a limitation of the tested host configuration. Do not depend on a privileged guest preload without a separate compatibility check.

## Integration boundaries

### Markdown links

T3's `MarkdownFileLink` calls custom handlers and prevents normal navigation. A navigation listener alone will miss these interactions. Its component already has `environmentId`, `targetPath`, and line information. A host hook should pass those fields explicitly. [T3 component source](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/MarkdownFileLink.tsx).

For production, prefer a small semantic hook at that callback over deriving environment identity from display text. If an injected DOM adapter is used, pin and test it against supported T3 versions. Keep normal T3 behavior when the adapter cannot resolve a request.

Open local files through Obsidian's core external-file support. A remote environment's path is not automatically a local path. Keep unmatched remote files in T3's viewer until a verified mapping or remote editing feature exists.

### Editor context

Plain text can enter the composer through normal browser input. This avoids writing T3's private local-storage schema or changing the system clipboard. The integration must confirm the intended thread and composer before inserting.

Structured attachments and context chips need additional work. The tested text insertion does not prove attachment upload, deduplication, or rich-context behavior.

### Workspace restoration

Store the target URL and pane state in the Obsidian view. Reloading the same target retained the fixture draft. Recreating a view at `/` did not restore that same draft automatically. A persistent browser partition alone is insufficient for restoring the working location.

### Session ownership and settings

T3 retains its thread list, lifecycle, provider setup, models, permissions, and advanced tools. Obsidian stores only integration preferences and pane state. The host must not start a second T3 backend by default.

## Scripts and cleanup

The `spikes/` scripts preserve the probes used during this investigation. They are development tools, not distributable plugin code.

- `obsidian-eval.mjs`: runs a script through the CLI in an explicitly named vault.
- `host.js`, `inspect-host.js`, `cleanup.js`: create, inspect, and remove a temporary guest.
- `external-markdown.js`: creates disposable external files, edits them, checks disk content, and removes them.
- `ui-integration.js`: tests an empty composer and theme colors. It intentionally does not submit.
- `file-bridge.js`: tests a synthetic semantic file request, with exact fixture validation.
- `pair-local.mjs`: mints a short-lived read-only local pairing link through the matching CLI and loads it without printing credentials. The test also completed the pairing form through DOM input and its Continue button.

The temporary host was removed and the isolated test partition's storage was cleared. Disposable file fixtures were removed. The matching CLI found and revoked the one browser session labeled `Obsidian integration spike (read-only)`. Unused pairing links expire after five minutes. Other sessions were retained.

## Not verified

- Real T3 file-chip interception and its complete environment metadata.
- Agent execution, streaming tool output, approvals, terminal, browser preview, voice, or file uploads inside the guest.
- Remote Markdown editing or path mappings.
- Focus and shortcut behavior during normal use, pop-out windows, and background throttling.
- Windows, macOS, or mobile. The tested Electron approach is desktop-only.
- A stable public contract for the external `file:` lookup convention.

These are implementation and compatibility checks. They must pass before claiming complete T3 web UI parity.
