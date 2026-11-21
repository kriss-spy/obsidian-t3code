import { readFileSync } from 'node:fs';
export function readAddedPatchSource(file: string): string {
  const patch = readFileSync('upstream/t3-0.1.11-obsidian-host-v1.patch', 'utf8');
  const section = patch.split(`diff --git a/${file} b/${file}\n`)[1]?.split('\ndiff --git ')[0];
  if (!section) throw new Error('Patch source missing: ' + file);
  return section.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n');
}
