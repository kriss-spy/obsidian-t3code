# Recommended T3 settings

These recommendations come from using T3 Code inside Obsidian. They are optional preferences, not changes to the plugin defaults.

Open settings inside T3 to find these options. Obsidian has separate settings.

| T3 setting | Recommendation | Why |
| --- | --- | --- |
| Appearance → Render math | Turn on. | Display equations as rendered math in chat. |
| Chat → Follow-up behavior | Choose **Queue** for normal use. Use **Steer** when you want to redirect the current run. | Queue holds a follow-up while the agent runs. Steer changes the current run's direction. |
| Chat → Tool calls in chat | Start with **Hide successful**. Try **Hide all** if you want fewer tool details. | Hide successful keeps failed calls visible. Approvals, questions, and errors still appear with either option. |
| Keybindings | Review the default shortcuts alongside Obsidian's **Hotkeys** settings. | T3 shortcuts can conflict with Obsidian shortcuts. Check both before assigning keys you use often. |

Specific shortcut conflicts and suggested replacements will be documented after further user testing. This recommendation does not change shortcut defaults.

## Features to try

- **Scheduled tasks**: T3 includes scheduled tasks. Open **Settings → Scheduled tasks** to explore them.
- **Boring sidebar**: if the current sidebar does not suit you, try **Settings → Labs → Boring sidebar (group by project)**. It offers a project-based sidebar layout.

These tips describe available T3 controls. They do not establish runtime verification of scheduled tasks or every shortcut inside Obsidian.

See the [recommended Obsidian layout](layout.md) for workspace arrangement and the [real-user test checklist](user-test-checklist.md) for release checks.
