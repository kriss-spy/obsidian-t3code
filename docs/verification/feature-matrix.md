# Embedded T3 feature checks

This matrix tracks features that can break in an isolated Obsidian guest. A visible control is not a passing workflow. Compare the same server, thread, and action with the normal T3 web UI. Use disposable data for writes and commands.

| Feature | Required check | Current scope |
| --- | --- | --- |
| Pairing | Correct server identity, real form, persistent partition, full-document redirects | Passed in prior development gate; repeat after connection changes |
| Scope | Loading/empty, lists, search, recents, archive, projects, drafts, restored routes, reconnect | Focused and actual checks recorded separately; every lifecycle ordering case remains open |
| Markdown preview | Plain click stays in T3, correct file and thread, no native editor | First-feedback runtime check |
| Native Markdown | Ctrl/Cmd-click and explicit menu action; canonical originals; placement, cursor, stale route | First-feedback runtime check |
| Tab lifecycle | Same-group return, unsent text/attachments, hidden tabs, reload, closing notes | Repeat after the placement change; crash/active-run cases remain open |
| Themes | Change themes in T3; compare chat/composer/sidebar/menu/preview colors; light/dark; optional host font | First-feedback runtime check; no palette override allowed |
| Responsive layout | Narrow/wide widths, each sidebar/panel, focus indicators, accessible menus | Check actual controls; source inspection is insufficient |
| Agent execution | Stream text/tool output, questions, permissions, stop/continue, reconnect without duplicated send | Release blocker until full reference comparison passes |
| Attachments | File chooser, native file drop, image/paste, previews, removal, existing draft preservation | Basic attachment/context check passed previously; full drag/drop matrix remains open |
| Terminal | Open PTY, render output, type/paste, resize, selection/copy, Ctrl+C, close/reopen | Executed a fixture command and observed rendered output; full keyboard/clipboard matrix remains open |
| Browser preview | Create tab, load actual local page, input/click/navigation, back/forward/reload, focus and resize | Loaded/rendered a local page, forwarded a click, and checked back/forward/reload; forms/popups/downloads and broader parity remain open |
| Diff and Git controls | Open diff, scroll, select, refresh, worktree/project actions, safe external links | Release blocker until exercised with disposable repositories |
| Files/search | Workspace file preview, search, editor selection, large files, Markdown rendering, links | Basic real file preview checked; alias search and composer insertion passed in the extra-feature gate; large-vault UI latency remains #14 |
| Context and keyboard | Both note commands and menus, dirty note capture, intended target, attachment preservation, no submission/clipboard changes | Focused and actual checks recorded; native menu matrix remains open |
| External operations | New windows, links, default-app opening, downloads, clipboard, file dialogs | Verify supported actions and document guest restrictions |
| Multiple Obsidian windows | One workspace per owner window, focus, commands, cleanup | Unit race checks pass; complete GUI comparison remains open |
| Diagnostics/failure | Server loss, unsupported client, renderer crash, reconnect, credential-free persistence | Partial actual checks pass; remaining failure journeys stay open |

Do not mark #10 complete or claim full parity while required checks are missing. Record a failure in both reference and embedded clients as a shared deployment limitation, not a passing embedded workflow.

## Extra-feature gate

See [runtime assertions and limits](extra-features.md). Both native-open menus, external line 2, alias edits/renames, exact folder projects, composer reference insertion, and normal file drops passed. Reference drops used DOM events, so physical cross-webview dragging remains unverified. The normal plugin bundle retained strict scope and guest isolation. These checks do not close #10 or establish full parity.
