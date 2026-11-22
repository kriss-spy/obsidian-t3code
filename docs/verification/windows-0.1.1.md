# Windows verification for 0.1.1

Verified on native Windows with Obsidian 1.14.5, installer 1.14.5, and the existing T3 0.1.11 server using protocol 2. The server installation and data were not changed.

## Changes

Connect opens or reveals the workspace and reports its result. Windows verification reads a fresh challenge in the vault and a separate fresh challenge in the host user's temporary directory through T3's authenticated file API. Both files are removed after success or failure. Linux retains its machine-ID comparison.

The embedded client accepts Windows absolute paths for initialization, proof, Markdown actions, and note/folder references. The matching client identifies itself as `obsidian-host-v1.5`. The refreshed 0.1.1 plugin pins components from a separate components-0.1.1-windows release, preserving the original Linux-only component downloads.

## Passed

- Reproduced the original Windows platform rejection and the client's rejection of drive-letter vault paths before fixing them.
- 26 focused tests on native Windows, including proof cleanup, stale proofs, path validation, native Markdown requests, and Connect behavior.
- All 48 plugin tests in Linux through WSL, including the original machine-ID proof.
- Plugin TypeScript checking and production build.
- Pinned T3 client production build at `59651c1761f6c63e9b6056839067066968e6a406`, using Node 26.13.1 and pnpm 12.14.0.
- Packaged and checksum-verified the new required components before installation.
- Installed into cloudnotes, preserving saved settings, old components, and the existing pairing partition.
- Actual Obsidian guest reported `obsidian-host-v1.5` and `Connected to standard T3 0.1.11. Local vault access verified.`
- Actual T3 onboarding screen rendered with the configured agents ready and no pairing prompt.
- Opened a disposable Markdown note with a Unicode Windows path through the plugin's native opening function, then closed and removed the fixture.

## Limits

Windows Obsidian with a T3 server in WSL is not supported. Both applications must use the same native paths. macOS remains unsupported.

No paid agent turn or provider configuration change was performed. The optional project import and onboarding Start action were left for the user.

The native note cleanup triggered a `pexels-banner` null-file error and an asynchronous missing-file read for the removed fixture. The note opened successfully; no existing notes were edited.

The component archives are prepared under `dist/components`. Release publication and download verification are recorded below.

## Composer reference labels

The composer label helper only recognized forward slashes. Dragged Windows references retain backslashes, so the helper rendered the entire path; mention search references already used forward slashes. Updated the shared basename helper to recognize both separators without changing the reference destination.

Added six regression cases for Windows files, folders, Unicode, mixed separators, UNC paths, and existing Unix/simple paths. Four Windows cases failed before the fix; all 30 upstream icon/path tests passed afterward. Rebuilt and checksum-verified the client components, installed them into cloudnotes, and reloaded the plugin. The native connection still reports local vault access verified. No reference chips were present in the active composer during the final runtime check, so the corrected visible label was verified by regression tests rather than an existing draft.

## CI coverage

The Checks workflow now runs `npm ci`, `npm test`, and `npm run build` on both `ubuntu-latest` and `windows-latest`, using Node 22. Matrix jobs run independently so a failure on one platform does not cancel the other.

Filesystem fixtures use directory junctions on Windows and directory symlinks on Linux. Alias and reference fixtures resolve files through linked directories, preserving coverage for duplicate canonical paths and links escaping the vault without requiring Windows symlink privileges. All 48 plugin tests and the production build pass locally on native Windows and on Linux through WSL, with no skipped tests. The hosted Actions run will occur after the changes are pushed.
