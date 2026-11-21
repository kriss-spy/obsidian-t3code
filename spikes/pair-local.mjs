import { spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
const vault = process.argv[2];
if (!vault) throw new Error('Usage: node spikes/pair-local.mjs <vault>');
// Keep pairing credentials in memory. Never print command output or the URL.
const pair = spawnSync('npx', ['--yes', 't3@0.1.11', 'pair', '--scope', 'orchestration:read', '--scope', 'filesystem:read', '--ttl', '5m', '--label', 'Obsidian integration spike (read-only)'], { encoding: 'utf8' });
if (pair.status) throw new Error('Local pairing command failed; output withheld.');
const urls = (pair.stdout + pair.stderr).match(/https?:\/\/[^\s\u001b]+/g) || [];
const url = urls.find(value => /pair|token|bootstrap/i.test(value));
if (!url) throw new Error('No pairing URL found; output withheld.');
const parsed = new URL(url);
const localHosts = ['localhost', '127.0.0.1', ...Object.values(networkInterfaces()).flat().filter(Boolean).map(entry => entry.address)];
if (!localHosts.includes(parsed.hostname)) throw new Error('Pair URL was not on this machine.');
parsed.hostname = '127.0.0.1';
const result = spawnSync('obsidian', [`vault=${vault}`, 'eval', `code=(async()=>{await window.__t3Spike.guest.loadURL(${JSON.stringify(parsed.toString())}); return "Read-only pairing URL loaded; credential withheld.";})()`], { encoding: 'utf8' });
if (result.status || /Error:/.test(result.stdout)) throw new Error('Pairing load failed; output withheld.');
console.log('Read-only pairing URL loaded; credential withheld.');
