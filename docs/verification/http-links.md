# HTTP link repair

Date: 2026-11-22. The user reported rc.1 normal clicks, Ctrl-clicks, and **Open in system browser** doing nothing. **Open in integrated browser** worked.

## Cause and change

T3's ordinary browser path relied on native `_blank` links and `window.open`. Obsidian's isolated webview has popups disabled. The embedded client had no semantic HTTP-link operation to reach Obsidian's system-browser opener.

System-directed Markdown clicks now use the local shell API in embedded mode. That API sends a bounded, generation-tagged `browser` request to the Obsidian host. The host checks the current route, local environment, and HTTP/HTTPS URL before calling Electron's `shell.openExternal`. It rejects credentials and non-web protocols. An opener failure reports an error without disconnecting the guest. Ordinary T3 clients keep their existing path. T3's integrated-browser preference and explicit menu action remain intact.

Guest popups remain disabled. No preload, Node integration, or desktop bridge imitation was added. URLs are not saved in plugin settings.

## Evidence

- The new local-shell regression failed before the fix: the host opener received zero calls. It passes afterward and checks ordinary-browser behavior too.
- Plugin tests: 41 pass. The protocol tests reject non-web URLs, credentials, wrong environments, and stale routes. An opener failure leaves the bridge usable.
- Targeted upstream tests: 53 pass across `localApi.test.ts` and `ChatMarkdown.browser.test.tsx`. Targeted lint, web typecheck, web production build, and plugin production build pass.
- The normal production plugin passes [actual Obsidian link checks](http-links.json): plain click, Ctrl-click, system-browser menu, query/fragment preservation, unchanged thread route, and integrated-browser menu routing.
- The runtime test captures the call at Electron's host opener boundary. It does not launch the user's actual OS browser. The final OS-browser check remains manual.
- Scope checks now leave two request slots for the active file check and explicit user actions. A capacity regression failed before this change and passes afterward. The actual native Markdown and scope gate passes. Its synthetic clicks are cancelable, matching real browser clicks.

All runtime checks use the disposable vault/profile and isolated server on 39176. They do not edit personal notes or change the live T3 servers.

## User check

Install both the rc.3 plugin and its matching web client, then reload the plugin. In a T3 Markdown message or rendered note, try a normal HTTP link click, Ctrl-click, and **Open in system browser**. Each system-directed action should open one tab in the configured OS browser. If the default link preference is integrated browsing, an ordinary click should use that preference. **Open in integrated browser** should still open within T3.

Report whether an error notice appears if the OS browser still fails to open. Use [the trial guide](../development-install.md) for matching files. Full stable-release approval remains separate from this repair.
