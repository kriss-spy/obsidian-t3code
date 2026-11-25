import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { readingReference } from '../src/reading-references';
import type T3Plugin from '../src/main';

function reference(source: string, image = false, local = false, reading = true) {
  const node = {textContent:'Wiki [record]',getAttribute:(name:string)=>name === 'alt' ? 'Iroha' : name === 'src' || name === 'href' ? source : null};
  const target = {closest:(selector:string)=>{
    if(selector === '.markdown-reading-view')return reading ? node : null;
    if(selector === 'img')return image ? node : null;
    if(selector === '.internal-embed[src]')return local ? node : null;
    if(selector === 'a[href]')return image ? null : node;
    return null;
  }} as unknown as Element;
  const lookups: string[][]=[];
  const plugin = {vaultRoot:'/vault',app:{workspace:{getLeavesOfType:()=>[{view:{containerEl:{contains:()=>true},file:{path:'Notes/source.md'}}}]},metadataCache:{getFirstLinkpathDest:(link:string,from:string)=>{
    lookups.push([link,from]);return link === 'Iroha 空.png' ? {path:'Images/Iroha 空.png'} : null;
  }}}} as unknown as T3Plugin;
  return {text:readingReference(plugin,target),lookups};
}

test('local image embeds resolve against the source note, including spaces and Unicode',()=>{
  const r=reference('Iroha 空.png',true,true);
  assert.equal(r.text,`![Iroha](<${path.resolve('/vault','Images/Iroha 空.png').replace(/\\/g,'/')}>)`);
  assert.deepEqual(r.lookups,[['Iroha 空.png','Notes/source.md']]);
});

test('reading links retain their URL and escape Markdown labels',()=>{
  assert.equal(reference('https://example.com/a?q=1#x').text,'[Wiki \\[record\\]](<https://example.com/a?q=1#x>)');
});

test('unknown vault files, resource URLs, and non-reading sources remain untouched',()=>{
  for(const source of ['missing.png','app://resource/image.png','javascript:alert(1)','data:image/png;base64,abc']) {
    assert.equal(reference(source,true,true).text,null);
  }
  assert.equal(reference('https://example.com',false,false,false).text,null);
});
