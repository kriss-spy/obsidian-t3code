# Use T3 in a narrow Obsidian window

Use one main tab group for T3 and Markdown notes. Let T3 keep its own sidebar and thread-linked previews. Keep Obsidian's left sidebar closed while chatting.

## Recommended layout

1. Run **Focus T3 Code**. This reveals T3 and collapses Obsidian's left sidebar.
2. If you need the vault file explorer, drag its Files tab to Obsidian's right sidebar.
3. Open the right sidebar only when you need it.
4. Use T3's file preview for files you are discussing in the thread.
5. Use Ctrl/Cmd-click or the chip menu's **Open in default app** for a native Obsidian editor.
6. In T3’s file explorer or preview editor menu, choose **Open in Obsidian** for verified local Markdown.

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

Automatic matching of Obsidian and T3 marketplace themes is a separate feature under investigation. See [theme mapping requirements](theme-mappings.md). A shared theme name does not guarantee matching palettes or variants.

## Check and undo the layout

After moving Files, shrink the window to your normal working width. Open a thread, its file preview, and the editor dropdown. Check that the composer, Send control, and menus remain reachable. Return from a native note to T3 and check your unsent text. Open the right explorer and drag a note into the intended composer. Review the reference before sending.

To undo the layout, drag Files back to the left sidebar and reopen that sidebar. Restore your previous native Markdown placement in T3 Code settings. Remove an optional search shortcut through Obsidian's Hotkeys settings. Re-enable status items through the plugin that owns each item. These actions do not require reinstalling T3 Code.

## Checkpoint and recovery steps

Before a long editing task, confirm that the separate backup contains the original notes and attachments. Test restoring a disposable file from that backup. Git history in the same directory does not replace a separate backup.

If the vault already uses Git:

1. Run `git status` in the vault directory.
2. Review each changed file with `git diff`.
3. Check exclusions for credentials, generated files, caches, and device-specific settings.
4. Stage only the files you intend to checkpoint.
5. Commit the reviewed changes before the agent starts.

If the vault has no Git repository, choose and configure a Git workflow manually first. The plugin does not create one. Avoid blanket staging commands for an unreviewed vault. Keep tokens, pairing links, and private configuration out of commits. Decide whether attachments need Git LFS or a separate backup.

If a conflict appears, stop agent edits and sync writes before resolving it. Save a separate copy of both conflicting versions. Review the affected notes, resolve the conflict, and confirm that Obsidian opens the result. Commit the resolution before starting another agent task. For an unwanted edit, review the diff before restoring a file from a known checkpoint. Avoid resetting the entire vault to recover one note.

Omnisearch remains optional. If installed, use its command from the command palette or assign a shortcut in Hotkeys. Remove the shortcut or disable the plugin to reverse that choice. Keep Obsidian's built-in search available for its own query features.
