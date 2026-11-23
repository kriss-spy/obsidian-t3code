# Issue 29: tab activation resets the chat

The fix preserves the mounted chat when the user returns from an Obsidian note.
It is prepared locally. The component release has not been published.

## Cause

The issue recording shows `Checking vault session scope…` after tab activation.
The embedded document receives a visibility event when its Obsidian tab becomes active.
The ordinary web foreground event restarts shell subscriptions.
That moves the shell into synchronization and invalidates host scope decisions.
The thread gate then unmounts the chat until the host approves it again.

The reproduction kept the same webview and document but replaced the composer.
No guest navigation, renderer failure, or plugin reconnect occurred.
The runtime assertion failed with `Tab activation must preserve the mounted composer.`

## Change

The embedded client emits `application-active-check` when it becomes visible.
The connection supervisor uses the existing foreground probe timeout and retry behavior.
The event also retains account refresh behavior, but it does not restart shell subscriptions.
Ordinary web clients retain their original foreground event.

Failed connection probes still reconnect.
The existing host scope invalidation on actual reconnects remains in place.
No scope approvals are cached across reconnects by this change.

## Verification

Checked on Linux with Obsidian 1.15.1 and the isolated T3 0.1.11 fixture.
The disposable vault was `/home/krisspy/.cache/obsidian-t3-gate-issue17/vault`.
The personal vault was not changed.

- `node scripts/check-tab-activation.mjs http://127.0.0.1:39287 /home/krisspy/.cache/obsidian-t3-gate-issue17/vault`: failed on the original client, then passed on the final rebuilt client.
- Five switches, with 2.2 seconds on a note before each return: same document, same composer, zero scope-check flashes.
- `npm test`: 83 passed, including scope invalidation and stale-verdict rejection.
- `npm run build`: passed.
- Upstream `vp test run src/connection/wakeups.test.ts src/connection/supervisor.test.ts`, from `packages/client-runtime`: 93 passed. This includes a failed probe for the new event followed by successful reconnection.
- Upstream `effect-tsgo tsc --noEmit -p apps/web/tsconfig.json`: passed. It reports existing Effect schema suggestions.
- Focused upstream lint: passed for the five changed connection files.
- Upstream web build: passed with chunk-size warnings.
- The full patch applies to a clean archive of pinned revision `59651c1761f6c63e9b6056839067066968e6a406`.
- Built source maps match the modified platform, supervisor, and wakeup modules.
- Component installation verified the packaged hashes in the disposable vault.
- `git diff --check`: passed.

An initial test build used shared dependency links to another checkout.
Those links were corrected before the final build, type check, packaging, and runtime check.

## Release artifact

The required component archive is `dist/components/t3-core-0.1.2.json.gz`.
Its SHA-256 is `3714d9ae88299db516f648fc0249cb8fe4add0b8fb4b809af0c083cc47cb5ffc`.
The plugin pins it under release tag `components-0.1.2-tab-activation`.
Publish that archive before distributing the rebuilt plugin.
The optional fonts retain their existing release URL and hash.

Windows and macOS runtime behavior were not checked for this change.
