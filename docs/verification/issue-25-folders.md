# Configurable folder actions

Implemented the folder-action proposal in [issue 25](https://github.com/kriss-spy/obsidian-t3code/issues/25).

Ctrl+click and Cmd+click ask the host to handle folder links. Ordinary clicks keep their existing callback. The host defaults to declining folder requests. It also declines remote environments, paths outside the vault, symlinks that resolve outside the vault, and regular files.

The setting offers the native T3 action, Obsidian file explorer, a folder note, Notebook Navigator, and File Tree Alternative. Unavailable integrations remain visible as disabled options. Availability is checked again when handling a click. A missing plugin or folder note produces a notice. The plugin does not create notes.

Folder notes use a configurable filename inside the selected folder. The default is `{folder}.md`; `index.md` is also supported. This implementation does not read other folder-note plugins’ settings or resolve sibling folder notes.

## Verification

Verified on Linux on 2026-11-25:

- `npm run build`: passed TypeScript and plugin bundling.
- `npm test`: 118 tests passed. Coverage includes canonical vault boundaries, external symlinks, remote environments, folder-note filename validation, native fallback, missing plugins and notes, disabled setting options, save failure rollback, and client request identity and route changes.
- `npm run test:obsidian`: passed the existing plugin load/reload, settings, theme/fonts, draft Return/Cancel, trash, and webview isolation checks.
- Patched upstream client: applied the complete patch to revision `59651c1761f6c63e9b6056839067066968e6a406`; `vp build` passed. The bundler reported large-chunk warnings.
- `node scripts/verify-packaged-client.mjs <checkout>/apps/web/dist`: verified 33 client assets against manifest SHA-256 `9e90f473bb2ca88a74e53c1cc8e9d7e05556f1159ec24d164da2961c5b33d0b2`.
- Component archive validation: the production decoder verified all 1,318 core files and 10 font files. The core archive contains the expected new client manifest.
- `FOLDER_ACTIONS=1 npm run test:obsidian`: passed in a disposable vault using Obsidian 1.13.4, Notebook Navigator 3.5.2, and File Tree Alternative 2.6.4. The explorer checks invoked the installed plugin's host handler. All three explorers revealed `Parent/Child` from existing and closed panes. The existing folder note opened, settings survived reload, and disabling Notebook Navigator consumed the action without native fallback.

The runtime fixture used downloaded plugin directories through `NOTEBOOK_NAVIGATOR_PATH` and `FILE_TREE_ALTERNATIVE_PATH`, because the launcher failed to download Notebook Navigator's release asset. It did not access a personal vault.

The tests exercise the exact client bridge module from the patch and the real host actions in Obsidian. They do not establish a full rendered T3 Ctrl+click flow, Windows behavior, or macOS behavior.

## Component release

The new client uses adapter `obsidian-host-v1.11`. The core component archive and its pinned metadata were rebuilt for the proposed release tag `components-0.3.0`. The archives are local under `dist/components/`. The release has not been published. Publish the component assets together with the plugin update before distributing this build; downloading the new required files otherwise fails.

Notebook Navigator uses its [public navigation API](https://github.com/johansan/notebook-navigator/blob/main/docs/api-reference.md). File Tree Alternative uses its internal `fta-reveal-folder` event after opening and mounting its pane. That event is a compatibility dependency on File Tree Alternative.

## Settings font flicker follow-up

The recording `Screencast_20261125_180107.mp4` showed text and layout shifts while switching Obsidian settings categories. The cause was the existing font-sync path in `src/view.ts`. Every relevant host body attribute change removed the active guest stylesheet before reading and installing its replacement. The guest briefly used T3's native font stack.

A live probe in CloudNotes sampled the guest font on animation frames while changing an unrelated host body class. Before the fix, it detected two font stacks and failed its stability assertion. After the fix, the same probe detected one font stack. A second probe switched six settings categories through Obsidian's settings API and also detected one font stack. These checks did not change any preference values. Temporary probe state was removed.

The fix installs the new stylesheet before removing the previous one and skips unchanged CSS. Regression tests cover replacement ordering, unchanged CSS, overlapping updates, and disconnect cleanup. `npm run build` passed and all 120 tests passed. The patched plugin was rebuilt, installed in CloudNotes, and reloaded. Client component files did not change for this fix.
