#!/usr/bin/env bash
# Build in a new checkout only. Never start a server or open a database here.
set -euo pipefail
bundle_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
checkout_dir="${1:?Usage: bash scripts/prepare-t3-development.sh /absolute/new-checkout}"
[[ "$checkout_dir" = /* && ! -e "$checkout_dir" ]] || { echo 'Choose a new absolute checkout directory.' >&2; exit 1; }
command -v git >/dev/null
command -v pnpm >/dev/null
node -e 'if(process.versions.node!=="26.13.1")throw Error("Use upstream Node 26.13.1")'
[[ "$(pnpm --version)" = '12.14.0' ]] || { echo 'Use upstream pnpm 12.14.0.' >&2; exit 1; }
[[ -f "$bundle_dir/t3-web/obsidian-host-client.json" ]] || { echo 'Run this script from the extracted development bundle.' >&2; exit 1; }
git clone --filter=blob:none --branch v0.1.11 --single-branch https://github.com/pingdotgg/t3code.git "$checkout_dir"
cd -- "$checkout_dir"
[[ "$(git rev-parse HEAD)" = '59651c1761f6c63e9b6056839067066968e6a406' ]]
git apply --check "$bundle_dir/upstream/t3-0.1.11-obsidian-host-v1.patch"
git apply "$bundle_dir/upstream/t3-0.1.11-obsidian-host-v1.patch"
pnpm --filter t3... --filter @t3tools/monorepo install --ignore-scripts --frozen-lockfile
pnpm --filter t3 run build:bundle
mkdir -p apps/web/dist
cp -a "$bundle_dir/t3-web/." apps/web/dist/
node "$bundle_dir/scripts/verify-packaged-client.mjs" apps/web/dist
printf '%s\n' 'Patched checkout prepared. No server was started. See DEVELOPMENT.md to select a data directory and pair.'
