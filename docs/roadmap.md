# Implementation roadmap

Track delivery in [release issue #1](https://github.com/kriss-spy/obsidian-t3code/issues/1) and the [v0.1.0 milestone](https://github.com/kriss-spy/obsidian-t3code/milestone/1).

The [spec](spec.md) defines behavior and release gates. GitHub issues track implementation progress. A Linux development build now hosts the scoped real T3 UI, native Markdown navigation, explicit note context, restoration, and appearance. Full v0.1.0 release verification remains incomplete. See [implementation status](implementation-status.md) for checks and remaining work.

## Tasks

- [#2: Host the full T3 web UI in a desktop Obsidian view](https://github.com/kriss-spy/obsidian-t3code/issues/2). Start here.
- [#3: Connect and pair with the existing T3 server](https://github.com/kriss-spy/obsidian-t3code/issues/3). Depends on #2.
- [#4: Implement versioned T3 hooks for strict scope and real file actions](https://github.com/kriss-spy/obsidian-t3code/issues/4). Depends on #2, #3.
- [#5: Filter all session navigation to the vault root and subfolders](https://github.com/kriss-spy/obsidian-t3code/issues/5). Depends on #4.
- [#6: Open real T3 Markdown links in Obsidian editors](https://github.com/kriss-spy/obsidian-t3code/issues/6). Depends on #4.
- [#7: Add selection and current-note context through explicit commands](https://github.com/kriss-spy/obsidian-t3code/issues/7). Depends on #4, #5.
- [#8: Restore the working thread and draft across pane lifecycle changes](https://github.com/kriss-spy/obsidian-t3code/issues/8). Depends on #2, #3, #5.
- [#9: Match Obsidian appearance and keep setup settings small](https://github.com/kriss-spy/obsidian-t3code/issues/9). Depends on #3, #4.
- [#10: Verify end-to-end T3 web UI parity and package v0.1.0](https://github.com/kriss-spy/obsidian-t3code/issues/10). Depends on #5, #6, #7, #8, #9.

## First integration gate

Issue #4 must prove real T3 file actions and pre-render session filtering. A synthetic bridge or CSS-hidden session rows cannot pass that gate. Document any required T3 patch before proceeding with dependent features.


The [pinned T3 patch](../upstream/README.md) now implements the scope and semantic-action contract. The exact compiled client passed the isolated development integration checks and is approved by its manifest digest. Unmodified T3 stays unsupported. See [trial installation](development-install.md) and [recorded verification limits](implementation-status.md).
