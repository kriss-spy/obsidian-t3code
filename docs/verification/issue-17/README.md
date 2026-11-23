# Issue 17 runtime review

The implementation is ready for visual review. User acceptance is pending. Nothing was published.

The runtime matrix passed for Default, Minimal, Things, AnuPpuccin and Catppuccin in light and dark. Each combination checks the painted canvas and accent against resolved Obsidian colors, all 61 installed roles, chat/composer availability, and menu opening. Accent customization, disable retaining the last palette, re-enable and reconnect passed.

Manual T3 appearance and theme changes disable following. The setting is saved, and suspension survives reconnects. Runtime captures cover chat, composer, sidebar, terminal, working-tree diffs, code previews and rendered Markdown. The preview checks assert that the real fixture content rendered. The screenshot gallery is the evidence for visual review; automated checks do not establish visual acceptance.

`npm test`: 71 passed. The plugin and patched client builds passed. The client manifest verifies 33 assets. The patch applies to a clean checkout of `59651c1761f6c63e9b6056839067066968e6a406`. Focused upstream lint passed. The upstream web type check reported no TypeScript errors. The client build reports its existing large-chunk warning.

The tests use Obsidian 1.15.1 on Linux and isolated T3 server data. They do not modify a personal vault. Screenshots combine the native Obsidian capture with the actual Electron guest capture at its pane bounds, because native CDP omits guest pixels. The capture checks the guest viewport before taking the image. T3 is left; Obsidian is right.

The [client isolation check](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/isolation-runtime.json) passed. An ordinary client and a separate vault client partition retained their appearance and storage while the embedded client followed a different theme. This checks real client partitions; it does not run a second complete Obsidian vault window.

## Scope and limits

- Community themes use the pinned official sources in [runtime.json](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/runtime.json). Both appearances are supported by all four packages.
- Package defaults were tested. Catppuccin uses Latte in light mode and Mocha in dark mode. Extra Style Settings variants were not tested.
- Text, backgrounds, borders and semantic colors follow Obsidian. T3 retains its own component layout, syntax highlighting and standard ANSI terminal colors.
- The plain status labels in the review note are sample text. The warning in chat is a real provider warning. The unit checks cover contrast of derived semantic status colors.
- Partial setter failure and rollback have automated coverage. Forced storage failure was not tested in the runtime.
- The candidate component archives are local. Their `components-0.1.2-issue17` URLs are not published.

## Gallery

Use [the interactive gallery](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/gallery.html) to select a theme and appearance. The links below include every supplemental view.

### Default Obsidian 1.15.1

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-light.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-light-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-light-markdown.png)

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-dark.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-dark-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/default-dark-markdown.png)

### Minimal 9.1.4

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-light.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-light-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-light-markdown.png)

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-dark.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-dark-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/minimal-dark-markdown.png)

### Things 2.2.6

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-light.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-light-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-light-markdown.png)

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-dark.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-dark-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/things-dark-markdown.png)

### AnuPpuccin 1.5.0

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-light.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-light-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-light-markdown.png)

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-dark.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-dark-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/anuppuccin-dark-markdown.png)

### Catppuccin 0.4.52

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-light.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-light-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-light-markdown.png)

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-dark.png) · [Terminal](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-dark-terminal.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/catppuccin-dark-markdown.png)


## Additional colorful themes

See the [Tokyo Night, Gruvbox and Everforest review](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/README.md) for six additional theme/appearance combinations and the current heading-color limitation.

## Font following

The [font verification](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/fonts/README.md) covers the interface, chat/composer, code and terminal mapping added in adapter v1.8. Earlier screenshots in this report predate that font update.

## Theme selector coordination

The [coordination verification](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/coordination/README.md) covers the two-way plugin toggle and generated Obsidian theme selection added in adapter v1.9. It supersedes the earlier rule requiring the plugin toggle to resume.

## Table link visibility

The [table-link verification](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/table-links/README.md) records the corrected diagnosis for an agent-generated HTML table. The unrelated Markdown underline experiment was reverted at the user’s request.
