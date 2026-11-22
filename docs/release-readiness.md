# Release verification

Version 0.1.1 replaces the combined development bundle with standard Obsidian plugin release files and separate component downloads. It connects to a standard T3 server. It does not patch or manage a server installation.

See [0.1.1 verification](verification/components-0.1.1.md) for the checks and limits of this release. Older verification reports concern earlier patched-server candidates.

The supported release target is Linux with Obsidian 1.15.1 or newer. Runtime verification used T3 0.1.11, protocol 2. Other protocol-2 versions from 0.1.11 onward are accepted without an exact build pin. Incompatible API changes can require a plugin update.

Office previews and bundled device models are excluded from the embedded client. Extra Inter and terminal symbol fonts are optional. The normal T3 app keeps the capabilities of its own installation.

Download and pairing errors must remain visible. Missing or changed components block the embedded workspace until repaired. Local session visibility and native file actions require authenticated filesystem verification. Pairing credentials remain in the dedicated browser partition.

Before publishing plugin assets, verify both component download URLs and perform a clean plugin installation through the settings buttons. Preserve the old release until the replacement is available.
