import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const revision = '59651c1761f6c63e9b6056839067066968e6a406';
const [directory, mode = '--check'] = process.argv.slice(2);
if (!directory || !['--check', '--apply'].includes(mode)) throw new Error('Usage: node scripts/check-upstream-patch.mjs <T3 checkout> [--check|--apply]');
const cwd = resolve(directory);
const git = (...args) => execFileSync('git', args, {cwd, encoding:'utf8'}).trim();
if (git('rev-parse', 'HEAD') !== revision) throw new Error('Refuse a T3 revision other than ' + revision);
try { git('diff', '--quiet'); git('diff', '--cached', '--quiet'); }
catch { throw new Error('Refuse a checkout with tracked edits. Use a clean isolated checkout.'); }
const patch = fileURLToPath(new URL('../upstream/t3-0.1.11-obsidian-host-v1.patch', import.meta.url));
git('apply', '--check', patch);
if (mode === '--apply') git('apply', patch);
console.log(`${mode === '--apply' ? 'Applied' : 'Patch applies to'} ${revision}. Install the matching verified client bundle before connecting.`);
