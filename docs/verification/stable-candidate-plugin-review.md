## Releases

## Behavior

- **Warning**: **Direct Filesystem Access**: Uses the Node.js `fs` module to access the filesystem outside of the Obsidian vault API. Can read and write any file on the system.

## Source code

- **Warning**: The command name should not include the plugin name, the plugin name is already shown next to the command name in the UI.
  - obsidianmd/commands/no-plugin-name-in-command-name
  - src/main.ts:35, src/main.ts:37
- **Warning**: Use sentence case for UI text. Expected: 'Add current note to t3'
  - obsidianmd/ui/sentence-case
  - src/main.ts:50, src/main.ts:57
- **Warning**: Use sentence case for UI text. Expected: 'Add selection to t3'
  - obsidianmd/ui/sentence-case
  - src/main.ts:45, src/main.ts:56
- **Warning**: Use sentence case for UI text. Expected: 'Checking t3 compatibility…'
  - obsidianmd/ui/sentence-case
  - src/view.ts:55
- **Warning**: Use sentence case for UI text. Expected: 'Could not focus t3 code.'
  - obsidianmd/ui/sentence-case
  - src/main.ts:38
- **Warning**: Use sentence case for UI text. Expected: 'Could not open t3 code.'
  - obsidianmd/ui/sentence-case
  - src/main.ts:34
- **Warning**: Use sentence case for UI text. Expected: 'Could not save or reconnect to t3. Check the connection status.'
  - obsidianmd/ui/sentence-case
  - src/settings.ts:23
- **Warning**: Use sentence case for UI text. Expected: 'Development build. See the installation guide for the required t3 host patch.'
  - obsidianmd/ui/sentence-case
  - src/view.ts:195
- **Warning**: Use sentence case for UI text. Expected: 'Drop reference into t3'
  - obsidianmd/ui/sentence-case
  - src/view.ts:149
- **Warning**: Use sentence case for UI text. Expected: 'Focus t3 code'
  - obsidianmd/ui/sentence-case
  - src/main.ts:37
- **Warning**: Use sentence case for UI text. Expected: 'Open folder in t3 code'
  - obsidianmd/ui/sentence-case
  - src/main.ts:78
- **Warning**: Use sentence case for UI text. Expected: 'Open t3 code'
  - obsidianmd/ui/sentence-case
  - src/main.ts:35, src/main.ts:36
- **Warning**: Use sentence case for UI text. Expected: 'Open the normal t3 app'
  - obsidianmd/ui/sentence-case
  - src/view.ts:194
- **Warning**: Use sentence case for UI text. Expected: 'Split beside t3'
  - obsidianmd/ui/sentence-case
  - src/settings.ts:27
- **Warning**: Use sentence case for UI text. Expected: 'T3 code'
  - obsidianmd/ui/sentence-case
  - src/view.ts:22

Release attestation checks were skipped. The runner emitted its existing numeric-summary warning. Individual findings were inspected: zero source errors, 19 naming warnings, and one intentional filesystem-access warning.
