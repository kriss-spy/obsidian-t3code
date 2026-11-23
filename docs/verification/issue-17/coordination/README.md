# Theme selector coordination

Adapter `obsidian-host-v1.9` coordinates the plugin toggle with T3 theme selection.

| Action | Result |
| --- | --- |
| Select another T3 palette | Following stops; the plugin toggle turns off. |
| Select the unchanged generated Obsidian palette | Following resumes; the toggle turns on; the current Obsidian colors and appearance apply. |
| Change T3 appearance or edit a palette | Following stops. |
| Enable the plugin toggle | The current Obsidian palette applies and later changes follow. |
| Disable the plugin toggle | The last complete palette remains selected and stops updating. Selecting it again resumes following. |

The Settings card and command palette use normal T3 theme setters. Single-appearance palettes use the normal appearance-specific setter. Both paths report selection of the actual host-owned ID. A user-created palette with the same display name, or a modified copy of the generated palette, cannot acquire following by its name.

A pending manual choice remains in the host's own metadata until the plugin acknowledges the matching state. Older queued updates cannot overwrite that choice. Explicit plugin toggles use a new ownership token and supersede older client requests. Re-selecting the active generated palette also refreshes the current colors and clears mixed theme halves.

## Verification

All 79 unit tests passed. New cases cover resume selection, queued updates, reconnect before acknowledgement, explicit disable, palette-name collisions, user edits and mixed halves. Plugin and patched-client builds passed. Focused upstream lint passed. The web type check reported no TypeScript errors. The patch applies to a clean pinned checkout, and 33 pinned client assets verify.

The actual Obsidian runtime test exercised both settings interfaces in the disposable vault. It read the rendered plugin checkbox, including when Obsidian opened Settings in a separate window. All 11 checks passed:

- Another T3 theme disables the actual plugin checkbox and saves the disabled state.
- An independent T3 palette remains unchanged while Obsidian changes theme.
- Selecting the generated Obsidian card resumes and checks the actual plugin checkbox.
- Later Obsidian theme changes update the painted T3 palette.
- A T3 appearance override disables following.
- Re-selecting the active generated palette resumes following.
- Clicking the plugin checkbox off retains the complete palette across an Obsidian theme change.
- Selecting that frozen palette resumes following.
- Rapid other-theme/Obsidian reselection keeps the latest intent.
- Font following remains independent.
- Reconnect preserves following, and a later theme change applies.

The [runtime results](/home/krisspy/Projects/obsidian/obsidian-t3code/docs/verification/issue-17/coordination/runtime.json) contain the check outcomes. No personal vault theme preferences were changed during testing.
