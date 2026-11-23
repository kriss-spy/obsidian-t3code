import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachEscapeFocus } from '../src/escape-focus';
import type { Guest } from '../src/guest';

function fixture() {
  const pending: Array<(value: unknown) => void> = [];
  let blurred = 0, focused = 0, canceled = 0, current = true;
  const guest = {
    executeJavaScript: (code: string) => {
      if (code === 'window.t3ObsidianCancelEscape?.()') {
        canceled++;
        pending.shift()?.(false);
        return Promise.resolve();
      }
      return new Promise(resolve => pending.push(resolve));
    },
    blur: () => { blurred++; },
  } as unknown as Guest;
  const doc = {activeElement: guest as unknown};
  const container = {ownerDocument:doc, tabIndex:0, focus:()=>{focused++;doc.activeElement=container;}};
  const close = attachEscapeFocus(guest, container as unknown as HTMLElement, () => current);
  return {pending, doc, guest, container, close, stale:()=>{current=false;}, counts:()=>({blurred,focused,canceled})};
}

test('unused Escape transfers focus to the host and rearms until disconnect', async () => {
  const f = fixture();
  f.pending.shift()!(true);
  await Promise.resolve();
  assert.deepEqual(f.counts(), {blurred:1,focused:1,canceled:0});
  assert.equal(f.container.tabIndex,-1);
  assert.equal(f.pending.length,1);
  f.close();
  await Promise.resolve();
  assert.equal(f.pending.length,0);
  assert.equal(f.counts().canceled,1);
});

test('a delayed Escape cannot steal focus from another Obsidian control', async () => {
  const f = fixture();
  f.doc.activeElement = {};
  f.pending.shift()!(true);
  await Promise.resolve();
  assert.equal(f.counts().focused,0);
  f.close();
});

test('disconnect and replaced connections cannot transfer focus', async () => {
  for (const stop of ['close','stale'] as const) {
    const f = fixture();
    const resolve = f.pending.shift()!;
    f[stop]();
    resolve(true);
    await Promise.resolve();
    assert.equal(f.counts().focused,0);
    assert.equal(f.pending.length,0);
    if (stop === 'stale') f.close();
  }
});
