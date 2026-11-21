# T3 Code in Obsidian

Status: initial product brief, 2026-11-21. Implementation has not started.

The [implementation spec](spec.md) now defines the build scope and accepted behavior. This brief preserves the original product context.

## Goal

Use T3 Code from the Obsidian GUI with the power of its web UI and interactions that fit note work.

The baseline is the user's current T3 Code experience inside Obsidian's web viewer. A smaller chat feature set would not meet the goal.

Clarification from the user: keep T3 Code's UI and out-of-the-box setup. Natural Obsidian integration does not require a native replacement for the chat UI. Avoid duplicating T3's provider, model, permission, and agent configuration in plugin settings.

## User priorities

1. Manage many sessions through T3 Code's recent, working, snoozed, settled, and archived views.
2. Open Markdown links from T3 Code in the Obsidian note editor, including files outside the vault where supported.
3. Match Obsidian's appearance and reduce controls unrelated to the current work.
4. Provide an opinionated environment, including a recommendation for `kepano/obsidian-skills`.

These are user requirements and candidate highlights. They are not claims about verified APIs.

## Accepted interaction decisions

- Use one T3 workspace tab with T3's existing session sidebar for now.
- Provide explicit Add selection and Add current note commands. Prepare context in the composer for review; do not submit automatically.
- Do not automatically attach the active note when editors change.
- Scope the default session list to the vault root and its subfolders. Feasibility is supported by T3's project roots and thread worktree paths. The embedded-UI filter has not been implemented or runtime-tested.

For the path filter, use the session's registered working directory, not the paths mentioned in messages or a shell command's temporary `cd`. Resolve the local vault's real path and compare directory boundaries. An external worktree falls outside this strict scope even if its parent project is in the vault. Remote paths need a verified vault mapping before inclusion.

## Proposed interaction principles

- T3 Code owns agent runs, permissions, providers, and session state.
- Obsidian owns note editing, panes, keyboard commands, and vault context.
- Keep existing T3 Code sessions accessible. Avoid a second session store.
- Make note and selection context visible before sending it to an agent.
- Preserve access to advanced T3 Code controls when using a simpler note-focused layout.
- Offer setup recommendations with their purpose and scope. Do not silently replace existing agent configuration.

These principles are proposals for the first implementation.

## Research questions

Three agents investigate these areas independently:

1. T3 Code's philosophy, architecture, and integration contracts.
2. Obsidian AI chat plugins and their interaction patterns.
3. Existing T3 Code integrations for Obsidian and opportunities to reuse them.

Research must identify the user's installed T3 Code distribution. Public upstream features may differ from that distribution.

## First implementation decision

Choose the smallest maintainable integration that preserves the baseline capabilities.

Before choosing, inspect existing plugins and determine whether a supported host bridge can handle file navigation, context, and appearance.

Treat cross-origin embedding, authentication, external Markdown editing, and remote file paths as questions to verify.

## Acceptance scenarios for a first usable version

These scenarios define desired behavior. None has passed yet.

1. Connect to the user's existing T3 Code instance and resume an existing session.
2. Send a prompt, receive streamed output, and complete a permission request inside Obsidian.
3. Switch between sessions without losing a running task or draft.
4. Use the available T3 Code lifecycle actions and confirm the result in its web UI.
5. Click a vault Markdown link and open the correct Obsidian editor pane.
6. Click a local Markdown link outside the vault and edit the original file through supported Obsidian behavior.
7. Handle a remote file link explicitly when that file does not exist on the Obsidian machine.
8. Attach the active note or selected text with visible context and source attribution.
9. Follow Obsidian light and dark themes and remain usable in a narrow pane.
10. Reconnect after a server restart without duplicating a prompt.
11. Disable the plugin and release its listeners, embedded pages, and connections.

## Current scope

This kickoff produces research and an implementation recommendation. The plugin's architecture, compatibility floor, and release scope remain open until the evidence is reviewed.
