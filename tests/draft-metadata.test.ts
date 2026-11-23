import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {MetadataCache} from 'obsidian';
import {draftMetadata} from '../src/draft-metadata';

test('custom-extension drafts use the native parser with the exact UTF-8 editor text',async()=>{
  const text='草稿 [[Note#Heading]] 📝\n`[[ignored]]`';
  const parsed={links:[]};
  const cache={computeMetadataAsync:async(data:ArrayBuffer)=>{assert.equal(new TextDecoder().decode(data),text);return parsed;}};
  assert.equal(await draftMetadata(cache as unknown as MetadataCache,text),parsed);
});
test('an unavailable native parser reports a recoverable error',async()=>{
  await assert.rejects(draftMetadata({} as MetadataCache,''),/draft is preserved/);
});
test('a failed native parse cannot return an unchecked draft',async()=>{
  const cache={computeMetadataAsync:async()=>undefined};
  await assert.rejects(draftMetadata(cache as unknown as MetadataCache,'[[Note]]'),/could not parse/);
});
