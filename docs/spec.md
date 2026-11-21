# T3 Code in Obsidian: implementation spec

Status: ready for implementation. No distributable plugin exists yet.
Date: 2026-11-21.

This spec records the accepted product decisions and implementation defaults. It supersedes the initial recommendations in the kickoff and research reports. The [technical spike](technical-spike.md) records what was tested and what remains unverified.

## Product goal

Run the full T3 web UI inside Obsidian. Preserve its existing setup and capabilities. Add note navigation, explicit editor context, and a session list scoped to the current vault.

The baseline is the user's T3 web UI inside Obsidian's web viewer. The plugin must improve integration without reducing that baseline to a smaller chat client.

## Accepted decisions

- Use one T3 workspace tab per Obsidian vault window. Repeated Open commands reveal that tab.
- Keep T3's conversation UI and session sidebar.
- Show sessions whose registered working directory is the vault root or a subfolder.
- Add selection and current-note context only through explicit commands.
- Prepare context in the composer for review. Never submit it automatically.
- Do not attach notes when the active editor changes.
- Keep providers, models, permissions, tools, and agent configuration in T3.

The remaining details below are implementation defaults. They do not require another design round before work starts.

## First release scope

Target desktop Obsidian, starting with the tested Linux environment: app `1.15.1`, installer `1.15.0`, and T3 server `0.1.11` with orchestration protocol `2`. Use Obsidian `1.15.1` as the initial minimum app version. Mark the plugin desktop-only.

Support Windows and macOS only after the same acceptance scenarios pass there. Mobile hosting is outside this release.

Retain T3's normal workflows, including streaming, tool activity, permissions, questions, attachments, models, session lifecycle, terminal, and browser features available in the reference web UI. Do not duplicate these workflows in Obsidian controls.

Exclude a native replacement conversation UI, automatic note streaming, remote Markdown editing, provider management, and automatic T3 installation from the first release. Keep unmatched remote files in T3's existing viewer.

## Main workspace

Register a dedicated Obsidian `ItemView` for T3. Open it in the main editor area. Users can move it with normal Obsidian pane controls.

Persist the current T3 target and view state. Restore the same thread or draft after a workspace reload. Browser partition persistence alone does not restore the working location.

Keep the view title short: `T3 Code`. Use T3's existing sidebar for session navigation. Do not open an Obsidian tab for each session in this release.

Switching to a note must not submit a prompt, change the T3 draft, or cancel a running task. Closing the T3 tab disconnects its local view without stopping server-owned work. Reopening restores its target. Closing or disabling the plugin must release its guest, event listeners, timers, and theme adapter.

## Connection and setup

Connect to an existing T3 server. Do not start another backend by default.

Use T3's pairing and authentication flow. Keep credentials in the guest's dedicated persistent browser partition. Do not copy credentials into plugin JSON, notes, logs, or workspace URLs.

Scope the partition to this plugin and vault. Two vaults must not share their session filter or navigation state accidentally.

Read the server descriptor before enabling integrations. Match its environment identity, version, protocol, and capabilities against the adapter's supported range. The standalone CLI version is not authoritative. The spike found CLI `0.1.7` beside server `0.1.11`.

Avoid CLI access to T3's database. If a future helper needs a CLI, match it to the running server. Do not run migrations or change T3 data as part of connection detection.

First-run flow:

1. Choose or enter the existing T3 server address.
2. Complete T3 pairing.
3. Resolve the current vault path and matching T3 projects.
4. Open the scoped T3 workspace.

If no matching project exists, show `Use vault folder` with the exact local path. That action may register a T3 project. It must not initialize Git, move files, or rewrite agent configuration.

For nonlocal servers, require HTTPS or a separately configured secure tunnel. Plain HTTP is limited to loopback. Use ordinary T3 connection behavior rather than building SSH management into this plugin.

## Vault session scope

The scope is a local display filter. It does not restrict the agent's filesystem permissions or change thread visibility in other T3 clients.

### Inclusion rule

Resolve the local vault's canonical filesystem path. Determine each thread's registered working directory from its worktree path, when present, or its owning project's workspace root. Include the thread only when that directory equals the vault path or is a descendant.

Use filesystem-aware directory boundaries. A sibling such as `vault-backup` must not match `vault`. Resolve symlinks for existing paths. Use the owning platform's path rules. If identity or path resolution is uncertain, exclude the thread and expose a concise diagnostic.

Do not infer membership from project names, repository identity, message contents, attached notes, or shell commands that temporarily change directory.

A worktree outside the vault is excluded even if its parent project's root is inside the vault. A project outside the vault does not qualify merely because an agent reads a note inside it.

Remote environment paths are excluded unless a verified vault mapping exists. Remote path mappings are deferred from the first release.

### Filter coverage

Apply the same membership rule to the active list, pinned threads, Working, Snoozed, Settled, recent navigation, search results, archived lists, and new-thread project choices. Preserve T3's actual state transitions and ordering inside that scope.

An empty result is an empty vault session list. It must not fall back to all sessions. Late project metadata, reconnects, restored routes, and T3's automatic scope widening must not expose unrelated sessions.

When restoring an out-of-scope route, show the vault list instead. Explain that the session is outside this vault. Offer to open it in the normal T3 app without widening the embedded scope.

For a new thread, use the vault-root project by default. Keep matching subfolder projects available through T3's project picker. If a subfolder project is explicitly selected, retain that choice for the new draft.

T3's current multi-project filter is useful reference code. It is not sufficient proof of strict vault filtering. The adapter must filter thread metadata before rendering and cover all relevant lists. Hiding rendered rows with CSS is insufficient.

## Markdown navigation

Handle a file-open request containing environment identity, absolute path, and optional line and column. Resolve relative references in the owning thread's working directory before sending the request.

For a verified local Markdown file:

1. Resolve its filesystem identity.
2. Reuse an existing editor for that file when available.
3. Otherwise, open it beside the T3 workspace.
4. Apply the supplied line and column within the file's bounds.

Ordinary clicks focus the editor. Modifier clicks follow Obsidian's normal new-tab behavior. Keep the T3 session and draft intact.

Use normal vault files for paths inside the vault. Use Obsidian's core external-file support for other local Markdown files. Isolate the tested `file:` lookup convention behind a compatibility adapter. Do not copy external files into the vault or implement virtual files by patching Obsidian internals.

If a file is missing, report its path without creating a note. If the file belongs to a remote environment or the adapter cannot identify it reliably, preserve T3's existing viewer behavior. Non-Markdown links retain T3's normal actions.

Intercept the semantic T3 file action, including its custom Markdown chips. An ordinary navigation listener does not cover those callbacks. Do not reconstruct environment identity from the visible link label.

## Explicit editor context

Provide `Add selection to T3` and `Add current note to T3` through the command palette and editor context menu. Provide `Open T3 Code` through the command palette and ribbon.

Capture the originating editor before changing focus. Use its in-memory content, including unsaved edits. Do not silently save the note as a side effect.

Context must identify its source file. Selection context also identifies its line range. Preserve the selected text and Markdown exactly. Use an unambiguous encoding when content contains Markdown fences.

Append the context to the active in-scope T3 draft without replacing existing text or attachments. Keep the source visible in the composer. Focus the composer after insertion. Repeated explicit commands may append again; background editor changes append nothing.

If there is no active target, open an in-scope new-thread draft before adding context. If the target changes during insertion, cancel with an explanation rather than inserting into another thread.

Disable Add selection when the selection is empty. Report unavailable editors, disconnected targets, or missing composer support clearly. Do not queue automatic insertion for an unknown future thread. Do not use or overwrite the system clipboard.

The first release may use a readable text block through normal composer input. Structured context chips are optional future work. Neither approach may submit automatically.

## Appearance and settings

Preserve T3's layout and controls. Match Obsidian background, foreground, accent, and font values through the theme adapter. React to theme changes. Respect reduced motion and readable focus indicators.

Do not hide advanced T3 controls by default. Broad UI removal and a compact mode are deferred until normal use identifies specific problems.

Keep plugin settings small:

- T3 server connection and connection reset.
- `Follow Obsidian appearance`, enabled by default.
- Read-only compatibility status and copyable diagnostics without credentials.

The current vault determines session scope automatically. No provider, model, token-budget, permission, MCP-server, or agent configuration pages belong in this plugin.

Recommend `obsidianmd/obsidian-skills` in onboarding with its purpose and current installation instructions. Do not install it or rewrite existing instructions automatically. A guided installer is outside the first release.

## Implementation architecture

Keep the plugin entry point small. Separate these responsibilities:

- **T3 view:** Obsidian pane lifecycle, guest creation, target restoration, and focus.
- **Connection:** origin validation, partition identity, server descriptor, and pairing state.
- **T3 adapter:** version-specific scope, file-action, composer, and theme integration.
- **Vault scope:** pure path-membership decisions from resolved thread and project metadata.
- **File navigation:** vault lookup, external-file compatibility, and editor placement.
- **Editor context:** capture, source labels, encoding, and draft insertion.

Use an Electron webview with context isolation, sandboxing, and web security enabled. Disable guest Node integration. Do not remove T3's CSP or frame headers. Do not imitate T3's full desktop bridge or expose arbitrary host execution.

The spike's bounded request queue proves a possible guest-to-host transport. A custom privileged preload is not a dependency. Validate origin and request shape on every operation. Navigation must invalidate stale integration work.

Prefer a narrow upstream semantic host hook. If the deployed T3 release lacks one, isolate version-specific integration in the T3 adapter. Do not rely on private React internals or edit T3's persisted store schema. Avoid a broad T3 fork.

The scope and real file-action hooks are the first implementation gate. If they require a small upstream patch, document and test that patch before proceeding. Do not claim the plugin works with an unmodified T3 release unless the acceptance tests prove it.

On an unsupported version, keep the guest unmounted until compatibility is established. Offer the ordinary T3 app as a fallback. Do not silently display unfiltered sessions or partially apply host actions.

## Verification and release gates

The spike proved primitives, not these complete user journeys. Each item below remains a release requirement.

1. Connect to the supported T3 release and resume an existing in-vault thread.
2. Send a prompt, observe streamed text and tool activity, answer a question, and handle a permission request through T3.
3. Exercise stop and continuation without duplicating a prompt after reconnect.
4. Switch threads, notes, and workspace layouts without losing drafts or stopping server work.
5. Verify each lifecycle list and action, including archived access, against the same thread in the reference T3 web UI.
6. Verify vault membership for root, nested directories, siblings, symlinks, outside worktrees, missing metadata, and remote paths.
7. Verify scope coverage in search, recents, archive, deep links, restored routes, project picker, and reconnect. Test an empty scope explicitly.
8. Click real T3 Markdown chips. Open vault and external files at the correct location. Edit and save the original file.
9. Test filenames with spaces, Unicode, `#`, and encoded characters. Missing files must not create notes.
10. Add a selection and an unsaved note to a nonempty draft. Preserve existing text and attachments. Verify that changing editors attaches nothing.
11. Exercise attachments, terminal, browser preview, and other workflows used in the reference web UI. Record any host restrictions explicitly.
12. Verify narrow panes, theme changes, keyboard focus, and normal editor shortcuts.
13. Disable and reload the plugin. Confirm cleanup, target restoration, credential handling, and compatibility failure behavior.

Use focused unit tests for path membership and context encoding. Use integration tests for real T3 hooks and Obsidian file saves. Compare the same workflows with the reference web UI. Source inspection alone does not pass a runtime gate.

## Implementation order

1. Scaffold the desktop plugin and dedicated ItemView. Host the supported T3 UI with a persistent per-vault partition.
2. Implement and test strict vault scope and real semantic file actions. Resolve any required upstream hook here.
3. Add explicit context commands and restore the current thread or draft with the workspace.
4. Add appearance synchronization, concise setup, and diagnostics.
5. Run the end-to-end acceptance scenarios and document supported versions and platforms.

Ship a first release only after its required journeys pass. Until then, describe it as a development build with explicit verification limits.
