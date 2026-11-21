# Kickoff recommendation

Date: 2026-11-21. This is a research recommendation, not a tested implementation.

Update: the [technical spike](technical-spike.md) now records successful desktop hosting, read-only pairing, composer insertion, theme injection, external-file saves, and a synthetic file-open bridge. It supersedes the initial verification status below. Full web UI parity remains unverified.

## Recommended starting point

Preserve T3 Code's UI and existing setup. Build the Obsidian integration around it. The user's clarification makes this the preferred direction, subject to proving the host mechanism.

Study [t3-obsidian](https://github.com/7bgsbm749g-boop/t3-obsidian) for integration code and failure cases. Adopting its native conversation UI is not the default recommendation.

It is an existing MIT-licensed community plugin. Its documented workflows include T3 connections, note and selection context, streamed replies, project links, and browsing project files. It requires Obsidian 1.13.0 or later and T3 Orchestrator v2. [README](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/main/README.md), [license](https://github.com/7bgsbm749g-boop/t3-obsidian/blob/main/LICENSE).

Its note-first workflow may differ from the requested session-first workspace. Existing functionality does not establish full web UI parity.

The first decision is how to host the T3 UI and provide explicit file-open and editor-context hooks. Defer a replacement conversation client.

Two source findings need particular attention. The existing thread picker excludes archived threads. Its file editor uses virtual files and patches Obsidian methods. Neither behavior establishes the requested lifecycle access or a stable external-file API. See the existing-integration report for pinned source links.

## Proposed product direction

Use T3 Code as the owner of sessions and execution. Add Obsidian navigation and editor context around those sessions.

Accepted defaults: one T3 workspace tab, a session list scoped to the vault directory tree, and explicit context commands. Editor changes must not automatically attach a note. Scope filtering belongs to this Obsidian client and must not change thread visibility in the user's other T3 clients.

Source inspection confirms a built-in multi-project sidebar scope, but not an automatic vault-directory filter. A strict directory filter needs a versioned integration hook, including search and archived lists. T3 can widen its project scope when navigating to an outside thread; the adapter must account for that behavior. This filter is not yet implemented.

The default workspace should make these actions easy:

- Find an existing session and see whether it needs attention.
- Move between recent, working, snoozed, settled, and archived views using T3's actual semantics.
- Send the active note or selection with visible context.
- Open a referenced Markdown file in the Obsidian editor.
- Return from the editor to the same session and draft.

These are proposed requirements from the product brief. They are not verified behavior of an existing plugin.

Keep advanced T3 controls accessible. A reduced note-focused mode must not silently remove permissions, tools, provider settings, or session actions.

## First implementation phase

1. Pin the installed T3 version and record the current web viewer baseline.
2. Prove hosting the full T3 UI in a dedicated Obsidian development vault.
3. Prove explicit Markdown navigation and editor-context hooks.
4. Test vault files and external local files.
5. Identify a separate policy for remote files that do not exist locally.
6. Reuse existing plugin modules only where they simplify these integration tasks.

The parity audit must include streaming, tool activity, permissions, questions, stop/resume, drafts, session lifecycle, attachments, models, subagents, and advanced tools the user depends on.

For any full web UI embedding option, first verify the host mechanism. Current upstream blocks iframe embedding. Do not base the plugin on an assumed iframe integration. See the T3 architecture research for source evidence.

Test an isolated Electron guest view with a semantic file-open bridge as the first hosting candidate. This is not a confirmed Obsidian integration. The shared T3 client runtime is private workspace code, so a separate native client would also require protocol and dependency maintenance.

## Appearance and setup

Follow Obsidian theme variables, typography, pane sizes, and keyboard behavior. Start with reversible display changes that preserve access to advanced controls.

Plugin settings should cover the Obsidian connection and integration behavior only. Keep provider authentication, model configuration, permissions, and agent setup in T3. Prefer useful defaults over additional configuration pages.

Recommend [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills) during setup. The former `kepano/obsidian-skills` repository redirects there. Verify provider-specific installation paths before adding an installer. Show what an installation changes.

## Research files

- [T3 Code foundations](research/t3code-foundations.md)
- [Obsidian AI chat precedents](research/obsidian-ai-chat.md)
- [Existing T3 integrations](research/existing-t3code-integrations.md)
- [User priorities and acceptance scenarios](product-brief.md)

## Verification status

The kickoff uses documentation, source inspection, and local installation metadata. No plugin was installed, built, or run. Web UI parity and external-file editing remain unverified.
