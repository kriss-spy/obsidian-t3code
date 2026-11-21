# Obsidian AI chat precedents

Research date: 2026-11-21. Scope: current first-party repositories, official Obsidian documentation, and the user's local OpenCode plugin. No plugin was installed or exercised during this research. Features below are documented capabilities, not runtime verification.

## Main finding

Agent chat inside Obsidian is already a mature category. T3 Code integration needs to preserve T3 Code's session and execution model. Its useful difference would be native note navigation, explicit editor context, and reliable access to the complete T3 experience.

Claudian, Copilot V4, and Agent Client now support several coding agents. Older comparisons that describe these products as simple API chat panels are outdated. Their current README files establish this change. [Claudian](https://github.com/YishenTu/claudian), [Copilot](https://github.com/logancyang/obsidian-copilot), [Agent Client](https://github.com/RAIT-09/obsidian-agent-client).

## Relevant plugins

| Plugin | Documented behavior | Useful precedent | Boundary for this project |
| --- | --- | --- | --- |
| Claudian | Coding agents work in the vault. Supports file/folder/session mentions, inline editing with diffs, project instructions, multiple session layouts, and a compact composer. | Keep the note editor central. Allow a compact working mode and a persistent session manager. | Its own provider adapters and conversation UI are not evidence of T3 Code integration. |
| Copilot V4 | Uses OpenCode, Claude Code, or Codex. Provides projects, reusable commands, shared skills, Agent tabs, and selection-based Quick Ask. | Give onboarding a clear default. Make note context and reusable Obsidian skills accessible. | Hosted features and provider routes create a larger configuration model than a focused T3 client needs. |
| Agent Client | Uses ACP, the Agent Client Protocol. Runs separate chats in sidebars, editor tabs, floating windows, and notes. Lists their live states. | A session manager should reveal permission waits. Workspace location should not determine session identity. | Resume and fork depend on each agent. ACP support alone does not preserve T3 orchestration. |
| Obsidian OpenCode, user's local fork | Embeds the CLI terminal. Adds history, Markdown exports, file references, session links, and Markdown file opening. | Reuse the existing path-opening knowledge and note-to-agent workflow. | Terminal rendering introduces mouse, wrapping, clipboard, and shortcut problems. A web client needs different integration. |

Sources: [Claudian README](https://github.com/YishenTu/claudian/blob/master/README.md), [Copilot README](https://github.com/logancyang/obsidian-copilot/blob/master/README.md), [Agent Client README](https://github.com/RAIT-09/obsidian-agent-client/blob/master/README.md), and [local OpenCode README](/home/krisspy/Projects/obsidian/obsidian-opencode/README.md).

### Claudian details

Its current implementation uses provider-specific adapters, including Claude Agent SDK, Codex app-server, OpenCode HTTP, and shared ACP mechanics. It also documents cross-session communication and an experimental API for other plugins. Installation requires a supported agent and account; it targets desktop Obsidian 1.13.0 or later. These are useful references for lifecycle cleanup and host integration. They also show the maintenance cost of owning a complete agent client. [Repository architecture and requirements](https://github.com/YishenTu/claudian/blob/master/README.md).

### Copilot details

Copilot can manage an OpenCode installation, detect Claude Code, or install a tested Codex ACP adapter. Existing CLI accounts can supply access. Keys for separate providers use the device's Obsidian Keychain. Its bundled skills cover Obsidian Markdown, Bases, Canvas, and CLI operations. Agent execution is desktop-only; lighter chat features support mobile. These onboarding choices support a recommended setup with an explicit advanced path. [Setup and features](https://github.com/logancyang/obsidian-copilot/blob/master/README.md).

### Agent Client details

The active note and selected lines can become context. Users can mention notes by name, path, or alias. Mentioned notes expose their wikilink targets. Chats can use another working directory while retaining vault-note mentions. Answers can follow Obsidian syntax. Permission requests and word-level edits remain visible. Sessions can export as Markdown. Users install and authenticate the agent first, then detect its executable in settings. [Features and setup](https://github.com/RAIT-09/obsidian-agent-client/blob/master/README.md).

## Opening Markdown outside the vault

The user's claim is supported by official release notes. Obsidian 1.14 publicly introduced opening individual Markdown files outside a vault. Files open in the current window. Relative image embeds and local links resolve from the file's folder. Outline and Outgoing links work with these files. The feature requires a recent installer. Early access shipped it in desktop 1.14.2. [Official changelog](https://obsidian.md/changelog/).

The public type definitions expose `WorkspaceLeaf.openFile(TFile, OpenViewState)`. They do not, in this inspection, document an external-path constructor or the external lookup convention. Therefore, application support is confirmed, but a stable public external-file API remains uncertain. [Obsidian API definitions](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts).

The local OpenCode implementation provides a concrete lead:

1. Gate external file support with `requireApiVersion("1.14.2")`.
2. Retrieve the file with `app.vault.getFileByPath("file:" + absolutePath)`.
3. Open it through a normal workspace leaf.
4. Apply line and column navigation through the Markdown editor.

The `file:` prefix is a literal internal path convention, not a `file://` URL. Spaces and `#` remain unescaped. This is source inspection only. Keep this behavior behind one compatibility adapter and test it in the target Obsidian build. [Local implementation](/home/krisspy/Projects/obsidian/obsidian-opencode/src/views/opencodeTerminalView.ts:253).

Do not assume `obsidian://open?path=...` solves arbitrary external file opening. The current official URI documentation describes locating a containing vault. That differs from the new external-file feature. [Obsidian URI documentation](https://help.obsidian.md/Extending+Obsidian/Obsidian+URI).

## Recommended interaction requirements

These are proposals for the T3 plugin, not verified T3 capabilities.

- Preserve T3 session IDs and lifecycle states. Obsidian tabs should display sessions without creating another session database.
- Open a session in a main editor tab or sidebar. Let a command reveal the current session and return focus to its composer.
- Send the active note or selected lines through an explicit command. Show the attached paths before submission.
- Support drag-and-drop notes and folders. Keep the draft editable; do not submit automatically.
- Open Markdown links in Obsidian with line locations and normal modifier behavior. Resolve relative paths against the session's actual working directory.
- Distinguish local paths from remote-environment paths. Remote Markdown needs a defined transfer or mapping policy before local opening can work.
- Expose working and permission-wait states without forcing the user to visit every session.
- Use Obsidian colors, typography, focus behavior, and spacing. Keep access to the full T3 UI when a reduced layout hides controls.
- Offer kepano/obsidian-skills as a visible recommended setup. Show the destination and changes before installation.
- Allow a note to link back to its T3 session. Treat conversation export as a snapshot, separate from the live session.

The local OpenCode repository already documents session deep links and explicit selection insertion. It also records shortcut conflicts and platform-specific terminal behavior. These are concrete integration lessons, not reasons to reproduce its terminal architecture. [Usage and limitations](/home/krisspy/Projects/obsidian/obsidian-opencode/README.md), [terminal link contract](/home/krisspy/Projects/obsidian/obsidian-opencode/docs/terminal-links.md).

## Verification still needed

- Run external Markdown opening and editing in the installed Obsidian version.
- Check external filenames containing spaces, Unicode, and `#` on supported operating systems.
- Verify focus, modifier clicks, note selection context, and theme changes in the actual plugin.
- Determine which T3 bridge supports file-open requests and draft attachments without DOM scraping.
- Confirm complete T3 feature access before calling a reduced embedded layout equivalent to the web UI.
