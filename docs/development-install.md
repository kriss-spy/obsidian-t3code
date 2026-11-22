# Build and install

The plugin connects to a standard T3 server. Do not apply this repository's client patch to an existing T3 installation.

## Plugin

Run `npm ci`, `npm test`, and `npm run build`. Copy `main.js`, `manifest.json`, and `styles.css` to `<vault>/.obsidian/plugins/threecode/`. Preserve existing `data.json` when upgrading. If you installed an earlier build with the ID `t3-code`, `t-three-code`, or `t-three-code-workspace`, disable it first. Rename its plugin folder to `threecode`, then copy the new release files and enable T3 Code again. This preserves your settings.

Enable the plugin. In **Settings → threecode**, download necessary files, enter the existing server origin, and connect. Complete pairing in the embedded T3 interface.

## Component builds

Use a disposable checkout of upstream T3 revision `59651c1761f6c63e9b6056839067066968e6a406` (`v0.1.11`). Apply `upstream/t3-0.1.11-obsidian-host-v1.patch` there. This patch changes the web client only. It adds the Obsidian integration and removes Office previews and bundled device models.

Install upstream web build dependencies with the pinned upstream package manager, then build `apps/web`. From this plugin repository, run:

```sh
node scripts/build-client-manifest.mjs /absolute/disposable-t3-checkout
node scripts/package-components.mjs /absolute/disposable-t3-checkout
npm run build
npm test
```

The packaging script writes separate required and optional-font archives to `dist/components/`. It updates `src/component-release.ts` with their exact download URLs, sizes, and SHA-256 values. Build the plugin after generating these values.

Publish the archives under the component release named in those URLs. The plugin release uses a tag matching `manifest.json` and exposes `main.js`, `manifest.json`, and `styles.css` directly.

## Verification

Use a disposable vault and a standard server with an isolated data directory. Check missing-file warnings, both settings downloads, pairing, strict vault filtering, explicit context, Markdown opening, uploads, reconnect, and disable/enable cleanup.

Never run another server against the data directory of a running T3 server. Old verification reports describe older patched-server candidates and do not verify this version.
