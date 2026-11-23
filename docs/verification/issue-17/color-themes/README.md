# Colorful theme runtime review

The additional matrix checks Tokyo Night, Obsidian gruvbox and Everforest Enchanted in light and dark. All six combinations passed the painted canvas/accent comparison, 61-role check, chat/composer check and menu check. Accent customization, disabling, re-enabling and reconnecting also passed. Code previews, rendered Markdown and working-tree diffs were captured for all six combinations. The code and diff fixture-content checks passed.

The screenshots show actual T3 Code on the left and Obsidian on the right. They use the same isolated vault, review content and capture method as the [original review](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/README.md). No production palette code changed for these themes.

## Visual finding

The backgrounds, text, controls and semantic palette follow the active theme. T3 keeps its own heading styling and syntax palette. This is visible in Tokyo Night: Obsidian has red and yellow headings, while T3 headings use its foreground color. These captures establish the current behavior, not complete visual equivalence.

Tokyo Night uses the default Night and Light variants. Its official [README](https://github.com/tcmmichaelb139/obsidian-tokyonight#versions) describes Storm and Moon as separate Style Settings imports. Those imports were not tested here.

The legacy Everforest repository has only `obsidian.css` and no modern theme manifest. The matrix uses [Everforest Enchanted](https://github.com/fireisgood/obsidian-everforest-enchanted), which provides a manifest and both appearances.

## Sources

- [Tokyo Night 1.1.8](https://github.com/tcmmichaelb139/obsidian-tokyonight/tree/ea61250cc7560bd1adac5b552068209ecbacedc7)
- [Obsidian gruvbox 0.2.1](https://github.com/insanum/obsidian_gruvbox/tree/bec6c083415980155aefc1a0d26c7cfe68fd85eb)
- [Everforest Enchanted 3.12.2](https://github.com/fireisgood/obsidian-everforest-enchanted/tree/bdd7ac76127acd3b1efadfc0d8d83c3a849b04da)

Exact revisions and runtime results are in [runtime.json](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/runtime.json).

## Screenshots

### Tokyo Night 1.1.8

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-dark.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-dark-markdown.png)

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-light.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/tokyo-night-light-markdown.png)

### Obsidian gruvbox 0.2.1

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-dark.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-dark-markdown.png)

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-light.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/obsidian-gruvbox-light-markdown.png)

### Everforest Enchanted 3.12.2

Dark: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-dark.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-dark-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-dark-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-dark-markdown.png)

Light: [Chat](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-light.png) · [Diff](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-light-diff.png) · [Code](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-light-code.png) · [Markdown](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/color-themes/everforest-enchanted-light-markdown.png)
