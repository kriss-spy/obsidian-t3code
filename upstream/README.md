# Pinned T3 host patch

This adapter requires the client-only patch in `t3-0.1.11-obsidian-host-v1.patch` and the matching compiled client. The plugin hosts this client locally and connects to an unmodified T3 server. See [installation](../docs/development-install.md).

## Exact source and artifact

The installed 0.1.11 AppImage identifies `t3codeCommitHash:59651c1761f6`. Upstream tag `v0.1.11` resolves to full revision `59651c1761f6c63e9b6056839067066968e6a406`. This is the patch base.

The adapter is `obsidian-host-v1.6`, protocol 1. Its client manifest SHA-256 is `49f803c90a42f186b297a99db4e9e3cb38e389f4ffef272434a71048cb32c54b`. The plugin verifies its installed component files and performs the complete host handshake. Declared capability strings alone cannot enable a client.

Apply the patch only in a clean exact-revision checkout:

```sh
node scripts/check-upstream-patch.mjs /absolute/T3/checkout --check
node scripts/check-upstream-patch.mjs /absolute/T3/checkout --apply
```

Build and package the client using the [development guide](../docs/development-install.md). Rebuilding it changes its hashes and requires fresh component archives and verification. Do not patch the running server.

## Contract

`?obsidian-host=1` selects embedded mode before services start. Ordinary clients retain their original path. Embedded startup waits for `window.t3ObsidianHostV1.initialize` with an independently verified environment identity and a document generation.

A fresh nonce in the vault proves shared filesystem access through T3's authenticated file-reading API. Linux also compares `/etc/machine-id`. Windows and macOS read a second fresh nonce in the host user's temporary directory, so mounting only the vault on a remote server is insufficient. Both temporary challenges are removed after success or failure. The guest receives paths, never the expected nonce values. Detection never invokes a CLI or opens a T3 database.

The public bounded queue allows eight outstanding operations with ten-second timeouts. Scope reads wait for a slot instead of caching saturation as exclusion. Every request/reply carries the document generation. The plugin checks origin before and after asynchronous evaluation. Navigation, reconnect, and teardown invalidate stale work. Pairing document redirects remove the old guest before mounting a new marked document.

Canonical verdicts apply before rendering. Independent entry points include the shell projection, merged thread families, detail reads, older settled/search rows, archived RPC snapshots, routes, drafts, side chats, linked-thread suggestions, notifications, project choices, first-run import choices, and scratch-workspace choices. Unknown and pending rows stay excluded. Scope epochs invalidate old approvals. Empty scope stays empty. Owning metadata can resolve an eligible worktree without exposing its outside parent project as a choice.

The actual MarkdownFileLink primary callback resolves its absolute semantic file path and asks the host before normal T3 callbacks. It preserves environment, line, column, modifier intent, and requesting route. Remote, non-Markdown, timed-out, or declined requests retain T3 behavior. Stale route responses cannot navigate a replacement target.

The composer hook registers the existing public composer handle. Explicit host requests append through that handle without private React access. Embedded draft writes flush through T3's normal persistence layer before guest destruction. Ordinary clients retain debounced writes. A normal new-thread handler can prepare an in-scope composer if none exists. Scope decisions do not change server visibility, tags, or database schemas.

The v1.4 contract retains a filesystem-only Markdown eligibility check for both native-open menus, canonical alias-result merging from the metadata cache, an explicit canonical-folder project action, and single-use explorer-reference drops. Composer ownership uses a stable reference so attachment processing cannot cancel a valid same-target drop. Requests retain generation and route checks. Project creation waits for scope approval before opening its draft.

## Evidence and remaining work

The exact patch module and proof endpoint execute in focused tests. The production plugin also passed real Obsidian guest chip clicks, file saves, scope/reconnect assertions, project/search/recents/archive checks, pairing, explicit context, and reload checks. See the [recorded evidence](../docs/implementation-status.md).

Current changed-file checks and runtime evidence are recorded in the release assessment. The full upstream test suite and complete reference UI parity remain unverified. This patch is a development dependency, not an official upstream release.

The explorer drag adapter now uses a host-side composer drop target. It captures the intended route before dragging, reveals that workspace only after a drag starts, and checks the public composer registration before insertion. Alias matches are merged before truncation, and initial metadata resolution refreshes the index once. See [repair evidence](../docs/verification/extra-feature-repair.md).

Embedded HTTP/HTTPS system-browser actions use the bounded host queue and Obsidian’s native opener. Plain system-directed Markdown clicks and Ctrl/Cmd-clicks use this path. The host validates URLs, document generation, environment, and route. Scope checks leave two request slots for file eligibility and explicit user actions. Guest popups stay disabled.
