# T3 Code for Obsidian

Use T3 Code inside desktop Obsidian. Add note context, open Markdown files in Obsidian, and show sessions whose working directories belong to the current vault.

## Install

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest plugin release](https://github.com/kriss-spy/obsidian-t3code/releases/latest).
2. Put those files in `<vault>/.obsidian/plugins/t3-code/`.
3. Enable T3 Code in Obsidian's community plugin settings.
4. Open **Settings → T3 Code** and select **Download necessary files**.
5. Enter your existing T3 server address and select **Connect**.
6. Open T3 Code and complete T3's normal pairing flow.

Use a local Linux T3 server with orchestration protocol 2. This release was tested with T3 0.1.11 and Obsidian 1.15.1. Other operating systems are not yet verified.

The plugin does not patch, install, start, or stop your T3 server. It uses the server you already run. Your normal T3 app keeps its own interface and update process. Future incompatible T3 API changes may require a plugin update.

## Downloads

The plugin release contains the three normal Obsidian plugin files. The settings buttons download separate, versioned components from this repository's GitHub releases. Each download has a checksum pinned in the plugin. Components stay inside this plugin's folder.

Required components provide the embedded T3 interface. Office document previews and bundled device models are excluded. Files can still be saved and opened in another application. PDF previews, code, Markdown, and other retained T3 workflows remain available.

**Download extra fonts** optionally installs Inter and terminal symbol fonts. System fonts are used by default. Small fonts required to render mathematical notation remain in the required components.

The plugin warns when required components are missing or changed. Download them again to repair the installation. Internet access is needed for downloads. Installed components work with the local server without downloading them again.

## Use

Run **Open T3 Code** from the command palette or ribbon. If the vault has no T3 project, select **Use vault folder**.

Use **Add selection to T3** or **Add current note to T3** to place explicit context in the composer. Review it before sending. Notes are not sent automatically.

Plain Markdown clicks keep T3's preview. Ctrl/Cmd-click and **Open in Obsidian** actions open the local Markdown file in Obsidian.

Vault filtering changes this embedded view only. It does not restrict an agent's filesystem access or alter other T3 clients.

## Upgrade

Replace the three plugin files and preserve `data.json` and the `components` folder. Reload the plugin, then download the required components for the new plugin version. Pairing stays in Obsidian's isolated browser session.

Users of the old rc.3 patched server can connect to their normal T3 server instead. The plugin does not undo an existing patch or move server data.

## Development

Run `npm ci`, `npm test`, and `npm run build`. The embedded client is built from the pinned upstream revision and the client-only patch under `upstream/`. See [development installation](docs/development-install.md).

## License

MIT. T3 Code and bundled components retain their respective licenses and notices.
