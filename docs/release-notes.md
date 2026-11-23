# threecode 0.2.0

Status: stable release. See the [release checks](verification/0.2.0.md) and [publication checklist](release-readiness.md).

## New features

- Edit a T3 composer draft in Obsidian's Markdown editor. Use the temporary note's native Return and Cancel actions, note menu, or command palette.
- Return draft text explicitly without sending the prompt. Existing attachments stay in the composer. Successful returns and cancellations delete the temporary note.
- Enable **Format draft links on return** to convert wikilinks into T3 file mentions. The default preserves text exactly. Formatting uses full filenames as labels and resolves heading references to line ranges.
- Enable **Follow Obsidian theme** to follow resolved colors and light or dark appearance. Choosing another T3 theme or appearance disables following. Select the generated **Obsidian** theme to resume.
- Follow Obsidian's interface, text, and monospace fonts independently of theme following. Font sizes remain controlled by T3.
- Delete required components or optional fonts from plugin settings. Download them again to reinstall.

## Fixes

- Returning to the T3 tab restores keyboard focus and preserves the mounted chat.
- Unused Escape returns keyboard focus to Obsidian. T3 menus, dialogs, suggestions, and terminals retain their Escape handling.
- Packaged-client verification uses the current draft-editor client checksum.

## Upgrade

1. Return or copy any active temporary draft before reloading threecode. Draft request bindings do not survive a reload.
2. Replace `main.js`, `manifest.json`, and `styles.css` in `<vault>/.obsidian/plugins/threecode/`. Preserve `data.json`.
3. Reload Obsidian and enable threecode.
4. Open **Settings → threecode** and select **Download necessary files** to install the 0.2.0 components.
5. Optionally select **Download extra fonts**.
6. Connect to your existing T3 server and complete pairing if prompted.

Temporary `.t3draft` files remain in the vault after interrupted editing. Keep threecode enabled to open them in the Markdown editor. Copy their text into a new composer if the original editing request ended.

## Compatibility and verification limits

Requires desktop Obsidian 1.13.4 or later and a local T3 server using orchestration protocol 2. Obsidian and T3 must run on the same computer and operating system. Windows Obsidian with a WSL T3 server is unsupported.

The embedded client uses T3 0.1.11 with adapter `obsidian-host-v1.10`. The plugin connects to a standard server without patching or managing it. New feature runtime evidence covers Linux with Obsidian 1.15.1. Earlier Windows and macOS checks cover previous client versions. They do not establish runtime coverage for these new features.

Draft editing requires an active local composer inside the vault. Pending answers and queued-message edits are unavailable. Formatting rejects unresolved or ambiguous wikilinks, block references, and links to the temporary draft itself.

Vault filtering changes the embedded session list. It does not restrict agent filesystem access. Pairing credentials remain in the dedicated browser partition. Office previews and bundled device models remain excluded.
