# Table link visibility

## Correction: the reported agent-output table

The user's later screenshot identified a different rendering path. The disk-tool table is an `html_render` visual inside agent output. It is not a ChatMarkdown table. The Markdown changes below do not fix this visual.

Inspection of that saved HTML found `a{color:var(--primary)}`. The shared `htmlRenderTheme()` function maps `--primary` to `colors.messageAction`, a button background. Dracula makes that color close to the page background. The generated HTML chose the wrong semantic color for link text.

The saved disk-tool visual now uses `a{color:var(--info-foreground)}`. The original file is backed up at `/home/krisspy/.cache/issue17-disk-tool-table-original.html`. No plugin palette or global HTML theme mapping changed for this correction. Other generated visuals that explicitly choose unsuitable colors can still have this problem.

The exact authored table and stylesheet were rendered in an isolated native Electron iframe with the active Dracula theme variables. All six links measured 1.56:1 contrast against the background before the correction and 5.60:1 after it. This verifies the authored content's color correction. It does not verify that the user's already-open chat iframe has reloaded the saved file.

Measurements: [HTML visual before](./html-visual-before.json), [HTML visual after](./html-visual-after.json).

## Reverted Markdown experiment

The underline experiment described below was reverted at the user’s request on 2026-11-23. The current client retains upstream underline behavior. The measurements and screenshots below are historical evidence only.

T3 Markdown used color alone for ordinary links. File-link labels had transparent underlines until hover. These cues were weak inside tables. The same issue reproduced with official Dracula 2.25.1 and theme following disabled. This isolates the cause to T3 styling, rather than Obsidian palette generation.

The compiled client now underlines ordinary table links and gives file-link labels a visible underline. Paragraph links, palette colors, and existing hover/focus cues retain their styles. Image links are excluded.

## Runtime checks

The removed experimental check tested three table links per appearance: an external URL, a Markdown file, and a source file. All 15 checks pass after rebuilding. Paragraph links retain their original decoration.

| Theme | Appearance | Following | Result |
| --- | --- | --- | --- |
| Obsidian Default | Light | Enabled | Pass |
| Obsidian Default | Dark | Enabled | Pass |
| Tokyo Night | Light | Enabled | Pass |
| Tokyo Night | Dark | Enabled | Pass |
| Dracula 2.25.1 | Dark | Disabled | Pass |

The regression script checks a visible underline or at least 3:1 color distinction from surrounding text. This comparison measures link recognition, not contrast against the background. Before the fix, Dracula's ordinary link had 2.46:1 distinction; its file links had 1.41:1 and transparent underlines. After the fix, all table links have visible underlines.

Measurements: [before](./before.json), [after](./after.json). Dracula was imported through T3's normal theme importer from [the official extension package](https://open-vsx.org/extension/dracula-theme/theme-dracula).

## Runtime screenshots

T3 is on the left; Obsidian is on the right. The T3 file preview uses the same ChatMarkdown renderer as chat.

- [Before: Dracula, dark](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/table-links/before-dracula.png)
- [After: Dracula, dark](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/table-links/after-dracula.png)

## Build checks

- Plugin build passes.
- All 79 plugin tests pass.
- The complete patch applies to pinned revision `59651c1761f6c63e9b6056839067066968e6a406`.
- All 33 packaged client assets pass hash verification.
- Upstream client build passes. Upstream TypeScript checks were not repeated for this CSS-only change.
