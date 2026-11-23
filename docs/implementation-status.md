# Implementation status

Date: 2026-11-23. Version 0.2.0 is the stable release. See [release readiness](release-readiness.md) for remaining publication checks and [verification](verification/0.2.0.md) for current evidence.

The plugin hosts a patched T3 0.1.11 client and connects to a standard server using orchestration protocol 2. It does not patch or manage the server. The client uses adapter `obsidian-host-v1.10`, host protocol 1, and upstream revision `59651c1761f6c63e9b6056839067066968e6a406`. Its manifest SHA-256 is `8f8d4a68f382d903776f001a05817af006304a1c4e53497a975593e7ef396090`.

Implemented workflows include persistent guest pairing, canonical vault filtering, Markdown navigation, explicit note context, alias search, folder projects, and reference insertion. Version 0.2.0 adds temporary composer draft editing, optional link formatting, theme and font following, component removal controls, and focus and tab-activation fixes.

T3 owns agent configuration and permissions. Vault filtering changes session visibility, not agent filesystem access. Theme following is optional. The plugin does not change agent instructions.

Desktop Windows, macOS, and Linux require Obsidian 1.13.4 or later. The server must run on the same computer and operating system. Earlier Windows and macOS runtime checks concern previous client versions. Runtime evidence for the new features covers Linux with Obsidian 1.15.1. It does not establish Windows or macOS behavior for those features.

The [0.1.2 report](verification/0.1.2.md) records the preceding release checks. New feature reports cover [theme and font following](verification/issue-17/README.md), [Escape focus](verification/escape-focus.md), [tab activation](verification/issue-29.md), and [draft editing](verification/issue-28.md). Reports retain their original artifact hashes and limitations. Older patched-server candidate reports are historical evidence.

Local preparation verifies tests, builds, archive integrity, and filesystem installation. It does not establish published downloads, clean-vault runtime behavior for the final release package, or visual acceptance. These checks remain listed in release readiness.
