# Extra-feature verification

This Linux development build uses Obsidian 1.15.1 and adapter `obsidian-host-v1.3`. Full release parity remains open under #10. No issue is closed by these checks.

The candidate was built in `/home/krisspy/.cache/obsidian-t3-extra-checkout` at exact upstream revision `59651c1761f6c63e9b6056839067066968e6a406`. Disposable data used `obsidian-t3-gate-1795243699122/extra-server` on port 39176. Tests did not modify CloudNotes, the active development server on 39173, or the normal server on 3773.

## Passed checks

- `npm test`: 33 tests pass. Coverage includes alias edits, canonical deduplication, Unicode normalization, directory boundaries, symlinks, missing directories, single-use reference tokens, malformed requests, stale routes, and project action races.
- `npm run build`: TypeScript and the normal plugin bundle pass.
- Upstream web typecheck and targeted lint pass. Production web and server builds pass with Node 26.13.1 and pnpm 12.14.0.
- Adjacent upstream web tests: 19 pass in `queries.filesystem.test.ts` and `FileBrowserPanel.browser.test.tsx`.
- The final patch applies to the exact revision in a disposable Git index.
- The packaged client verifies 21 entry/integration assets. Packaging also checks that the plugin contains the same approved client build and manifest digest.
- The [local plugin review](extra-feature-plugin-review.md) reports zero source errors. Its 21 warnings concern deliberate filesystem access and product/command capitalization. The review script still prints its existing numeric-summary parsing warning.

The normal plugin bundle, without test-only admission, passed [19 feature assertions](extra-feature-runtime.json). These exercise both native-open menus, same-group opening, external line 2, live alias edits and renames, Unicode, composer alias insertion, exact folder creation and reuse, reference insertion, attachment preservation, stale-target cancellation, and ordinary file drops. No prompt was submitted.

The same bundle passed the [scope regression assertions](extra-feature-scope-runtime.json). The guest retained sandboxing, context isolation, and web security with Node disabled. Included search results appeared; excluded results and routes stayed excluded. Reconnect did not expose an excluded row. The DOM observer recorded zero excluded-content observations.

An isolated index benchmark searched 20,001 entries in 11 ms and validated one matching file. This measures the in-memory metadata index and filesystem validation. It excludes Obsidian indexing, transport, rendering, and sustained large-vault use.

## Reproduce

Pair the disposable guest through the actual T3 form. Use the matching CLI with an explicit `--base-dir`. Do not use personal notes as fixtures.

```sh
node scripts/check-extra-features.mjs <loopback-CDP> <disposable-vault> <included-route> <evidence.json>
node scripts/check-supported-vault.mjs <loopback-CDP> <disposable-vault> <included-route> <excluded-route> <scope-evidence.json>
```

Both scripts guard the exact vault. The extra-feature script creates and edits only its named fixture notes and folders. It uses the rendered menus, normal project commands, and public host/composer hooks.

## Remaining evidence gaps

Reference-drop checks dispatch DOM `dragstart` in Obsidian’s right explorer and `drop` in the guest. They do not prove a physical drag crosses Electron’s webview boundary. Multi-selection, popout explorer dragging, and long-lived drag gestures need further runtime checks. These gaps keep #15 open.

A rapid full guest replacement while restoring a newly created draft once remained at the scope-checking view. The feature script uses normal back/forward navigation for changed-target testing. That passes and preserves text and attachments. Broader fresh-draft reload and crash ordering remain under #10.

The full upstream `check:changed HEAD` run failed. Format, lint, and server GraphQL checks passed. Knip and dependent-package typechecks reported missing/uninstalled packages in the filtered checkout. Test and React compiler setup could not load mobile’s `gt-react-native`. This is not a clean full run.

No complete reference comparison was run for agent questions/permissions, stop/continue, extended terminal/browser workflows, or all lifecycle transitions. Other operating systems and remote path mappings remain unsupported. No verified theme mapping is enabled; see [theme requirements](../theme-mappings.md).
