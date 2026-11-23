# Theme synchronization boundary

The opt-in **Follow Obsidian theme** setting reads resolved semantic CSS colors from the current Obsidian window. It translates those colors into all 61 roles of the pinned T3 palette. Theme package names do not select a matching T3 package. Theme customizations therefore follow the same path as theme changes.

The version 2 theme capability in `t3ObsidianHostV1` uses T3’s normal palette parser, custom-theme installation and selection functions. It verifies the selected appearance and painted colors. It does not access private React state or edit T3 preference schemas. Omarchy is a research reference only.

Enabling the setting applies the current colors and appearance. Obsidian theme, appearance and CSS changes update the complete palette. The independent **Follow Obsidian fonts** setting maps resolved interface, text and monospace font stacks to T3 controls, chat/composer and code/terminal. It carries accessible theme font faces into the embedded view. T3 retains its font sizes. Disabling font following restores T3’s own fonts without changing its stored preferences. Disabling theme following retains the last generated palette. Choosing another T3 theme, changing T3 appearance, or editing a palette suspends following. Selecting the unchanged generated **Obsidian** palette in T3 resumes following and updates the plugin toggle. The Settings card, appearance-specific picker and command palette use the same setter notifications. An explicit plugin toggle takes priority over older pending client choices. Suspension and pending resume choices survive reconnects.

Generated palettes use a unique ID. The host updates a previous palette only when its serialized definition still matches the host’s saved definition. A user-edited palette is preserved. Failed writes attempt to restore the previous palette, appearance and mixed theme halves. Incomplete rollback stops following and reports an error. Stale requests and closed views cannot apply colors.

The host capability is available only in the embedded client. Each vault uses its own client partition. The plugin does not change the server or ordinary T3 clients.

See the [runtime review](verification/issue-17/README.md) for the tested theme versions, screenshots and remaining verification gaps. Palette generation alone does not establish visual support for every theme variant. The [feasibility investigation](research/issue-17-theme-sync-feasibility.md) records the clarified design.
