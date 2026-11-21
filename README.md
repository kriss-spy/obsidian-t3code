# T3 Code in Obsidian

Project goal: use T3 Code in the Obsidian GUI with its web UI capabilities and natural note workflows.

Status: a Linux development build runs the real T3 workspace in Obsidian 1.15.1. It requires a pinned T3 0.1.11 patch and matching compiled client. Full release verification remains incomplete.

The current Linux candidate fixes immediate draft loss and scope-request saturation. Stable publication remains blocked. See the [release assessment](docs/release-readiness.md), [draft release notes](docs/release-notes.md), and [changelog](CHANGELOG.md).

See [try the development build](docs/development-install.md) for installation.

- [Recommended layout](docs/layout.md)
- [Extra-feature checks and remaining gaps](docs/verification/extra-features.md)
- [Feature verification matrix](docs/verification/feature-matrix.md)
- [Implementation spec](docs/spec.md)
- [Implementation roadmap and GitHub issues](docs/roadmap.md)
- [Technical spike and verification limits](docs/technical-spike.md)
- [Kickoff recommendation](docs/kickoff.md)
- [Product brief and acceptance scenarios](docs/product-brief.md)
- [T3 Code foundations](docs/research/t3code-foundations.md)
- [Obsidian AI chat precedents](docs/research/obsidian-ai-chat.md)
- [Existing T3 Code integrations](docs/research/existing-t3code-integrations.md)

## Development

Run `npm ci`, `npm test`, and `npm run build`. The build produces `main.js`. Copy it with `manifest.json` and `styles.css` into a disposable vault’s `.obsidian/plugins/t3-code/` directory. Enable T3 Code and run Open T3 Code.

Run `node scripts/package-development.mjs /absolute/patched/T3/checkout` after building and verifying the exact client. It creates a private development ZIP in `dist/`. See [implementation status and evidence](docs/implementation-status.md).

For a named candidate, append `rc.3`. The archive includes file checksums, source/client metadata, the MIT license, and the upstream license/notices. Run its `scripts/verify-candidate.mjs` against the extracted directory before installation.

See the [real-user test checklist](docs/user-test-checklist.md) for the next manual pass.

The rc.3 [HTTP link repair](docs/verification/http-links.md) restores system-browser handoff for normal clicks, Ctrl-clicks, and the browser menu action.
