# Omarchy theme synchronization

Research date: 2026-11-22. Method: primary-source inspection only. No Omarchy, Obsidian, or T3 runtime behavior was tested.

## Source pin

The requested `basecamp/omarchy` repository redirects to [omacom/omarchy](https://github.com/basecamp/omarchy). Inspected HEAD: [`e55cd372bc91b7627b79cdfef4a466b4061f48cc`](https://github.com/omacom/omarchy/commit/e55cd372bc91b7627b79cdfef4a466b4061f48cc), committed 2026-11-22 at 13:22:41 UTC. All source links below use that commit.

## Shared palette, separate app mappings

Omarchy generates app configurations from `colors.toml`. It does not discover matching marketplace themes by display name. Its Tokyo Night palette declares `mode`, `background`, `foreground`, `accent`, selection colors, semantic colors, and shade variants. The shared resolver supplies legacy ANSI aliases, missing-value fallbacks, and derived shades. Appearance precedence is `mode`, legacy `theme_type`, `light.mode`, background brightness, then dark. [Palette](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/themes/tokyo-night/colors.toml), [resolver](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-color).

Templates express each app's mapping. For example, T3 sidebar and message colors use explicit background/foreground mixes. Obsidian headings, links, graph nodes, and syntax highlighting use different semantic assignments. Sharing a source palette therefore means coordinated outputs, not identical app tokens. [T3 template](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/default/themed/t3code.json.tpl), [Obsidian template](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/default/themed/obsidian.css.tpl).

Generation precedence is a theme-supplied file, then a user template in `~/.config/omarchy/themed`, then a built-in template in `default/themed`. Existing staged files are preserved. Templates support hex, stripped hex, RGB, mixes, and gradients. Generation runs only when `colors.toml` exists. [Renderer](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-set-templates#L331-L482).

## Selection, publication, and reload

`omarchy-theme-set` validates a theme name and serializes staging with `flock`. It copies the official theme, overlays the user theme, and generates missing app files in `next-theme`. It then removes the current directory and moves the staged directory into place. This is staged publication, but the remove/move sequence is not an atomic directory exchange. A generation token identifies the selection. [Orchestrator](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-set#L379-L539).

The shell receives palette data through IPC. Visible app updates run in parallel. Slower app updates, including Obsidian and T3, use a second lock and skip batches superseded before execution. Interactive calls wait for app updates; other calls can detach them. `OMARCHY_THEME_WAIT=1` forces waiting. App failures are reported but do not reverse the desktop selection or change its success status. A successful theme-set exit therefore does not establish complete synchronization. [Failure handling](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-set#L38-L74), [update orchestration](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-set#L541-L650).

After app updates, `omarchy-hook theme-set "$THEME_NAME"` invokes the legacy hook file and non-`.sample` files in `~/.config/omarchy/hooks/theme-set.d/`. Hooks run after locks are released. Even a superseded batch can reach its hook, so consumers should verify current state. Refresh re-runs theme-set with waiting enabled and background changes skipped. [Hook dispatcher](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-hook), [refresh](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-refresh).

## Obsidian and T3 integration

The Obsidian helper reads vault paths from `~/.config/obsidian/obsidian.json`. For each existing `.obsidian` directory, it creates an `Omarchy` theme manifest if absent and copies generated CSS to `.obsidian/themes/Omarchy/theme.css`. It neither selects that theme nor issues a reload command. Whether an open vault reloads the copied CSS remains untested. Both `.theme-dark` and `.theme-light` receive the selected palette in the template. [Obsidian helper](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-set-obsidian), [CSS](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/default/themed/obsidian.css.tpl).

The T3 helper publishes `${T3CODE_HOME:-$HOME/.t3}/userdata/themes/omarchy.json` only when that installation's `userdata` exists. It locks JSON/CSS reads together, skips unresolved placeholders, and publishes through a temporary file and rename. Its comments describe T3 watching the file; this research did not verify that watcher. The helper does not select the theme. Its optional CSS includes fonts, corners, and selector-specific color overrides. [T3 helper](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/bin/omarchy-theme-set-t3code), [CSS template](https://github.com/omacom/omarchy/blob/e55cd372bc91b7627b79cdfef4a466b4061f48cc/default/themed/t3code.css.tpl).

## Lessons for issue 17

These are design inferences, not verified integration behavior:

- Reuse the separation between canonical palette, explicit app mapping, publication, and reload. An Obsidian theme name alone cannot supply that contract.
- Define each supported source revision and appearance. Resolve a complete target T3 palette before applying it through a versioned public adapter.
- Preserve the existing T3 palette when the mapping, appearance, or adapter is unsupported. Reject unresolved colors before application.
- Track selection generations so delayed work cannot overwrite newer choices. Make synchronization opt-in and preserve explicit T3 ownership changes.
- Do not copy Omarchy's selector color overrides into this plugin. Issue 17 forbids partial CSS color overrides and direct persisted-store schema edits. Publishing a supported T3 theme file is a separate operation, not a private store edit. It still needs a scope decision because the server publishes it to other clients. Private React access also remains forbidden.

Omarchy demonstrates coordinated palette generation. It does not establish visual equivalence between arbitrary Obsidian and T3 themes. Issue 17 still needs a concrete mapping and runtime checks across chat, composer, sidebar, menus, diffs, and previews in each supported appearance.

## Verification scope

Fetched the repository HEAD and recursive tree through GitHub's API. Read the pinned scripts, resolver, templates, sample palette, and theme-authoring manual. Inspected this repository's `docs/theme-mappings.md` for integration constraints. No scripts from Omarchy were executed. No app configuration, user theme, issue, or PR was changed.
