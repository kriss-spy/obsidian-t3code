# Obsidian menu update

The preview editor menu and explorer's Open with submenu now label the native action `Obsidian`. Both render a gem icon. The preview uses the same theme-aware foreground as other editor icons. The action still opens the original note through the verified local Markdown adapter.

The production plugin and rebuilt client passed the actual preview-menu check in disposable Linux Obsidian 1.15.1. The label is `Obsidian`, the visible icon is 16 pixels wide, and the old label is absent. Selecting the item opens `Test 空 格#.md` in Obsidian. See [menu assertions](obsidian-menu.json).

The source fallback menu includes the matching gem path. The broader explorer/menu gate remains subject to the existing virtualized-row targeting limit. Its appearance and physical user interaction are included in the [manual checklist](../user-test-checklist.md).

The current client is contract `obsidian-host-v1.4` with manifest SHA-256 `abc3392c98a2f6c9236b0595865ecb255bf6350a36f2030fe5588262f4fc6520`. It contains the entry document and 22 JavaScript assets. The normal plugin repeats the lifecycle, scope, native chip, and 200-result alias checks with these bytes. rc.2 must use this matching client; replacing only the plugin does not change the web menu.

Visual proof remains outside the repository: the user's attached screenshot is the before capture; `/home/krisspy/.cache/obsidian-t3-menu-after.png` records the updated menu. The disposable environment's unrelated provider-probe warning does not establish an agent-execution pass.

The broader rc.2 changed-file run passed 667 tests and timed out in two browser click tests. Static checks passed. Both affected files passed the isolated recheck, 16 tests total. The focused recheck is recorded in the candidate evidence; the original full-run timeouts remain recorded.
