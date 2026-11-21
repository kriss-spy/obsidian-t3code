import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';
import { readAddedPatchSource } from './patch-source';
test('patched server proof reads only a private regular challenge file without following symlinks', () => {
  const m = {exports:{} as {obsidianHostProof:(file:string, env:string) => {proof:string}|null}};
  new Function('module','exports','require',transformSync(readAddedPatchSource('apps/server/src/obsidianHostProof.ts'),{loader:'ts',format:'cjs'}).code)(m,m.exports,createRequire(import.meta.url));
  const root = mkdtempSync(path.join(tmpdir(), 't3-proof-server-'));
  try {
    const file = path.join(root, 't3-code-host-12345678-1234-1234-1234-123456789abc');
    const token = 'ab'.repeat(32);
    writeFileSync(file, token, {mode:0o600});
    assert.equal(m.exports.obsidianHostProof(file, 'local')?.proof, createHash('sha256').update(token+':local').digest('hex'));
    chmodSync(file, 0o644);assert.equal(m.exports.obsidianHostProof(file, 'local'), null);
    chmodSync(file, 0o600);
    const link = path.join(root, 't3-code-host-22345678-1234-1234-1234-123456789abc');symlinkSync(file, link);
    assert.equal(m.exports.obsidianHostProof(link, 'local'), null);
    assert.equal(m.exports.obsidianHostProof(path.join(root, 'other-private-file'), 'local'), null);
  } finally {rmSync(root,{recursive:true,force:true});}
});
