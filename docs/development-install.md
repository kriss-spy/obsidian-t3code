# Try the development build

This build runs the real T3 web UI inside desktop Obsidian. It supports Linux and Obsidian 1.15.1. It is a development build, with incomplete release verification.

It requires a patched T3 0.1.11 server and the exact client bundled here. Your unmodified T3 installation stays unsupported. Rebuilding the plugin alone does not install the required T3 hooks.

The current archive is `obsidian-t3code-0.1.0-rc.2-linux.zip`. It is a testing candidate, not an approved stable release. Check its companion `.sha256`, extract it, and run `node scripts/verify-candidate.mjs /absolute/extracted/candidate`. See [remaining release gates](release-readiness.md).

## Prepare T3

The bundle contains `plugin/t3-code`, `t3-web`, the upstream patch, and preparation scripts. Extract the ZIP before continuing.

Use Node `26.13.1`, pnpm `12.14.0`, and Git. These are the pinned upstream build requirements. From the extracted bundle, run:

```sh
bash scripts/prepare-t3-development.sh "$HOME/obsidian-t3-patched"
```

Choose a new checkout path. The script verifies revision `59651c1761f6c63e9b6056839067066968e6a406`, applies the patch, installs dependencies, and builds the server. It copies the verified client instead of rebuilding it. It does not start T3 or open its database.

For a disposable first trial, start the prepared server explicitly:

```sh
cd "$HOME/obsidian-t3-patched"
env -u T3CODE_CLI_PATH -u T3CODE_THREAD_ID -u T3CODE_DESKTOP_HOST_SCOPE \
  node apps/server/dist/bin.mjs serve \
  --base-dir "$HOME/.cache/obsidian-t3-trial" \
  --host 127.0.0.1 --port 39173 --no-browser
```

Keep this terminal open. This trial uses separate T3 data. T3 handles provider authentication through its normal UI and installed agents.

To reuse an existing environment, install the patch in that environment's server deployment instead. Stop its previous server before opening the same data directory. Keep its backup and use this exact server version. Never use the old standalone CLI 0.1.7 against the running 0.1.11 database. This bundle does not replace an AppImage automatically.

## Install in Obsidian

1. Open a disposable vault in Obsidian 1.15.1.
2. Copy `plugin/t3-code` into `<vault>/.obsidian/plugins/t3-code`.
3. Enable community plugins, then enable T3 Code.
4. Set the T3 server to `http://127.0.0.1:39173` in T3 Code settings.
5. Select Connect.
6. Run the `Open T3 Code` command.

Use the running server's normal pairing flow. For the trial server, generate a one-time token in another terminal:

```sh
cd "$HOME/obsidian-t3-patched"
env -u T3CODE_CLI_PATH -u T3CODE_THREAD_ID -u T3CODE_DESKTOP_HOST_SCOPE \
  node apps/server/dist/bin.mjs pair \
  --base-dir "$HOME/.cache/obsidian-t3-trial" --label 'Obsidian trial'
```

Paste the token into T3's pairing form in Obsidian. Do not put it in plugin settings. If no project matches the vault, select **Use vault folder**. This registers the exact folder without initializing Git or changing agent instructions.

The plugin does not start another backend. It connects to the server you select. Other T3 clients keep their normal unfiltered UI.

## Try the note workflow

- Resume an in-vault thread, or start a thread in the vault project.
- Click a Markdown chip normally to keep its preview in T3. Use Ctrl/Cmd-click or its **Open in default app** menu action to open the original in Obsidian.
- Use **Open in Obsidian** in the file explorer’s **Open with** submenu or the preview’s editor dropdown.
- Search file names or note aliases from T3. Results retain the canonical file path.
- Right-click a vault folder and choose **Open folder in T3 Code** to open its exact project. Note and folder reference drops remain under runtime verification.
- Native notes open in the same tab group as T3 by default. Choose a split explicitly in plugin settings if needed.
- In an Obsidian editor, run `Add selection to T3` or `Add current note to T3`. Both append explicit context to the composer.
- Review the composer before sending. The commands preserve existing text and attachments and never submit automatically.
- Use **Reset connection** to clear only this vault/server browser partition.

Only threads with a canonical registered worktree inside the vault appear. Without a worktree, their project root must be inside. Remote and uncertain identities stay excluded. An excluded saved route displays an explanation and a normal T3 action.

Recommended: [the official Obsidian agent skills](https://github.com/obsidianmd/obsidian-skills#installation) teach Markdown, Bases, Canvas, and Obsidian tools. Install them through your normal agent setup. This plugin does not change agent instructions.

See the [recommended layout](layout.md). **Focus T3 Code** closes Obsidian's left sidebar on request. T3 controls theme colors; optional Obsidian matching changes only the font.

## Known limits

- Only this exact patched client is approved. Copying a capability declaration cannot enable another client. A source rebuild needs a new verification run and approved manifest.
- Full T3 parity remains a release blocker. Questions, permission prompts, stop/continue during reconnect, browser preview, and every lifecycle ordering case have not completed the full reference comparison.
- Windows, macOS, mobile, and remote-server identity mapping have no runtime support claim.
- The external `file:` editor adapter depends on the tested Obsidian desktop behavior. Unsupported external files stay in T3 or show an explanation.

Disable the plugin and remove its plugin folder to uninstall. Stop a trial server with Ctrl+C. Keep the patched checkout and trial data separate from your normal T3 installation.
