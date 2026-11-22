import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compatibility, parseDescriptor, partitionFor, savedTarget, serverOrigin } from '../src/connection';

test('origin validation rejects insecure remote endpoints and credential-bearing URLs', () => {
  for (const value of ['http://example.com', 'https://user:secret@example.com', 'https://example.com/?token=secret',
    'https://example.com/#secret', 'https://example.com/pair', 'file:///tmp/a', 'javascript:alert(1)', 'http://127.0.0.1.evil.test']) {
    assert.throws(() => serverOrigin(value), value);
  }
  for (const value of ['http://127.0.0.1:3773', 'http://localhost:3773', 'http://[::1]:3773', 'https://t3.example.com']) {
    assert.equal(serverOrigin(value), value);
  }
});
test('partition isolates vaults and origins deterministically without including paths', () => {
  const p = partitionFor('/vault/a', 'http://localhost:3773');
  assert.equal(p, partitionFor('/vault/a', 'http://localhost:3773'));
  assert.notEqual(p, partitionFor('/vault/b', 'http://localhost:3773'));
  assert.notEqual(p, partitionFor('/vault/a', 'http://localhost:3774'));
  assert.match(p, /^persist:obsidian-t3-code-[a-f0-9]{64}$/);
});
test('workspace state drops pairing data, external targets, and unknown routes', () => {
  const origin = 'http://localhost:3773';
  for (const value of ['/pair?token=secret', '/#secret', 'https://evil.test/thread/abc', '//evil.test', '/thread/abc?token=secret', '/settings', null]) {
    assert.equal(savedTarget(value, origin), '/');
  }
  assert.equal(savedTarget('/thread/abc-123', origin), '/thread/abc-123');
});
test('server admission uses a compatible protocol and minimum version without requiring a custom capability', () => {
  const d = parseDescriptor({ environmentId: 'env', serverVersion: '0.1.11', orchestrationProtocolVersion: 2,
    capabilities: { obsidianHost: true } });
  assert.equal(compatibility(d).supported, true);
  assert.equal(compatibility({...d,serverVersion:'0.1.12'}).supported,true);
  assert.equal(compatibility({...d,serverVersion:'0.1.10'}).supported,false);
  assert.equal(compatibility({...d,orchestrationProtocolVersion:3}).supported,false);
  assert.match(compatibility(d).message, /0.1.11, protocol 2/);
  for (const value of [null, {}, { ...d, capabilities: [] }, { ...d, environmentId: '' }, { ...d, serverVersion: 'secret' }]) {
    assert.throws(() => parseDescriptor(value));
  }
});
