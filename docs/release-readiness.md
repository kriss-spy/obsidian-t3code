# Stable release assessment

Date: 2026-11-22. Decision: **do not publish a stable release yet**.

The Linux candidate is reviewable and installable. The [rc.3 HTTP link repair](verification/http-links.md) addresses the reported system-browser failure. The [rc.2 menu update](verification/obsidian-menu.md) adds the shorter Obsidian label and gem icon. Use the [manual checklist](user-test-checklist.md) for the next user pass. Required reference comparisons remain incomplete. The candidate archive is `dist/obsidian-t3code-0.1.0-rc.3-linux.zip`. Its metadata explicitly blocks stable publication. No release, tag, PR, or merge was created by this review.

## Reviewed scope

Reviewed all 18 plugin source modules, every file in the pinned upstream patch, build/install/package scripts, regression tests, workflows, specifications, and current verification reports. Historical spikes are feasibility records, not production verification. PR #18 remains based on #13; neither has been merged. Both had passing CI at the inherited heads. Those checks do not cover this candidate's changes.

The review covered origin validation, pairing-state persistence, the local filesystem proof, executable admission, scope filtering, semantic file actions, aliases, explicit references/context, lifecycle cleanup, appearance, settings, and distribution. This is a source review plus focused runtime verification, not certification of all upstream T3 behavior.

## Findings fixed

| Finding | Change | Evidence |
| --- | --- | --- |
| Immediate guest replacement loses draft text; a new draft can remain at the scope screen | Embedded draft writes now flush synchronously. Destroying an Electron webview does not reliably deliver T3's `beforeunload` handler. Ordinary T3 clients retain debounced persistence. | Store regression failed before the fix. Production lifecycle check preserves a fresh route and text through immediate reconnect, tab close, and disable/enable. |
| More than eight draft scope requests can permanently exclude valid drafts | Full request slots leave rows pending. Completed scope requests trigger the next batch, without caching queue saturation as a negative verdict. | Twelve-draft regression failed before the fix. Production fixture contains more than eight draft sessions. |
| Unload removes the user's workspace tab | Disconnect guests and let Obsidian retain the leaf for restoration. | Unload regression and actual disable/enable check. |
| Overlapping font updates can leave stale styles | Discard superseded stylesheet handles and read styles from the owning window. | Deferred-completion regression failed before the fix and passes afterward. |
| Changing server/resetting storage retains the old view route | Reset each view's route explicitly for those actions. Ordinary reconnect retains its target. | Focused reconnect regression. Actual reset behavior still needs its complete dedicated runtime gate. |
| SDK dependency audit reports vulnerable Moment versions | Pin Obsidian SDK 1.14.4, which uses Moment 2.31.0. Runtime minimum remains Obsidian 1.15.1. | `npm audit`: zero findings in this plugin dependency tree. This does not audit the upstream dependency tree. |
| Package identity and installation evidence can become stale | Derive archive names from version/label, include candidate metadata, hash every packaged file, and provide a verifier. Repair the old reset fixture's field whitelist and partition delimiter. | Extracted-package and tamper checks recorded in the candidate evidence. The repaired unsupported-server script was inspected, not rerun in this gate. |
| Deprecated settings API after the SDK update | Use current settings definitions, including searchable setting names and a diagnostic field. | Actual settings panel renders all six rows; local plugin review has zero source errors. |
| Missing license/compatibility mapping | Add the user-selected MIT license and `versions.json`. Retain upstream T3's license and bundled notices separately. | Package metadata and archive checks. |

## Fresh verification

See [candidate evidence](verification/stable-candidate-checks.json), [lifecycle assertions](verification/stable-candidate-lifecycle.json), [scope assertions](verification/stable-candidate-scope.json), [picker assertions](verification/stable-candidate-picker.json), [settings panel](verification/stable-candidate-settings.json), and [local plugin review](verification/stable-candidate-plugin-review.md).

- All 41 plugin tests and the TypeScript/production build pass.
- The exact patch applies to a clean checkout of the pinned revision.
- Upstream format, lint, both unused-code checks, GraphQL, affected-package types, and React compiler checks pass. The rc.2 adjacent run passed 667 tests and timed out on two browser clicks across 45 files. The errors occurred in the sidebar shift guard and scheduled-task deletion tests. Both failed files subsequently passed in isolation: 16 tests. The original timeouts remain recorded; this is not a passing full-run result. Full repository suites were not run.
- The rc.3 HTTP repair passes 53 targeted web tests, targeted lint, and web typechecking. It does not replace the recorded rc.2 broad-run results.
- The patched web production build passes. It reports existing large-chunk warnings.
- The normal production plugin, without a test admission override, passes immediate lifecycle, strict scope, native Markdown chip, reconnect, duplicate-Open, and 200-result alias-picker checks.
- Guest sandboxing, context isolation, and web security remain enabled. Guest Node integration remains disabled. Excluded-content observations remain zero in the scope gate.
- Tests use a disposable vault/profile and isolated server data on 39176. CloudNotes, its server/data on 39173, and normal T3 on 3773 were not modified.

The approved client remains contract `obsidian-host-v1.4` at upstream revision `59651c1761f6c63e9b6056839067066968e6a406`. The new manifest SHA-256 is `dc2fe4490e9f702a1667942868eb3b7fba604b6edf297c9b10b9c407547627dc`, covering the entry document and 23 JavaScript assets. It supersedes the development.5 client. Rebuilding a client requires renewed runtime admission checks.

## Gates still blocking stable publication

| Required gate | Evidence still required |
| --- | --- |
| Agent execution | Same-thread reference comparison of streamed text/tool activity, question answers, permission handling, stop/continue through reconnect, and no duplicate sends. |
| Lifecycle lists and ordering | Active, pinned, Working, Snoozed, Settled, archive, and restored navigation across each state transition. Include active-run closure, renderer crash, and multiple Obsidian windows. The new draft fix closes the reproduced cases, not this whole matrix. |
| Complete attachment/input behavior | File chooser, image paste, attachment restoration/removal, native file drops, and physical OS mouse release for explorer references. Earlier Chromium drag delivery is not an OS release test. |
| Terminal/browser/diff workflows | Full terminal keyboard/clipboard/resize behavior; preview forms, navigation, focus, downloads/popups; disposable Git/diff/worktree workflows. Earlier basic preview/terminal success is partial evidence. |
| Settings and failure paths | Actual connection reset isolation after the route fix, unsupported/unmodified servers, failed authentication, server loss, stale operations, and crash recovery. Unit/source checks do not replace the remaining GUI checks. |
| Responsive and performance behavior | Narrow panes, keyboard/menu accessibility, large drafts/attachments, and large-vault search. Immediate embedded persistence adds synchronous serialization work; measure it with realistic large drafts before approving stable use. |
| Final installation rehearsal | Re-extract the final archive on a clean machine, run its server preparation script with exact Node/pnpm versions, pair in a fresh vault, and complete the required journeys. Earlier preparation success belongs to an older patch. |

Windows, macOS, mobile, and remote filesystem mapping remain outside the supported candidate. They are not additional platforms promised for this launch. Verified theme-name mapping remains optional and disabled; T3 owns its colors.

## Candidate handling

Use [development installation](development-install.md). Validate the ZIP's companion SHA-256, extract it, then run `node scripts/verify-candidate.mjs /absolute/extracted/candidate` from the extracted bundle. This detects accidental changes; it is not a signature or provenance attestation. Keep the matching plugin/client pair together.

Keep the trial server's explicit data directory separate from the user's normal environment. The plugin never starts a backend, initializes Git, or installs agent instructions. Vault scope is a local display filter, not an agent filesystem permission boundary. Pairing remains in the guest partition. Do not copy its tokens into diagnostics or plugin JSON.

To roll back, disable the plugin and restore the previous matched plugin/client pair. Preserve `data.json` and the browser partition unless intentionally resetting the connection. There are no plugin database migrations. Do not run two T3 server versions against the same data directory.

Before publication, pass every remaining required gate, regenerate the candidate evidence for the exact final bytes, and complete the install rehearsal. Publishing, tagging, merging, and community-directory submission require a separate user instruction.
