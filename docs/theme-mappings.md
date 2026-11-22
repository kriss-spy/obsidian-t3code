# Theme synchronization boundary

The extra-feature build retains T3-owned colors. It introduces no automatic theme mapping and no palette CSS overrides. The optional Obsidian font setting changes only the font.

The pinned T3 source exports `setTheme`, `setAppearanceMode`, `getThemeSnapshot`, and appearance subscriptions from `apps/web/src/hooks/useTheme.ts`. Its setter applies a complete T3 palette. These module exports are available to a compiled adapter. The public `t3ObsidianHostV1` contract currently exposes no theme setter. Calling private React state or changing stored preference schemas would bypass that boundary.

No verified mapping between an Obsidian theme package and a T3 palette is supplied by this repository. A marketplace display name does not establish common source, revision, customization, or light/dark variants. The safe fallback is to keep the current T3 palette, including explicit changes made in T3.

A future mapping must identify both packages and revisions, each supported light/dark variant, and the complete target T3 palette. It must verify chat, composer, sidebar, menus, diffs, and previews in both appearances. Unknown packages, missing variants, modified palettes, and failed API calls must leave T3's current palette intact.

Synchronization would require an explicit opt-in ownership setting and a versioned public host method that calls T3's normal setter. An explicit T3 theme change must return ownership to T3 until the user enables synchronization again. Host appearance events must not repeatedly overwrite that choice. Disabling synchronization must retain the last complete palette rather than mix application colors.

Issue #17 remains open until a concrete mapping and these runtime checks pass. Source inspection establishes the available integration boundary, not visual equivalence.

See the [issue 17 feasibility investigation](research/issue-17-theme-sync-feasibility.md) for the clarified direction: embedded T3 follows Obsidian’s resolved theme colors and appearance. This proposes translating computed Obsidian colors into a complete T3 palette, rather than selecting themes by name. It broadens the earlier package-mapping design and still requires runtime validation. Omarchy is a research reference only.
