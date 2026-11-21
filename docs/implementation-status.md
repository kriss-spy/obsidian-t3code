# Development implementation status

Date: 2026-11-21. A Linux development build is available to try. It requires the pinned T3 patch and matching compiled client. This is not a release or a full T3 parity claim.

See [installation](development-install.md), [runtime assertions](verification/linux-development-runtime.json), and [local plugin review](verification/plugin-review.md).

## Implemented

The ItemView now hosts the real T3 web UI. Pairing uses T3's own form and a persistent vault/server partition. The plugin never starts a backend or invokes the standalone CLI.

Admission requires server 0.1.11, protocol 2, a nonce proof of the same local filesystem and Linux machine identity, and a pinned client manifest. The plugin hashes the served entry document and 17 integration/entry assets before creating the guest. It then requires the complete versioned scope handshake. A copied capability declaration cannot approve another client. The unmodified running server remains unmounted.

The patched client starts empty in embedded mode. Canonical host verdicts filter raw shell snapshots, merged thread families, archived RPC results, search matches, project choices, draft membership, and route loading. Pending and remote identities remain empty. Owning project metadata stays available for an eligible worktree without making the outside project a new-thread choice. Epochs invalidate approvals on reconnect. Conflicting active/archive metadata is excluded.

The real MarkdownFileLink callback sends semantic environment/path/line/column/modifier requests. Native navigation resolves existing files, reuses editors, opens external Markdown through an isolated `file:` adapter, and applies bounded cursor positions. Missing files show a notice without creating a note. Stale route requests cannot open a different target.

Explicit note commands and editor-menu actions capture in-memory content before changing focus. The public composer handle appends readable source context and focuses the composer. Existing text and attachments remain. No clipboard writes, saves, or submissions occur in the command implementation. If no composer exists, the normal T3 new-thread action opens a known in-scope draft. Target changes cancel insertion.

Safe thread/draft routes restore through workspace and plugin lifecycle changes. Pairing data is excluded from saved fields. Appearance follows Obsidian colors and font values, updates live, and can be removed. Settings contain connection/reset, appearance, diagnostics, and the official agent-skills recommendation.

## Runtime evidence

All checks used disposable development vaults and separate T3 data. No personal notes or live database were edited. The installed Obsidian app was 1.15.1 on Linux Flatpak, installer 1.15.0. The patched source was `59651c1761f6c63e9b6056839067066968e6a406`.

| Scenario | Observed result |
| --- | --- |
| Actual supported guest | `require` and `process` unavailable; sandbox, context isolation, web security enabled; Node integration disabled |
| Real agent conversation | Two completed Codex turns returned actual vault/external Markdown links |
| Actual chip clicks | Unicode/space/encoded-`#` vault file opened; external original opened at line 2; modifier click created another editor |
| Original file saves | Both disposable original files edited and saved through Obsidian |
| Scope | Included conversation rendered; excluded saved route showed a scope explanation; reconnect stayed blocked |
| Search and project choices | Positive included search matched; excluded search returned no rows; only in-vault project choices appeared |
| Archive reference comparison | Normal T3 archive showed the sibling thread; embedded archive showed no archived threads |
| Recents | Command palette showed the included recent thread without the sibling project/thread |
| Initial pairing redirect | Old guest removed before replacement; observed excluded-content count remained zero |
| Empty vault | First-run project scan exposed no unrelated projects; exact path and Use vault folder appeared; explicit action opened an in-scope draft |
| Setup filesystem | Empty vault gained no `.git`, `AGENTS.md`, or provider configuration |
| Context | Selection and unsaved note appended to nonempty composer; text and file attachment remained; focus moved to composer; clipboard unchanged; no prompt submitted |
| No active composer | Explicit insertion opened a vault-project draft and appended once |
| Reload | Guest removed on disable; same draft route and unsent text returned after enable |
| Concurrent Open | Six overlapping Open calls produced one workspace |
| Appearance | Light and dark backgrounds matched Obsidian; disabling synchronization restored T3 black background |
| Unmodified server | Actual 0.1.11/protocol-2 server rejected with no guest and a normal-app fallback |

`scripts/check-supported-vault.mjs` repeats the production guest, real-chip, search, project-choice, restored-route, reconnect, DOM-observation, and duplicate-Open assertions. It refuses any vault outside the disposable fixture naming convention. The committed JSON records a passing production run. Additional manual CDP checks are listed above; they are not all automated by that script.

## Source and build checks

- `npm test`: 28 passing tests. These cover path identity, context encoding, local proofs, executable integrity, stale requests, exact patch contract behavior, scope epochs, conflicting metadata, and per-window Open races.
- `npm run build`: TypeScript and CommonJS bundle pass.
- `node scripts/check-upstream-patch.mjs /tmp/obsidian-t3-patch-check --check`: patch applies to a clean exact-revision checkout.
- Upstream `pnpm exec vp run check:changed HEAD`: format, lint, both knip passes, GraphQL, four-package typecheck, 34 adjacent test files, and 29 React compiler checks pass. This is not the full upstream test suite.
- Patched server and web production builds pass. The source checks used the available pnpm 11.25.0 tooling. The packaged preparation script also passed in a fresh checkout with the exact pinned Node 26.13.1 and pnpm 12.14.0. It cloned the base, applied the patch, installed dependencies, built the server, and verified the copied client assets.
- Local Obsidian review: zero source errors. Warnings concern deliberate filesystem access and specified product names/command labels. The report script also printed a numeric-summary parsing warning; the individual report is committed.

The client manifest SHA-256 is `cc9349a098cbd359dbf693c09b308d78789b2a1034ed08f55dedcd040b098968`. `src/approved-client.ts` admits only this exact artifact. The package includes it without source maps and retains T3's license and third-party notices.

## Release blockers

Issue #10 remains open. The complete reference comparison has not covered question/permission prompts, streamed tool activity, stop/continue through reconnect, terminal execution, browser preview, every lifecycle ordering transition, or all pane/crash cases. Do not claim full parity or publish v0.1.0 until these pass.

Canonical membership fixtures cover root/nested paths, prefix siblings, symlinks, outside worktrees, missing metadata, and remote identities. Those unit checks do not establish runtime support for remote servers or other operating systems. Linux is the only development target.

The required source patch is broader than the initial shell-only experiment because T3 has independent readers for archives, thread families, drafts, onboarding, and routes. It changes no database schema and remains opt-in for embedded clients. It is not an official upstream T3 release.
