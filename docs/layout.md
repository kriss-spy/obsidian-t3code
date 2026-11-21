# Use T3 in a narrow Obsidian window

Use one main tab group for T3 and Markdown notes. Let T3 keep its own sidebar and thread-linked previews. Keep Obsidian's left sidebar closed while chatting.

## Recommended layout

1. Run **Focus T3 Code**. This reveals T3 and collapses Obsidian's left sidebar.
2. If you need the vault file explorer, drag its Files tab to Obsidian's right sidebar.
3. Open the right sidebar only when you need it.
4. Use T3's file preview for files you are discussing in the thread.
5. Use Ctrl/Cmd-click or the chip menu's **Open in default app** for a native Obsidian editor.

Explicit native opening creates a tab in T3's tab group by default. The note and T3 share the same horizontal space. Returning to the T3 tab restores its thread and unsent draft. An existing editor can be reused in its current group. Choose **Split beside T3** in plugin settings if you want side-by-side editing instead.

Normal Markdown clicks stay inside T3's preview. Those previews retain their association with the thread. Native Obsidian editors do not become T3 thread panels.

**Focus T3 Code** does not close notes or rearrange your right sidebar. Use Obsidian's normal sidebar controls to reopen the left sidebar. The plugin does not replace Obsidian's sidebar view with a second T3 instance.

Avoid showing all of these at once in a narrow window: Obsidian's left sidebar, T3's sidebar, a split note editor, and both applications' right panels. Close the panels you are not using before shrinking T3's sidebar.

## Search and status bar

Keep a search command available without opening the left sidebar. Obsidian's quick switcher opens notes by name and alias. If you already use Omnisearch, assign its search command a shortcut and keep global search available when you need its native behavior. The plugin does not install or replace either search tool.

Keep status information that helps detect problems, such as sync state, Git conflicts, and unsaved-file state. Hide optional counters or decorations through the plugins that provide them if they crowd the window. This build does not rewrite status-bar settings.

## Git before long-term agent edits

Use a recoverable history before asking an agent to edit a knowledge base. Review the vault's Git setup, make a clean checkpoint, and check how you would restore one note and an entire change. Keep a separate backup as well.

Review what the repository includes. Avoid committing credentials, machine-specific caches, and large generated files. Decide deliberately whether to track Obsidian settings and attachments. Review diffs before committing agent edits. Resolve sync or Git conflicts before starting another editing task.

This plugin does not initialize Git, stage notes, install Obsidian Git, or modify agent instructions. These are setup choices for the vault owner.

## Theme ownership

T3 controls its complete color palette. Change T3 themes through its own Appearance page. The optional **Use Obsidian font** setting changes only the font. It does not force Obsidian colors over the chat or composer.

Automatic matching of Obsidian and T3 marketplace themes is a separate feature under investigation. A shared theme name does not guarantee matching palettes or variants.
