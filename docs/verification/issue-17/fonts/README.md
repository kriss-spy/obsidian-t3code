# Font following verification

The independent **Follow Obsidian fonts** setting now uses this mapping:

| Obsidian font | T3 area |
| --- | --- |
| Interface | Controls, menus and sidebar |
| Text/editor | Chat messages, rendered Markdown and composer |
| Monospace | Code blocks, code previews, diffs and terminal |

The plugin reads resolved font stacks from the owning Obsidian window. It probes the editor context to include theme rules scoped to the editor. Accessible theme font faces are copied into the isolated T3 document. System and local font fallbacks remain available. Fonts larger than 2 MiB per face or inaccessible font sources fall back through the font stack. T3 retains its own font sizes and syntax colors.

The adapter uses a font capability in `obsidian-host-v1.8`. It waits for web fonts to load before notifying the terminal to apply its font and recalculate cells. It also re-reads the host font after terminal initialization. T3's stored typography preferences are unchanged. Disabling following removes the overrides and restores those preferences.

## Checks

The real Obsidian runtime checks passed on Linux in the disposable development vault:

- Separate interface, text and monospace stacks reached their intended areas.
- Chromium reported actual rendered glyphs in Liberation Sans for controls, Liberation Serif for chat/composer, and Noto Sans Mono for code.
- The terminal's actual canvas text draw used Noto Sans Mono. The check instruments canvas drawing temporarily, then restores it.
- Catppuccin's embedded Vollkorn font rendered chat text. Obsidian's bundled Source Code Pro font rendered code and terminal text. Chromium identified both code/chat fonts as custom web fonts.
- Switching the Obsidian theme and font overrides updated the embedded document.
- Disabling following restored T3's prior interface, chat, composer and code font stacks. Re-enabling and reconnecting applied the current Obsidian fonts again.
- The font test restored the original development-vault theme and font overrides afterward.

The test suite passes 73 tests. This includes cancellation of stale font-resource reads and cleanup after a detached Electron guest. Plugin and client builds passed. Focused upstream lint passed. The web type check reported no TypeScript errors. The 33 pinned assets verify, and the patch applies to a clean pinned upstream checkout.

The actual renderer results are in [runtime.json](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/fonts/runtime.json).

## Runtime captures

T3 Code is left; Obsidian is right.

- [Separate system fonts](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/fonts/system-font-mapping.png)
- [Terminal font](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/fonts/terminal-font-mapping.png)
- [Embedded theme and code fonts](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/fonts/theme-embedded-fonts.png)
