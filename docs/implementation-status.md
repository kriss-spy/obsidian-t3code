# Implementation status

Date: 2026-11-21. The current artifact is a Linux release candidate for testing. Stable publication remains blocked. See the [release assessment](release-readiness.md) for fixed findings, fresh checks, and all remaining gates.

The candidate uses host contract `obsidian-host-v1.4`, pinned upstream revision `59651c1761f6c63e9b6056839067066968e6a406`, and client manifest SHA-256 `dc2fe4490e9f702a1667942868eb3b7fba604b6edf297c9b10b9c407547627dc`. It requires the matching patched T3 0.1.11 server and compiled client. The plugin runtime remains Linux Obsidian 1.15.1 only.

Implemented workflows include persistent guest pairing, strict canonical vault filtering, semantic Markdown navigation, explicit editor context, native-open menus, alias search, folder projects, and reference insertion. T3 owns agent configuration and theme colors. The plugin does not start a server or change agent instructions.

The candidate fixes two separate fresh-draft failures. Embedded composer persistence now writes before a guest can be destroyed. A saturated eight-request scope queue now leaves further drafts pending until they receive a verdict. Immediate reconnect, tab close, and plugin disable/enable preserve a fresh draft in the normal production bundle. This closes the reproduced ordering gap; it does not establish crash recovery or full lifecycle parity.

Fresh evidence is linked in the [release assessment](release-readiness.md). Earlier development, feedback, extra-feature, and repair reports remain under `verification/` as historical records. Their hashes and passing assertions belong to those older artifacts. They do not approve this candidate.

Issue #10 and the complete reference UI comparison remain open. No release or merge was published. The existing CloudNotes installation and its server were not upgraded during this review.
