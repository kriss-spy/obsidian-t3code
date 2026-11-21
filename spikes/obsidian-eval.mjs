import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [vault, script] = process.argv.slice(2);
if (!vault || !script) throw new Error('Usage: node spikes/obsidian-eval.mjs <vault> <script>');
const code = `(async () => {\n${readFileSync(script, 'utf8')}\n})()`;
const result = spawnSync('obsidian', [`vault=${vault}`, 'eval', `code=${code}`], { encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.status || /(?:^|\n)Error:/.test(result.stdout)) process.exit(result.status || 1);
