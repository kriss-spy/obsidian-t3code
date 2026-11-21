## Releases

## Behavior

- **Warning**: **Direct Filesystem Access**: Uses the Node.js `fs` module to access the filesystem outside of the Obsidian vault API. Can read and write any file on the system.

## Source code

- **Warning**: The command name should not include the plugin name, the plugin name is already shown next to the command name in the UI.
  - obsidianmd/commands/no-plugin-name-in-command-name
  - src/main.ts:34, src/main.ts:36
- **Warning**: Use sentence case for UI text. Expected: 'Add current note to t3'
  - obsidianmd/ui/sentence-case
  - src/main.ts:49, src/main.ts:56
- **Warning**: Use sentence case for UI text. Expected: 'Add selection to t3'
  - obsidianmd/ui/sentence-case
  - src/main.ts:44, src/main.ts:55
- **Warning**: Use sentence case for UI text. Expected: 'Applies to explicit Obsidian opening. Plain clicks keep the t3 preview.'
  - obsidianmd/ui/sentence-case
  - src/settings.ts:22
- **Warning**: Use sentence case for UI text. Expected: 'Checking t3 compatibility…'
  - obsidianmd/ui/sentence-case
  - src/view.ts:52
- **Warning**: Use sentence case for UI text. Expected: 'Could not focus t3 code.'
  - obsidianmd/ui/sentence-case
  - src/main.ts:37
- **Warning**: Use sentence case for UI text. Expected: 'Could not open t3 code.'
  - obsidianmd/ui/sentence-case
  - src/main.ts:33
- **Warning**: Use sentence case for UI text. Expected: 'Development build. See the installation guide for the required t3 host patch.'
  - obsidianmd/ui/sentence-case
  - src/view.ts:154
- **Warning**: Use sentence case for UI text. Expected: 'Existing server origin. Pairing stays in t3.'
  - obsidianmd/ui/sentence-case
  - src/settings.ts:11
- **Warning**: Use sentence case for UI text. Expected: 'Focus t3 code'
  - obsidianmd/ui/sentence-case
  - src/main.ts:36
- **Warning**: Use sentence case for UI text. Expected: 'Open folder in t3 code'
  - obsidianmd/ui/sentence-case
  - src/main.ts:75
- **Warning**: Use sentence case for UI text. Expected: 'Open t3 code'
  - obsidianmd/ui/sentence-case
  - src/main.ts:34, src/main.ts:35
- **Warning**: Use sentence case for UI text. Expected: 'Open the normal t3 app'
  - obsidianmd/ui/sentence-case
  - src/view.ts:153
- **Warning**: Use sentence case for UI text. Expected: 'Recommended: the official Obsidian agent skills teach Markdown, bases, canvas, and Obsidian tools. Install them in your t3 agent setup.'
  - obsidianmd/ui/sentence-case
  - src/settings.ts:35
- **Warning**: Use sentence case for UI text. Expected: 'Split beside t3'
  - obsidianmd/ui/sentence-case
  - src/settings.ts:23
- **Warning**: Use sentence case for UI text. Expected: 'T3 code'
  - obsidianmd/ui/sentence-case
  - src/view.ts:21
