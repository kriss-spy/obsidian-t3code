# T3 Code foundations for the Obsidian plugin

Research date: 2026-11-21. Scope: first-party documentation and source inspection. No Obsidian runtime integration was tested.

## Main recommendation

Keep T3 Code as the owner of execution, authentication, thread state, and provider sessions. Add Obsidian navigation and context around that existing system.

For the first technical spike, test an isolated Electron guest view of the existing T3 app. Verify file-click interception and theme integration before choosing it. A normal iframe is blocked by upstream headers. A native RPC client remains the stronger long-term option if the guest view cannot provide reliable host integration.

These are implementation recommendations, not confirmed runtime behavior.

## Product and source identity

The canonical source is [pingdotgg/t3code](https://github.com/pingdotgg/t3code). Its README links the official download site, hosted app, and documentation. The inspected upstream HEAD was `6f94a063845021634c35d8f2d97db558290fdb1d`, committed 2026-11-21 at 04:42:05 UTC. [Commit](https://github.com/pingdotgg/t3code/commit/6f94a063845021634c35d8f2d97db558290fdb1d).

The user's installed executable reports `t3 v0.1.7`. The local path is `/home/krisspy/.local/bin/t3`, which resolves to `/home/krisspy/.t3/runtime/versions/0.1.7/t3`. Verified with `ls -l`, `file`, and `t3 --version`. This proves the installed version label. It does not prove an exact source commit or whether the binary contains local changes.

Use canonical upstream as the reference. Do not assume current `main` matches every feature in installed `0.1.7`. Pin a supported release and inspect its protocol capabilities before shipping integration. No fork was identified as necessary for this project.

## Philosophy that should survive integration

T3 Code controls agents already installed and authenticated on the user's machine. It does not sell model tokens. Users can switch providers within a thread and delegate between providers. One server supplies consistent threads to desktop, web, and mobile clients. Performance, remote access, and an MIT-licensed implementation are explicit product priorities. [README](https://github.com/pingdotgg/t3code/blob/main/README.md).

The corresponding Obsidian product principle is to make notes the primary working context while preserving T3's agent controls. Rebuilding a basic chat box would lose the provider and execution system that makes T3 useful. This is an inference from those priorities.

T3 also supports threads without a Git project. Those threads use a scratch directory and hide Git controls. Therefore a note-oriented integration need not require Git or hide every code-related feature through CSS. [Thread documentation](https://github.com/pingdotgg/t3code/blob/main/docs/user/thread-sidebar.md#start-without-a-project).

## Thread lifecycle

T3 uses “thread” for an independent task. “Session” should be reserved for a provider session or authenticated client session in implementation code.

| UI concept | Confirmed behavior | Implication for Obsidian |
| --- | --- | --- |
| Active | Contains work that is available for the user. Working-section mode orders it by when threads return to the user. | Treat the list as an attention inbox. |
| Pinned | Keeps a thread above normal active work. Settlement removes its pin. | Preserve pinning independently from recency. |
| Working | Holds executing work and work awaiting an expected continuation, including subagents and some background tasks. A server left running alone does not qualify. | Do not derive Working from a single running Boolean. |
| Snoozed | Hides work until its wake time. Work may continue. Requests, a new failure, or a user message can wake it early. | Snooze does not mean pause or stop. |
| Settled | Removes finished work from active attention without deleting its conversation. The server applies settlement rules even with no client open. | Keep the server authoritative. |
| Archived | Separate from settlement. Archiving also archives side chats and stops their work. | Preserve a distinct archive action. |
| Recent | Recent visits affect search ranking. The inspected docs do not define Recent as a durable thread lifecycle state. | A Recent view can be a filter or navigation aid. |

Sources: [thread lifecycle and sidebar](https://github.com/pingdotgg/t3code/blob/main/docs/user/thread-sidebar.md), [server ownership](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md#turn-completion-and-checkpoints).

Current upstream documentation says inactivity auto-settlement defaults to seven days. This differs from older articles that mention three days. Pending requests and active or awaited work block auto-settlement. Do not hard-code defaults copied from older descriptions. [Current thread documentation](https://github.com/pingdotgg/t3code/blob/main/docs/user/thread-sidebar.md#settle-finished-work).

## Architecture and usable boundaries

The environment server owns provider processes, terminals, Git, and project files. Clients use authenticated RPC. Shared connection and domain state lives in `packages/client-runtime`; clients supply platform services and UI. `packages/contracts/src/rpc.ts` defines the typed boundary. [Architecture](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md), [RPC contract](https://github.com/pingdotgg/t3code/blob/main/packages/contracts/src/rpc.ts).

The RPC contract includes shell snapshots, archived-shell snapshots, thread subscriptions, command dispatch, terminal operations, provider setup, and filesystem operations. Thread histories are subscribed individually. A client need not load every conversation to render its inbox. [RPC contract](https://github.com/pingdotgg/t3code/blob/main/packages/contracts/src/rpc.ts).

`@t3tools/client-runtime` exposes connection, RPC, state, thread, inbox, settlement, and presentation modules. Its package is marked `private: true` and depends on workspace packages. It is source reuse material, not evidence of a published drop-in SDK. [Package manifest](https://github.com/pingdotgg/t3code/blob/main/packages/client-runtime/package.json).

Connections have one retry owner per environment. Cached state can remain visible while offline. An open socket alone does not prove that shell or thread subscriptions are current. A native plugin should reuse these concepts and visibly distinguish cached data from live state. [Connection runtime](https://github.com/pingdotgg/t3code/blob/main/docs/internals/connection-runtime.md).

T3 orchestration records durable intent before effects execute. A command acknowledgement proves acceptance, not completion of provider or filesystem work. The plugin should wait for resulting state when reporting success. [Architecture](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md#durable-intent-and-side-effects).

## MCP is useful, but insufficient for full UI parity

The authenticated `/mcp` endpoint offers thread reads, sends, launch, metadata, scheduling, and other orchestration tools. T3's own agents receive scoped provider-session credentials. Outside MCP clients use OAuth and receive a read-only grant or runtime-mode ceiling. [MCP architecture](https://github.com/pingdotgg/t3code/blob/main/docs/orchestration-v2/orchestrator-mcp-server.md), [environment authentication](https://github.com/pingdotgg/t3code/blob/main/docs/internals/environment-auth.md#mcp-clients-are-a-separate-audience).

Outside MCP clients cannot use every operation that assumes a calling T3 thread. Their credentials are rejected by normal RPC and WebSocket routes. Consequently, an MCP login cannot simply authenticate a full native Obsidian RPC client. Use the ordinary client pairing path for a GUI client. [Authentication](https://github.com/pingdotgg/t3code/blob/main/docs/internals/environment-auth.md#mcp-clients-are-a-separate-audience).

MCP can support a narrow integration or an Obsidian tool service for agents. It should not be assumed to expose all interactive UI behaviors, approvals, terminal streams, and presentation state. That is an integration assessment based on the separate transport boundaries above.

## Embedding constraint and file integration

The app document sets `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`. The source comment explicitly ties this restriction to agent approval and thread-start authority. A plain iframe is therefore not a viable default. [HTTP source](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/http.ts#L623).

An Electron guest webContents is a separate possibility because it loads its own document. This research did not test whether the installed Obsidian build permits the required guest view, guest events, script injection, or persistence. Do not disable T3's document headers globally to make an iframe work.

T3 Markdown file chips have custom click handlers. `MarkdownFileLink` calls `preventDefault()` and routes actions through callbacks for editor, panel, browser, or media. Ordinary navigation interception alone may miss these actions. The component already receives `environmentId`, `targetPath`, and optional `line`, which are the right semantic fields for a host bridge. [File-link component](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/MarkdownFileLink.tsx).

A proposed host bridge should send an explicit file-open request with environment, absolute path, and line. Obsidian then resolves a vault note or an outside-vault editor target. Prefer a defined host hook over brittle selectors when source integration is possible. That hook was not found as a documented public extension API during this review.

Remote paths require separate treatment. T3 states that the workspace-owning environment remains authoritative. `/home/user/note.md` on a remote server is not automatically the same file as that path on the Obsidian machine. Only open it locally when a verified path mapping exists. Otherwise preserve T3's remote viewer. [Architecture boundary](https://github.com/pingdotgg/t3code/blob/main/docs/internals/overview.md#ownership-boundaries).

The user's claim about editing Markdown outside a vault remains an Obsidian-specific verification item. This review did not verify the relevant Obsidian API or its minimum version.

## Proposed implementation sequence

1. Pin the installed T3 version and record its protocol capabilities.
2. Test a full T3 guest view in an Obsidian development vault.
3. Test Markdown chip clicks, line navigation, and outside-vault opening.
4. Add a narrow, origin-checked host bridge if the guest view works.
5. Apply Obsidian theme tokens and optional compact chrome through one versioned adapter.
6. Add note-selection context and a native thread picker using server-owned state.
7. Reassess native conversation rendering only after identifying missing guest-view behaviors.

The first spike must verify composer input, streaming, approvals, questions, model selection, attachments, reconnect, and sidebar lifecycle. Preserve access to the full T3 UI while compact mode matures.

For opinionated onboarding, recommend Obsidian skills and show the exact install destination. Do not silently overwrite provider instructions or assume all providers discover skills from the same directory. Keep T3/provider installation separate from vault-specific recommendations.

## Verification limits

Read: canonical README, architecture, connection runtime, environment authentication, RPC contract, client-runtime package manifest, Markdown file-link component, app response headers, and thread lifecycle documentation.

Ran locally: executable path, binary type, and version checks. No credentials, user conversations, or private T3 state were read.

Not run: Obsidian plugin loading, guest-view embedding, OAuth or client pairing, live RPC, file-open integration, remote path mapping, or theme injection. The recommendation needs those runtime checks before implementation architecture is final.
