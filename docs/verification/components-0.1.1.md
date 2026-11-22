# Version 0.1.1 verification

Verified on Linux with Obsidian 1.15.1 and a standard T3 0.1.11 server, protocol 2. The server was built without this repository's server changes and used a disposable data directory. No production T3 installation or data directory was changed.

## Passed

- Plugin TypeScript check and production build.
- All 42 plugin tests, including component integrity, repair, path validation, cancelled installs, local filesystem proof, and scope remaining empty before proof.
- 106 targeted upstream tests across composer draft persistence, file queries, HTTP link actions, and the project file picker.
- Four targeted upstream React compiler checks, web TypeScript checking, formatting, and lint.
- Two standard upstream filesystem tests for relative and absolute file reads.
- Actual Obsidian first-run warning with no installed components. Both download buttons render in settings.
- Actual T3 pairing, authenticated filesystem proof through the standard file-reading API, and vault project creation.
- Immediate draft persistence across reconnect, tab closure, and plugin disable/enable. No guests or drop zones remain after disable.
- Plain text, binary Blob, and multipart file requests pass through the plugin's session handler to a disposable HTTP receiver.

The required bundle excludes Office preview modules, Office WebAssembly engines, CJK Office fonts, and bundled device model files. Optional fonts contain Inter and terminal symbols. Math-rendering fonts remain required.

## Limits

The broader upstream `check:changed` command was attempted. Formatting and lint passed. Other stages could not complete with this checkout's limited dependencies, including missing Expo, Astro, mobile, and script-test packages. Focused web checks above were run separately. This is not a passing full upstream check.

Windows and macOS are unverified. No paid agent turn was run for this packaging change. Protocol-2 servers from 0.1.11 onward are accepted, but runtime verification used 0.1.11. A future incompatible server API can require a plugin update.

Download hashes and component URLs are pinned in `src/component-release.ts`. Publication checks must also exercise the settings downloads against those published URLs.
