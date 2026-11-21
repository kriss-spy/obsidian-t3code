# Experimental T3 host patch

This patch is implementation work for issue #4. It does not pass the integration gate yet. Do not install it over a live T3 AppImage or approve it in the plugin compatibility table.

## Source identity

The running Linux AppImage's `resources/app.asar/package.json` contains:

```json
{"version":"0.1.11","buildVersion":"0.1.11","t3codeCommitHash":"59651c1761f6"}
```

`git ls-remote https://github.com/pingdotgg/t3code.git refs/tags/v0.1.11` resolves to `59651c1761f6c63e9b6056839067066968e6a406`. The patch targets that full revision. The previously inspected main revision is not its base.

## Apply in an isolated source checkout

1. Fetch tag `v0.1.11` from `https://github.com/pingdotgg/t3code.git`.
2. Check out `59651c1761f6c63e9b6056839067066968e6a406`.
3. Run `node scripts/check-upstream-patch.mjs /absolute/T3/checkout --check` from this plugin repository.
4. Run the same command with `--apply` to apply the patch.
5. Use T3's pinned Node and package manager versions from its `package.json` to install dependencies and build the web client.

The patch changes the web client. A descriptor capability flag cannot install it. A complete integration will require the patched web bundle to be served by the target T3 installation. Rebuilding this Obsidian plugin alone cannot provide the T3 hooks.

Use a disposable T3 data directory for runtime checks. Do not start a test backend against `~/.t3/userdata`. This repository's patch installer neither invokes T3 nor opens its database.

## Implemented contract

Embedded mode requires `?obsidian-host=1` before application startup. Ordinary clients keep their existing path. Embedded startup waits for `window.t3ObsidianHostV1.initialize`. The host supplies a document generation and an independently verified local environment identity. A server descriptor alone does not establish local filesystem identity.

Requests use a bounded queue with eight outstanding operations and ten-second timeouts. `drain` and `reply` carry document generations. The plugin transport checks guest origin before and after asynchronous JavaScript execution. Closing the transport invalidates the host session.

The initial shell snapshot projection requests canonical membership decisions for project and thread metadata. Pending decisions expose empty arrays. Changed worktree metadata requires a new decision. The host resolves filesystem identities through `threadScope`. Remote identities receive no approvals. Empty approvals stay empty.

The actual `MarkdownFileLink` primary callback calls the semantic hook before its normal custom actions. It supplies environment, absolute target path, line, and modifier intent. Remote, relative, non-Markdown, timed-out, and declined requests use the existing T3 actions. This patch targets the Linux gate; Windows absolute paths remain unsupported.

## Missing coverage and checks

- Thread families can add raw rows after the shell snapshot projection. Those rows still need the same scope hook.
- Older settled pages and search results have separate readers. The current patch does not prove their coverage.
- Thread detail loading and restored routes can bypass shell membership. They must be guarded before mounting `ChatView`.
- Draft restoration, project choices, recents, scope widening, and reconnect need complete runtime coverage.
- Project records needed to resolve an included worktree must remain available without exposing out-of-scope new-thread project choices.
- The bridge is implemented but intentionally not connected to the production view. File navigation and lifecycle polling remain unwired.
- The actual Obsidian guest and real chip clicks have not passed.

`npm test` executes the exact host module extracted from the patch in a JavaScript VM. It checks startup waiting, pending and empty scope, metadata changes, remote fallback, semantic request fields, queue bounds, timeouts, and ordinary-client behavior. It does not mount React, run T3, or establish UI parity.

All compatibility results remain unsupported. Issues #1 through #10 remain open. The patch is not a distributable supported T3 build.

`pnpm exec vp run check:changed HEAD` passes in the patched upstream checkout. It covers format, lint, both knip passes, type checking, 11 adjacent tests, and React compiler checks. `pnpm --filter @t3tools/web build` also passes. Neither command runs the full T3 test suite or verifies a guest session.
