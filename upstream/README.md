# Pinned T3 host patch

This development adapter requires the patch in `t3-0.1.11-obsidian-host-v1.patch` and the matching compiled client. Unmodified T3 stays unsupported. See [installation](../docs/development-install.md) and [verification limits](../docs/implementation-status.md).

## Exact source and artifact

The installed 0.1.11 AppImage identifies `t3codeCommitHash:59651c1761f6`. Upstream tag `v0.1.11` resolves to full revision `59651c1761f6c63e9b6056839067066968e6a406`. This is the patch base.

The approved adapter is `obsidian-host-v1.4`, protocol 1. Its client manifest SHA-256 is `4b62ec4b552cdf61540eaba740ee29c7c7327f0a3542737ebe53eed3b43ac8d8`. The plugin verifies the served entry document and compiled integration assets before creating a guest. It then performs the complete host handshake. Declared capability strings alone cannot enable a client.

Apply the patch only in a clean exact-revision checkout:

```sh
node scripts/check-upstream-patch.mjs /absolute/T3/checkout --check
node scripts/check-upstream-patch.mjs /absolute/T3/checkout --apply
```

Use the preparation script from the extracted development ZIP for a complete trial installation. It builds the server and copies the verified client. Rebuilding the web client can change its hashes and needs another integration gate run. Never overwrite the approved digest merely to make a rebuilt client load.

## Contract

`?obsidian-host=1` selects embedded mode before services start. Ordinary clients retain their original path. Embedded startup waits for `window.t3ObsidianHostV1.initialize` with an independently verified environment identity and a document generation.

A nonce file proves shared filesystem access. A keyed Linux machine-identity response rejects a remote server that merely shares mounted files. The challenge file is private, opened without following symlinks, read through one descriptor, and removed after verification. Detection never invokes a CLI or opens a T3 database.

The public bounded queue allows eight outstanding operations with ten-second timeouts. Scope reads wait for a slot instead of caching saturation as exclusion. Every request/reply carries the document generation. The plugin checks origin before and after asynchronous evaluation. Navigation, reconnect, and teardown invalidate stale work. Pairing document redirects remove the old guest before mounting a new marked document.

Canonical verdicts apply before rendering. Independent entry points include the shell projection, merged thread families, detail reads, older settled/search rows, archived RPC snapshots, routes, drafts, side chats, linked-thread suggestions, notifications, project choices, first-run import choices, and scratch-workspace choices. Unknown and pending rows stay excluded. Scope epochs invalidate old approvals. Empty scope stays empty. Owning metadata can resolve an eligible worktree without exposing its outside parent project as a choice.

The actual MarkdownFileLink primary callback resolves its absolute semantic file path and asks the host before normal T3 callbacks. It preserves environment, line, column, modifier intent, and requesting route. Remote, non-Markdown, timed-out, or declined requests retain T3 behavior. Stale route responses cannot navigate a replacement target.

The composer hook registers the existing public composer handle. Explicit host requests append through that handle without private React access. Embedded draft writes flush through T3's normal persistence layer before guest destruction. Ordinary clients retain debounced writes. A normal new-thread handler can prepare an in-scope composer if none exists. Scope decisions do not change server visibility, tags, or database schemas.

The v1.4 contract retains a filesystem-only Markdown eligibility check for both native-open menus, canonical alias-result merging from the metadata cache, an explicit canonical-folder project action, and single-use explorer-reference drops. Composer ownership uses a stable reference so attachment processing cannot cancel a valid same-target drop. Requests retain generation and route checks. Project creation waits for scope approval before opening its draft.

## Evidence and remaining work

The exact patch module and proof endpoint execute in focused tests. The production plugin also passed real Obsidian guest chip clicks, file saves, scope/reconnect assertions, project/search/recents/archive checks, pairing, explicit context, and reload checks. See the [recorded evidence](../docs/implementation-status.md).

Current changed-file checks and runtime evidence are recorded in the release assessment. The full upstream test suite and complete reference UI parity remain unverified. This patch is a development dependency, not an official upstream release.

The explorer drag adapter now uses a host-side composer drop target. It captures the intended route before dragging, reveals that workspace only after a drag starts, and checks the public composer registration before insertion. Alias matches are merged before truncation, and initial metadata resolution refreshes the index once. See [repair evidence](../docs/verification/extra-feature-repair.md).
