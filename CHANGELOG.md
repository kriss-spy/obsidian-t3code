# Changelog

## Unreleased

- Preserve the mounted T3 chat when switching back from an Obsidian note. Check the live connection without restarting session subscriptions.
- Return keyboard focus to Obsidian on unused Escape. Preserve T3 menus, dialogs, suggestions, and terminal Escape handling.

## 0.1.2

- Keep the active note unchanged when dragging files or folders outside the T3 composer.
- Preserve reference drops into a visible T3 composer.
- Address plugin review findings in element creation, command labels, CSS, and manifest text.
- Include macOS local vault verification and the cross-platform client from the verified 0.1.1 source.

## 0.1.1

- Publish the normal Obsidian plugin files separately from downloadable components.
- Add settings buttons for required components and optional Inter and terminal symbol fonts.
- Warn about missing or damaged required files and support downloading repairs.
- Load the embedded client from the plugin's own folder.
- Connect to a standard T3 server without patching its installation or changing its normal interface.
- Verify local filesystem access through T3's authenticated file-reading API.
- Remove Office previews and bundled 3D device models from the embedded client.

Tested with Linux, Obsidian 1.15.1, and T3 0.1.11 with orchestration protocol 2.

## 0.1.0 (unreleased)

- Host the pinned T3 workspace inside desktop Obsidian on Linux.
- Filter session navigation by canonical vault membership.
- Open original Markdown files, add explicit note context, search aliases, and open folder projects.
- Preserve immediate draft edits across reconnect, tab closure, and plugin reload.
- Keep excess scope requests pending until capacity becomes available.
- Preserve workspace tabs and discard superseded font styles.
- Reset view routes when changing or resetting connections.
- Route HTTP/HTTPS system-browser actions through the checked Obsidian host operation.
- Label the native editor action “Obsidian” and add a gem icon in both file menus.
- Add an MIT license, compatibility mapping, candidate metadata, and package checksums.

Stable publication remains blocked by `docs/release-readiness.md`.
