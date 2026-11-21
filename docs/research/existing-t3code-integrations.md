# Existing T3 Code integrations for Obsidian

Research date: 2026-11-21. This report uses public repository documentation and source inspection. No plugin was installed or tested in Obsidian.

## Recommendation

Evaluate and extend **[7bgsbm749g-boop/t3-obsidian](https://github.com/7bgsbm749g-boop/t3-obsidian)** before creating a second native T3 client. It already implements most of the difficult Obsidian integration work. Its [MIT license](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/LICENSE) permits reuse with the required copyright and license notice.

This is a recommendation, not a finding that the existing plugin satisfies the product brief. Its native sidebar implements a subset of T3's interface. Full web UI parity remains unproven. A sensible first step is a compatibility and capability audit against the user's actual T3 installation. Retain access to the full T3 web UI while adding native integration. A supported embedding bridge would be preferable to duplicating every T3 screen, but this research did not establish such a bridge.

## Direct match: t3-obsidian

Inspected source commit: `88ccbf9634f8475111b1f332e7488f4583c3eb52`. The [manifest](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/manifest.json) declares version `0.0.463`, plugin ID `t-three-code`, minimum Obsidian `1.13.0`, and desktop/mobile support.

The [official community registry](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json) contains that ID and repository. Its description includes the registry's warning that Obsidian staff have not manually reviewed the plugin. Registry presence is not proof of runtime quality or security review.

The [README](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/README.md) documents these existing capabilities:

- Connect to an existing T3 server through T3 Connect, direct HTTPS, or an externally managed SSH tunnel.
- Send a note or selection and stream the answer into a note.
- Link note folders to T3 projects and import or catch up on existing responses.
- Open normal threads, side chats, and subagent conversations in native workspace tabs.
- Configure agent MCP tools for note edits across connected computers.

The plugin does not include or start a T3 server. Its setup requires T3 Orchestrator v2. Compatibility with the user's installation must be checked.

### Reusable modules and verified source behavior

| Area | Evidence from source | Implication |
| --- | --- | --- |
| Native thread panes | [`sidebar-thread-view.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/conversations/sidebar-thread-view.ts) registers three `ItemView` types. It persists drafts in workspace state and stops its readers on close. | Native pane integration already exists. |
| Authentication and transport | [`t3-rpc.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/connection/t3-rpc.ts) obtains a WebSocket ticket and uses authenticated Effect RPC frames. | Reuse connection ownership and protocol handling rather than inventing a transport. This code is not evidence of a supported public SDK. |
| File links | [`codebase-links.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/projects/codebase-links.ts) parses absolute paths, `file:` links, `sandbox:` prefixes, line/column references, and project scopes. | Preserve the originating computer and workspace when opening a link. A pathname alone is insufficient. |
| Native file editing | [`codebase-native.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/projects/codebase-native.ts) registers virtual files and routes reads/writes through project I/O. It patches vault, metadata-cache, workspace, and adapter methods. | The existing project solves remote file editing, but the adapter has maintenance costs. It is not proof of a public external-file API. |
| File identity | [`codebase-core.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/projects/codebase-core.ts) uses the virtual prefix `__t3_codebase__/`. | Do not confuse these files with ordinary vault files or claim the core app provides this feature. |
| Appearance | [`styles.css`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/styles.css) uses Obsidian variables such as `--text-muted` and `--background-modifier-border`. | Native components already follow host theme variables. |
| Lifecycle actions | [`note-inbox-threads.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/notes/note-inbox-threads.ts) dispatches `thread.settle` and `thread.unsettle`. | Some inbox actions update T3 itself, rather than only local presentation. |

The [private host adapter](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/shared/native-editor.ts) also reads private Markdown editor fields. Any adoption should isolate those dependencies and test them on the intended Obsidian version.

### Missing capabilities and uncertainty

1. **Complete session management:** [`note-inbox-view.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/notes/note-inbox-view.ts) defines working, snoozed, and settled shelves. These represent notes with stream history. They are not a complete T3 session browser.
2. **Archived sessions:** [`thread-target.ts`](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/88ccbf9634f8475111b1f332e7488f4583c3eb52/src/conversations/thread-target.ts) filters archived and deleted threads from choices. The sidebar also marks an archived thread unavailable. This conflicts with the requested archived-session access.
3. **Full transcript:** The README states that the sidebar shows the most recent 200 messages. Long-session access needs an explicit acceptance test.
4. **Full T3 feature parity:** No parity claim was established for terminal, source-control workflows, browser previews, scheduled work, or every settings page. File-name searches are insufficient to prove absence. Verify these workflows individually.
5. **Voice:** The README states that browser speech recognition is used where available. T3's remote transcription service is not connected.
6. **Embedding:** The implementation inspected is a native client. Its HTML result frames do not demonstrate that the full T3 app can be embedded with a supported host bridge.

## Search results that are not Obsidian plugins

- [`flourish-today/obsidiancode`](https://github.com/flourish-today/obsidiancode/blob/main/README.md) is an Android T3 fork focused on telemetry, permissions, and integrated Tailscale. The name does not indicate an Obsidian integration.
- [`victorcode1/obsidian-orbit`](https://github.com/victorcode1/obsidian-orbit/blob/main/README.md) is an MIT-licensed T3 theme. Its optional animated scene requires a T3 fork. It is not an Obsidian plugin or a host-theme synchronization mechanism.

These results should not inflate the count of direct integrations.

## Opinionated setup: Obsidian Skills

The user's `kepano/obsidian-skills` reference now redirects to **[`obsidianmd/obsidian-skills`](https://github.com/obsidianmd/obsidian-skills)**. The [1.1.0 release](https://github.com/obsidianmd/obsidian-skills/releases/tag/1.1.0) confirms the move and official publisher.

The current [README](https://github.com/obsidianmd/obsidian-skills/blob/main/README.md) documents provider-specific installation and includes Markdown, Bases, Canvas, CLI, Headless, Defuddle, and Knap skills. The [license](https://github.com/obsidianmd/obsidian-skills/blob/main/LICENSE) is MIT.

Recommendation: offer a setup recommendation for the selected agent and environment. Check whether it is installed before offering installation. Explain that a skills package teaches the agent Obsidian formats and tools; it does not provide T3 transport or guarantee the Obsidian CLI is available. Avoid overwriting existing agent configuration. Use current provider-specific instructions instead of copying an old global path into the plugin.

## Search scope and verification limits

Searches run:

- GitHub repository queries: `obsidian t3code` and `obsidian "t3 code"`.
- Web queries: `Obsidian T3 Code plugin GitHub`, `"t3code" "obsidian" plugin`, and `"t3-code" "obsidian" plugin`.
- Follow-up queries scoped to GitHub for `"t3code" "Obsidian" "webview"` and T3 plugin references.
- Downloaded the official `community-plugins.json` and searched plugin IDs, names, descriptions, and repositories for T3-related matches.
- Inspected the direct match's README, manifest, license, transport, sidebar, inbox, editor adapter, file-link parser, and stylesheet.

This search found one direct Obsidian T3 plugin in the inspected results. It does not establish that no other integration exists. Private repositories, unindexed projects, and later changes remain outside the evidence.

No runtime connection, authentication, streaming, editing, or lifecycle test was run. No source was copied into this project.
