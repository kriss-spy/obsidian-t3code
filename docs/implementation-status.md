# Implementation status

Date: 2026-11-22. The [0.1.0-rc.3 prerelease](https://github.com/kriss-spy/obsidian-t3code/releases/tag/0.1.0-rc.3) is published for testing. Stable publication waits for the maintainer's Windows behavior testing and remaining verification. See the [release assessment](release-readiness.md) for fixed findings, fresh checks, and all remaining gates.

The candidate uses host contract `obsidian-host-v1.4`, pinned upstream revision `59651c1761f6c63e9b6056839067066968e6a406`, and client manifest SHA-256 `dc2fe4490e9f702a1667942868eb3b7fba604b6edf297c9b10b9c407547627dc`. It requires the matching patched T3 0.1.11 server and compiled client. The plugin runtime remains Linux Obsidian 1.15.1 only.

Implemented workflows include persistent guest pairing, strict canonical vault filtering, semantic Markdown navigation, explicit editor context, native-open menus, alias search, folder projects, and reference insertion. T3 owns agent configuration and theme colors. The plugin does not start a server or change agent instructions.

The candidate fixes two separate fresh-draft failures. Embedded composer persistence now writes before a guest can be destroyed. A saturated eight-request scope queue now leaves further drafts pending until they receive a verdict. Immediate reconnect, tab close, and plugin disable/enable preserve a fresh draft in the normal production bundle. This closes the reproduced ordering gap; it does not establish crash recovery or full lifecycle parity.

Fresh evidence is linked in the [release assessment](release-readiness.md). Earlier development, feedback, extra-feature, and repair reports remain under `verification/` as historical records. Their hashes and passing assertions belong to those older artifacts. They do not approve this candidate.

Implementation work is delivered in the candidate. Remaining acceptance checks are consolidated under [issue #10](https://github.com/kriss-spy/obsidian-t3code/issues/10); closing implementation issues does not mark those checks as passed. [Issue #1](https://github.com/kriss-spy/obsidian-t3code/issues/1) tracks stable delivery. Optional theme mapping remains [issue #17](https://github.com/kriss-spy/obsidian-t3code/issues/17).

The requested rc.3 installation updated CloudNotes plugin files and its matching served client. Installed and served bytes were verified. Runtime plugin reload was requested but not independently confirmed. The live server process, data, pairing, and plugin settings were preserved.
