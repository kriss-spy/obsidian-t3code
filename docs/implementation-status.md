# Development implementation status

Date: 2026-11-21. This is an incomplete development build. No supported embedded T3 build exists yet.

## Implemented foundation

- Desktop manifest, TypeScript build, and CI checks.
- Dedicated main-area ItemView, Open command, and ribbon button.
- Concurrent Open calls reuse one workspace. Windows are distinguished by their owning document.
- Canonical vault and server identities determine a dedicated persistent partition.
- Server-origin validation accepts HTTPS or loopback HTTP. It rejects credentials and pairing URLs.
- Descriptor parsing uses the running server version and protocol. It never invokes a CLI or accesses T3's database.
- Unsupported descriptors leave the guest unmounted and offer the normal T3 app.
- Connection reset clears only the current vault/server partition. It reports unavailable host session APIs.
- Plugin unload removes its guest and pane. Pending descriptor results cannot remount a closed view.
- Workspace serialization rejects pairing data. Full route restoration remains pending.
- Filesystem scope decisions resolve existing directories and symlinks. Missing metadata, remote identities, sibling paths, and outside worktrees are excluded.

The scope function is not connected to T3 lists yet. The guest constructor is implemented, but compatibility deliberately returns unsupported for every build. This prevents an unfiltered workspace from appearing during development.

The appearance preference is stored for the future adapter. Appearance synchronization is not implemented. Context commands, Markdown navigation, Use vault folder, and pairing inside an approved guest remain pending.

## Integration gate: issue #4 remains open

The live `/.well-known/t3/environment` descriptor reports server `0.1.11` and protocol `2`. It advertises no semantic Obsidian host contract.

Source inspected at upstream revision `13226b1c21b703e1ddce8bd1d60ae54bca85ab42`:

- `apps/web/src/components/chat/MarkdownFileLink.tsx` handles clicks through custom callbacks, including `handleOpenInFilePreview`. A navigation listener cannot intercept these actions reliably.
- `apps/web/src/state/shell.ts` exposes environment snapshot atoms. A host filter must also cover consumers outside the active sidebar, route loading, archive/search results, caches, and project selection.

This inspection is not runtime proof. The upstream revision is not established as the exact source revision of the installed server. An experimental patch is now included in `upstream/t3-0.1.11-obsidian-host-v1.patch`. It is not installed in the running app. Unmodified-T3 compatibility is not claimed.

The next implementation must add a narrow, versioned T3 host contract. Its required behavior is:

1. Select embedded mode before loading cached projects, threads, or restored routes. Render no workspace until the host scope is ready.
2. Accept only a verified local environment and canonical directory scope. Pass thread worktree and project root metadata through the same membership decision before rendering.
3. Apply the decision to search, recents, archive, lifecycle lists, route loaders, reconnects, and project choices. Empty scope must remain empty.
4. Emit semantic file actions from the real Markdown chip callback. Include environment ID, absolute path, line, column, modifier intent, and the current document generation. Preserve T3 behavior for unmatched remote or non-Markdown targets.
5. Bound requests and validate each shape and origin. Invalidate requests during navigation, reconnect, target changes, and teardown.
6. Identify a stable composer target before appending text. Do not submit prompts or modify attachments.
7. Pin the patch to an exact T3 revision. Test real chips and every scope entry point in the actual guest before adding that build to compatibility.

Do not enable the dormant guest path by changing `supported` to true. That would bypass the required scope handshake. Do not replace this gate with CSS, DOM label parsing, a synthetic event, or private React state.

## Verification evidence

`npm test`: eight passing tests cover origin policy, descriptor validation, partition identity, safe serialized targets, canonical scope, and platform directory boundaries. Filesystem fixtures include spaces, Unicode, `#`, inside/outside symlinks, absent paths, and an outside worktree. Windows path tests only verify path rules. They do not establish Windows runtime support.

The two workspace regression tests exercise the production plugin with a mocked Obsidian runtime. They cover overlapping requests from two windows, same-window deduplication, reverse completion order, and recovery after failure. Both fail against the original plugin-wide pending promise. Both pass after pending operations are keyed by the captured owner document. This follow-up did not rerun Obsidian GUI checks.

`npm run build`: TypeScript checking and production CommonJS bundling pass.

`node scripts/check-development-vault.mjs <CDP endpoint> <disposable vault path>` passed in an isolated Obsidian profile. The test refuses a vault whose exact path does not match its argument. The profile contained one disposable note and this plugin only. No personal notes were changed.

Observed runtime results on Linux Obsidian `1.15.1`:

```json
{
  "isolation": {
    "contextIsolation": true,
    "sandbox": true,
    "nodeIntegration": false,
    "webSecurity": true
  },
  "singleWorkspace": true,
  "unsupportedGuestUnmounted": true,
  "descriptorChecked": true,
  "credentialsNotPersisted": true,
  "partitionResetIsolated": true,
  "reset": "This vault connection was reset.",
  "reload": true,
  "diagnostic": "T3 0.1.11, protocol 2: no verified strict-scope host adapter. Guest not mounted."
}
```

The isolation test mounts only `about:blank` with the production guest constructor. Both `require` and `process` are undefined in the guest. This does not test the complete T3 UI.

The reset test creates a disposable cookie in the intended partition and another partition. Reset removes only the intended cookie. It does not prove real T3 pairing persistence.

All complete UI parity journeys in the spec remain unverified. No implementation issue is closed by this foundation. There is no release artifact or release approval.

## Pinned host implementation follow-up

The packaged app reports `t3codeCommitHash:59651c1761f6`. Upstream tag `v0.1.11` resolves to `59651c1761f6c63e9b6056839067066968e6a406`. The patch uses that exact base. This replaces the earlier unknown source identity for the installed version.

The patch adds an opt-in startup handshake, bounded request queue, shell snapshot projection, and a semantic call from the real `MarkdownFileLink` primary callback. `src/host-contract.ts` validates requests and computes canonical scope decisions. `src/host-bridge.ts` validates origin before and after guest evaluation and invalidates closed sessions. Neither module enables production guest mounting.

`npm test` passes 16 tests. Eight new tests cover host request validation, canonical verdicts, stale generations, origin changes, and the exact patched host module in a JavaScript VM. `npm run build` passes. `git apply --check` passes against the exact base files. These checks do not prove React behavior or an actual guest chip click.

The gate remains incomplete. Thread-family merging, older settled/search readers, direct detail routes, draft restoration, and reconnect need complete scope coverage. The transport still needs lifecycle wiring and verified local server identity. Real file navigation and full UI acceptance remain pending. See [the patch dependency and limits](../upstream/README.md).

The patched upstream checkout passes `pnpm exec vp run check:changed HEAD` and `pnpm --filter @t3tools/web build`. The changed-file run includes 11 upstream tests, type checking, format, lint, knip, and React compiler checks. The initial run failed on three patch defects; those defects were fixed before the passing run. Full upstream tests and Obsidian runtime acceptance were not run for this follow-up.
