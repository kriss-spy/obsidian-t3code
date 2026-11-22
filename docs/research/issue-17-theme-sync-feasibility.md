# Issue 17: theme synchronization feasibility

Research date: 2026-11-22. This is a source-based proposal, not runtime or visual acceptance evidence.

## Finding

The intended behavior is simple: embedded T3 follows the current Obsidian theme, including later theme and light/dark changes. Obsidian is the source of appearance for this feature. Omarchy was a research reference, not a proposed plugin integration or required theme package.

A promising approach is to read Obsidian's resolved CSS color variables and translate them into a complete T3 palette. This would follow the actual rendered theme, including customizations, without matching marketplace theme names. The translation needs visual validation. No mapping is verified by this investigation, and current runtime behavior remains unchanged.

[Issue 17](https://github.com/kriss-spy/obsidian-t3code/issues/17) currently describes verified package mappings. Following arbitrary Obsidian themes through resolved colors broadens that design. Treat this as the direction to investigate under the user's clarified intent. It can still use T3's normal palette APIs and avoid partial CSS overrides.

The scope is one Obsidian vault's embedded client. No Omarchy installation, system theme hook, or server-wide theme command is required.

## T3 integration evidence

All T3 links below use the plugin's pinned revision, `59651c1761f6c63e9b6056839067066968e6a406`.

- [`useTheme.ts`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/web/src/hooks/useTheme.ts) exports `setTheme`, `setAppearanceMode`, `getThemeSnapshot`, and `subscribeRenderedAppearance`. These are source-module exports for a compiled adapter. They are not a callable API exposed to the Obsidian host today.
- [`themePalette.ts`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/web/src/themePalette.ts) exports `parseThemeFile`, `installCustomTheme`, `getThemeDefinition`, and `getThemeColorsForMode`. A compiled adapter can use the normal import and selection code. It does not need to edit local-storage schemas itself.
- [`themePalettes.ts`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/packages/shared/src/themePalettes.ts) defines 61 color roles. A verified mapping should provide every role for each supported appearance. The built-in IDs are `t3-chat`, `grove`, `ocean`, `ember`, and `iris`. A familiar Obsidian theme may require a custom T3 palette.
- [`appearance.md`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/docs/user/appearance.md) documents published JSON themes and `t3 theme set`. It also supports generating a palette from `canvas` and `accent`. Generation provides a usable palette, but does not establish a verified match.
- [`useDefaultTheme.ts`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/web/src/hooks/useDefaultTheme.ts) adopts server defaults once per generation. A later local choice remains until another server command. This is useful ownership precedent. It does not provide the local ownership rule required by issue 17.
- [`useEnvironmentTheme.ts`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/web/src/hooks/useEnvironmentTheme.ts) refreshes selected published palettes when definitions change. [`getThemeDefinition`](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/web/src/themePalette.ts) gives local custom themes precedence over published themes. Verification must therefore inspect the resolved palette, not only its ID.

The current [host contract](../../src/host-contract.ts) has no theme capability. The [client patch](../../upstream/t3-0.1.11-obsidian-host-v1.patch) exposes scope, file, composer, and related operations. The [appearance adapter](../../src/view.ts) changes fonts and reduced-motion CSS, without overriding colors.

Obsidian's public `workspace.on('css-change')` event is declared in the installed `obsidian` 1.14.4 typings. The plugin already subscribes in [main.ts](../../src/main.ts). That event can trigger a fresh read of computed colors. Read them from the Obsidian window containing the T3 view. Coalesce repeated events and compare normalized color snapshots before applying changes. This event strategy remains untested.

## Recommended design

1. Add a clear follow-Obsidian appearance setting. Keep font following independent.
2. Read resolved Obsidian colors for backgrounds, text, borders, accents, selection, and semantic statuses. Read the resolved light/dark appearance too.
3. Translate those values into all 61 T3 color roles. Define and validate derived colors where Obsidian has no equivalent role. Preserve readable focus, status, diff, code, and terminal colors.
4. Add a versioned host capability to apply the complete palette through T3's normal theme parser and setters. Validate the document generation. Do not inject partial palette CSS or edit preference storage directly.
5. Refresh on Obsidian CSS and appearance changes, initial connection, and reconnect. Ignore duplicate snapshots and stale asynchronous results.
6. While following is enabled, let Obsidian own appearance. Make a manual T3 appearance change explicitly leave following mode, consistent with issue 17's existing ownership rule. This transition needs a visible setting and runtime verification.
7. If color resolution or validation fails, retain the last complete T3 palette. Report why the update failed.

The normal T3 parser can generate colors from seeds. That makes a prototype possible, but generated colors still need validation against real Obsidian themes. Start with Obsidian's default light and dark themes, then test community themes and user CSS customizations.

The setters are separate operations. Source inspection does not establish atomic palette-and-appearance updates or rollback. A prototype must handle partial failure through T3's normal APIs and confirm the final snapshot.

Omarchy's useful lesson is limited to translating one palette into application-specific roles. Its integration scripts and published theme files are not part of this proposed feature. The separate [source investigation](omarchy-theme-sync.md) is background evidence only.

## Trial and acceptance gates

First validate the color translation with Obsidian’s default light and dark themes. Then test representative community themes and customizations. The goal is coherent matching colors within T3’s existing interface.

Before enabling the feature:

1. Verify chat, composer, sidebar, menus, diffs, and previews in light and dark appearances. Include readable selection, focus, status colors, and code highlighting.
2. Verify an explicit T3 selection and theme edit suspend following. Repeat after unrelated CSS events, closing the view, and reconnecting.
3. Verify community themes, modified CSS, missing or invalid color values, rejected preference writes, and stale generations preserve the intended ownership and fallback.
4. Verify independent vaults and the ordinary T3 client retain their own selections. Check interaction with server-published defaults.
5. Rebuild the patched client, regenerate component hashes, and run the host and packaging checks required by the repository.

No UI trial, theme equivalence check, or runtime theme command was run for this research. No theme settings were changed. Issue 17 should stay open.
