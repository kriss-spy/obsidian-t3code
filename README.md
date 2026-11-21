# T3 Code in Obsidian

Project goal: use T3 Code in the Obsidian GUI with its web UI capabilities and natural note workflows.

Status: incomplete development build. The desktop plugin foundation builds and passes focused checks. Embedding stays disabled until strict scope and real T3 file actions pass the integration gate.

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

The current build shows compatibility status and a normal-app fallback. It cannot yet run the scoped T3 workspace. See [implementation status and evidence](docs/implementation-status.md).
