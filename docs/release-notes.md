# threecode 0.3.0

Published on 2026-11-25. See [verification](verification/0.3.0.md) and [publication steps](release-readiness.md).

## Changes

- Support desktop Obsidian 1.13.4 and add earliest/latest runtime checks to cross-platform CI.
- Fix link and image reference drops from Obsidian reading mode.

- Configure Ctrl+click and Cmd+click on folder links. Choose native T3 behavior, Obsidian file explorer, an existing folder note, Notebook Navigator, or File Tree Alternative. Native behavior remains the default.
- Open folder notes inside the selected folder. The default filename is `{folder}.md`; use `index.md` or another filename if needed. Missing notes show a notice. The plugin does not create them.
- Disable unavailable folder integrations in settings. Check availability again on click and show a notice when an integration becomes unavailable.
- Group settings into Connection, Notes and folders, Composer, Appearance, and Help and resources. Find Obsidian agent skills and Compatibility under Help and resources.
- Prevent font flicker when switching settings categories. Keep active CSS until its replacement is installed and skip unchanged CSS.

Folder actions accept canonical paths in the local vault. Remote environments, paths outside the vault, and symlinks outside the vault retain native behavior. Ordinary clicks retain their existing action.

## Upgrade

1. Return or copy any active temporary draft before reloading threecode. Draft request bindings do not survive a reload.
2. Replace `main.js`, `manifest.json`, and `styles.css` in `<vault>/.obsidian/plugins/threecode/`. Preserve `data.json`.
3. Reload Obsidian and enable threecode.
4. Open **Settings → threecode → Connection** and select **Download necessary files** to install the 0.3.0 components.
5. Optionally select **Download extra fonts**.
6. Connect to your existing T3 server and complete pairing if prompted.

The download URLs use the published `components-0.3.0` assets. Folder actions default to native behavior on existing installations.

## Compatibility and verification limits

Requires desktop Obsidian 1.13.4 or later and a local T3 server using orchestration protocol 2. Obsidian and T3 must run on the same computer and operating system. Windows Obsidian with a WSL T3 server is unsupported.

The embedded client uses T3 0.1.11 with adapter `obsidian-host-v1.11`. The plugin connects to a standard server without patching or managing it. Disposable-vault folder checks cover Linux, Obsidian 1.13.4, Notebook Navigator 3.5.2, and File Tree Alternative 2.6.4. File Tree Alternative integration depends on its internal `fta-reveal-folder` event.

Full rendered T3 Ctrl+click and Cmd+click flows remain unverified. Cross-platform CI results and published-download checks are recorded in [release readiness](release-readiness.md). The full upstream test suite was not run. Host-handler runtime checks and bridge unit tests do not establish the full rendered flow.

Vault filtering changes the embedded session list. It does not restrict agent filesystem access. Pairing credentials remain in the dedicated browser partition. Office previews and bundled device models remain excluded.
