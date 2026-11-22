import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { containsDirectory, threadScope } from '../src/scope';

test('canonical filesystem scope excludes siblings, outside worktrees, missing and remote metadata', () => {
  const root = mkdtempSync(path.join(tmpdir(), 't3-scope-'));
  try {
    const vault = path.join(root, 'vault');
    const nested = path.join(vault, '子 folder #');
    const outside = path.join(root, 'vault-backup');
    mkdirSync(nested, { recursive: true }); mkdirSync(outside);
    symlinkSync(nested, path.join(root, 'inside-link'), process.platform === 'win32' ? 'junction' : 'dir');
    symlinkSync(outside, path.join(vault, 'outside-link'), process.platform === 'win32' ? 'junction' : 'dir');
    writeFileSync(path.join(vault, 'note.md'), 'fixture');
    const project = { id: 'p', environmentId: 'local', workspaceRoot: vault };
    const thread = { projectId: 'p', environmentId: 'local' };
    const scope = (worktreePath?: string | null) => threadScope(vault, 'local', { ...thread, worktreePath }, project);
    for (const directory of [undefined, null, vault, nested, path.join(root, 'inside-link')]) assert.equal(scope(directory).included, true, directory ?? 'root');
    for (const directory of [outside, path.join(vault, 'outside-link'), '', 'relative', path.join(vault, 'missing'), path.join(vault, 'note.md')]) {
      assert.equal(scope(directory).included, false, directory);
    }
    assert.equal(threadScope(vault, 'local', { ...thread, environmentId: 'remote' }, project).included, false);
    assert.equal(threadScope(vault, 'local', thread, undefined).included, false);
    assert.equal(threadScope(vault, 'local', thread, { ...project, id: 'wrong' }).included, false);
    assert.equal(threadScope(vault, 'local', thread, { ...project, environmentId: 'remote' }).included, false);
    assert.equal(threadScope(vault, 'local', thread, { ...project, workspaceRoot: outside }).included, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('path boundaries follow platform rules, including Windows volume changes', () => {
  assert.equal(containsDirectory('/vault', '/vault/sub', path.posix), true);
  assert.equal(containsDirectory('/vault', '/vault-backup', path.posix), false);
  assert.equal(containsDirectory('C:\\Vault', 'c:\\vault\\child', path.win32), true);
  assert.equal(containsDirectory('C:\\Vault', 'D:\\Vault', path.win32), false);
  assert.equal(containsDirectory('C:\\Vault', 'C:\\Vault-backup', path.win32), false);
});
