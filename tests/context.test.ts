import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureContext, encodeContext } from '../src/context';
import type { Editor } from 'obsidian';
test('context captures unsaved content without saving, and encodes fences losslessly', () => {
  let value = '# Unsaved\n```md\n秘密\\notes\n```\n';
  const editor = {getValue:()=>value, getSelection:()=>value, getCursor:(which:string)=>which === 'from' ? {line:2,ch:0} : {line:5,ch:0}} as Editor;
  const captured = captureContext(editor, '空 格#.md', false);
  value = 'changed after capture';
  assert.equal(captured.markdown.startsWith('# Unsaved'), true);
  const encoded = encodeContext(captured);
  assert.deepEqual(JSON.parse(encoded.slice(encoded.indexOf('\n```json\n') + 9, -4)), captured);
  assert.deepEqual(captureContext(editor, 'note.md', true).lines, {from:3,to:5});
  value = ''; assert.throws(() => captureContext(editor, 'note.md', true));
});
