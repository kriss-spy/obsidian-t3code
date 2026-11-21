# T3 Code 0.1.0 release notes draft

Status: release candidate for Linux testing. Stable publication is blocked by the [release assessment](release-readiness.md).

Use T3's workspace inside Obsidian with vault-scoped session navigation. Open local Markdown originals in Obsidian through explicit file actions. Add selections, unsaved notes, and note/folder references to a draft for review. Search note aliases and open exact vault folders as T3 projects.

This candidate fixes immediate draft loss during guest replacement, scope rejection when more than eight drafts compete for request slots, workspace tab removal on plugin unload, overlapping font updates, and stale routes after connection changes.

The candidate requires Linux, Obsidian 1.15.1, and the bundled patched T3 0.1.11 client/server source at revision `59651c1761f6c63e9b6056839067066968e6a406`. Building that server requires Node 26.13.1 and pnpm 12.14.0. An unmodified T3 installation is not compatible. Windows, macOS, mobile, and remote path mapping have no support claim.

T3 keeps its provider configuration, permissions, agent settings, and theme colors. The plugin connects to an existing server and does not automatically submit context. Session filtering changes only the embedded display; it does not restrict agent filesystem access.

Install in a disposable vault using the [trial instructions](development-install.md). Keep a backup and preserve the matching client/plugin pair when upgrading or rolling back. Credentials stay in T3's browser partition.

The plugin uses the MIT license. The bundle retains T3's MIT notice and web dependency notices. Full parity, broader lifecycle behavior, native drag release, and the final clean-machine rehearsal still require evidence before these notes can describe a stable release.
