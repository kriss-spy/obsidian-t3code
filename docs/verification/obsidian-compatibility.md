# Obsidian version compatibility

The minimum app version is 1.13.4, the first public 1.13 release. The plugin compiles against the 1.13.0 API definitions. Obsidian 1.13.0 itself was an Insiders build and requires credentials to download.

`npm run test:obsidian` downloads and launches real Obsidian with an isolated profile and disposable vault. `OBSIDIAN_VERSION` selects the app version; `OBSIDIAN_INSTALLER` independently selects its Electron installer. The test asserts the vault path before executing checks and removes its fixture after completion.

Local Linux runtime checks passed for:

- App 1.13.4 with the earliest compatible installer, 1.5.8.
- App 1.15.1 with installer 1.15.1.

Each run checks plugin load/reload, settings rendering and persistence, all 61 theme roles, resolved fonts, native metadata parsing, missing-component setup guidance, temporary draft Return/Cancel with the local trash preference, sandboxed webview loading, and plugin disable.

Draft delivery uses a fixture bridge. These checks do not pair with a T3 server or establish full session behavior. Existing T3 runtime evidence remains separate.

The GitHub Actions `obsidian` job runs the same tests on Linux, Windows, and macOS. Its `earliest` app resolves from `manifest.json`, so a changed minimum automatically changes the tested version. The other job tests latest stable with the latest compatible installer. The existing unit tests and production build continue to run on all three operating systems.

The CI minimum-version job uses the 1.13.4 installer. The older 1.5.8 installer passed an initial local Linux run but showed inconsistent UI startup in later Linux runs. It is not part of the required CI matrix. Windows and macOS runtime checks passed with the 1.5.8 installer.
