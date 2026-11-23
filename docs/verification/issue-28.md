# Issue 28: edit composer drafts in Obsidian

The plugin opens composer text in a unique vault-root `.t3draft` file.
Obsidian's native Markdown view edits the file, including wikilink completion.
The custom extension avoids ordinary `.md` note-template creation handlers.
The draft opens in the originating tab group, including a sidebar.

## Native controls

Return and Cancel use `View.addAction()` in the note header.
Return uses a return-arrow icon. Cancel uses a circled X.
Both actions also appear in the native note menu and editor context menu.
The command-palette actions use the same operations.
Progress and persistent errors use native Obsidian notices.

There is no custom toolbar inside the note, toolbar CSS, or document click-capture listener.
The earlier injected toolbar failed under theme pane decorations and layout rules.
Native controls replace that approach.

## Draft safety

Requests bind to their document generation and originating composer registration.
Return verifies the captured composer version and replaces text through its public handle.
It does not submit the prompt. Attachments and structured references remain in the composer.
Repeated delivery acknowledgements do not apply the replacement twice.

Formatting is off by default. Return preserves the exact editor text when it is off.
When enabled, formatting parses the exact editor text through Obsidian's native metadata worker.
Existing Markdown file paths and percent encoding are preserved.
Wikilinks use filenames as labels and paths relative to the captured T3 working directory.
Heading references use T3's native file line-range suffixes.
Heading ranges include nested sections and end before the next equal-or-higher heading.
When formatting is enabled, missing or ambiguous wikilinks stop return and preserve the note.
Block references and references to the temporary draft itself cannot be formatted.

Cancel deletes the temporary note and leaves the composer unchanged.
Interrupted or failed returns preserve the note for recovery.
Successful, acknowledged returns remove completed temporary drafts.
Saving, parsing, link reads, and delivery have ten-second timeouts.
Lost acknowledgements preserve the exact payload for a safe retry.

## Verification

Checked on Linux with Obsidian 1.15.1 and a standard T3 0.1.11 server.
The disposable vault was `/home/krisspy/.cache/obsidian-t3-gate-issue17/vault`.

- `npm test`: 107 passed.
- `npm run build`: passed.
- `scripts/check-draft-return-click.mjs`: native header Return, header Cancel, and More options menu Return passed real mouse-click and hit-test checks in Cyber Glow, Blue Topaz, and the default theme.
- The theme checks loaded the user's theme files and Style Settings configuration in the disposable vault. They also asserted that the old in-note toolbar is absent.
- Native action and menu results are recorded in `issue-28-native-actions.json`.
- `scripts/check-draft-editor.mjs`: full real T3 round trip passed, including sidebar placement, latest editor text, attachments, file references, heading ranges, explicit completion, cancellation, and conflicts.
- `scripts/check-draft-template.mjs`: eight checks passed with unmodified Frontmatter Templater and Templater enabled. Empty, whitespace-only, populated, and Templater-code drafts stayed unchanged after creation and reopening. Ordinary notes retained default templates.
- Focused tests covered native action cleanup, native menu callbacks, persistent error notices, parser timeouts, missing parser recovery, target isolation, and delivery retries.
- Cleanup regression checks passed for Cancel, a disconnected Cancel, and a successful Return retry. Both completed actions delete the note and close its views.
- The recorded runtime results predate the Cancel cleanup change. The updated runtime script asserts deletion, but was not rerun for that change.
- `git diff --check`: passed.

Windows and macOS runtime behavior were not checked for this change.
The full upstream test suite was not run.
The client patch was previously built, type-checked, linted, and checked against pinned revision `59651c1761f6c63e9b6056839067066968e6a406`.
The native control replacement changes only the plugin.

## Local installation

The updated plugin and stylesheet are installed in cloudnotes.
Installed hashes match the build, settings are preserved, and a backup is retained.
Reload threecode to activate the native controls.
Use the command-palette Return for an active draft before reloading, since request bindings are held in memory.

The adapter remains `obsidian-host-v1.10`.
The local required archive is `dist/components/t3-core-0.1.2.json.gz`.
Its SHA-256 is `84d171ef9a5d48b0992da32b78f30aba7a4fa64373f2cdc92addca7da2f48247`.
The plugin pins release tag `components-0.1.2-draft-editor`.
Publish that archive before distributing the rebuilt plugin.
Optional fonts retain their existing release URL and hash.

## Optional return formatting

The setting is **Format draft links on return**, disabled by default.
It persists through the plugin's whitelisted settings save and load paths.
Changing it applies to the next return, including an already open editing request.

- Disabled: payload returns byte for byte, including relative paths, encoding, aliases, and wiki syntax. Link parsing is skipped.
- Enabled: local link labels become the full decoded filename, including extensions. External links and code remain untouched.
- Existing Markdown file paths remain relative or absolute as authored. Encoded spaces are preserved.
- Wikilinks resolve through Obsidian metadata and use paths relative to the captured T3 project.
- Generated heading references use native `:start-end` syntax. Relative root-level line references include `./` so T3 does not parse them as URI schemes.
- Mention boundaries are separated with whitespace where T3 requires it. Repeating formatting is stable.
- Delivery retries retain the original pending payload, even if the preference changes before an acknowledgement.

`scripts/check-draft-formatting.mjs` passed against real Obsidian and the pinned upstream T3 tokenizer:

- The actual settings toggle saved successfully and survived a plugin reload.
- Disabled formatting returned the exact original draft.
- All five example mentions were recognized, including the short agentsmd, Theo, and Matt Pocock labels after formatting.
- Existing destinations and percent encoding were preserved.
- A second formatting round trip produced identical output.
- An end-of-draft link was recognized as a mention.
- A generated heading reference was recognized and parsed as the correct file and line range by T3's native path parser.

Results are recorded in `issue-28-formatting.json`.
The full real T3 round-trip check also passed with formatting explicitly enabled.
