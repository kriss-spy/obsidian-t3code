import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatDraftLinks, type DraftLink, type DraftDestination} from '../src/draft-links';
const destination: DraftDestination = {path:'Notes/A note.md',lines:14,headings:[
  {heading:'Start',level:1,position:{start:{line:0}}},
  {heading:'Nested',level:2,position:{start:{line:2}}},
  {heading:'Final',level:1,position:{start:{line:9}}},
]};
function link(text: string, original: string, target: string): DraftLink {
  const offset = text.indexOf(original);return {link:target,original,position:{start:{offset},end:{offset:offset+original.length}}};
}
test('wikilinks become T3 mentions with full filenames and paths relative to the captured project',()=>{
  const text='Read [[A note#Start|First]] and [[A note#Final]].';
  const result=formatDraftLinks(text,[link(text,'[[A note#Start|First]]','A note#Start'),link(text,'[[A note#Final]]','A note#Final')],'/vault','/vault/project',()=>destination);
  assert.equal(result,'Read [A note.md:1-9](../Notes/A%20note.md:1-9) and [A note.md:10-14](../Notes/A%20note.md:10-14) .');
});
test('existing relative and absolute file paths keep their encoding while alias labels become filenames',()=>{
  const text='[agentsmd](study/AI/agentsmd.md) [Theo](/vault/resources/contacts/Theo.md) [Matt Pocock](/vault/resources/contacts/Matt%20Pocock.md) [daily notes.md](logs%20and%20review/daily%20notes.md)';
  const entries=[['[agentsmd](study/AI/agentsmd.md)','study/AI/agentsmd.md'],['[Theo](/vault/resources/contacts/Theo.md)','/vault/resources/contacts/Theo.md'],['[Matt Pocock](/vault/resources/contacts/Matt%20Pocock.md)','/vault/resources/contacts/Matt%20Pocock.md'],['[daily notes.md](logs%20and%20review/daily%20notes.md)','logs%20and%20review/daily%20notes.md']];
  const result=formatDraftLinks(text,entries.map(([original,target])=>link(text,original,target)),'/vault','/vault',()=>{throw Error('Existing Markdown file paths must not be resolved again');});
  assert.equal(result,'[agentsmd.md](study/AI/agentsmd.md) [Theo.md](/vault/resources/contacts/Theo.md) [Matt Pocock.md](/vault/resources/contacts/Matt%20Pocock.md) [daily notes.md](logs%20and%20review/daily%20notes.md) ');
});
test('external links and code omitted by metadata stay intact',()=>{
  const text='`[[Missing]]` [Web](https://example.com) [[A note]]';
  const result=formatDraftLinks(text,[link(text,'[Web](https://example.com)','https://example.com'),link(text,'[[A note]]','A note')],'/vault','/vault',()=>destination);
  assert.equal(result,'`[[Missing]]` [Web](https://example.com) [A note.md](Notes/A%20note.md) ');
});
test('missing and duplicate headings, block links, draft-local links and stale metadata fail without partial text',()=>{
  for(const target of ['A note#Missing','A note#^block','#Start']) {
    const text=`[[${target}]]`;
    assert.throws(()=>formatDraftLinks(text,[link(text,text,target)],'/vault','/vault',()=>destination));
  }
  const text='[[A note#Start]]';
  assert.throws(()=>formatDraftLinks(text,[link(text,text,'A note#Start')],'/vault','/vault',()=>({...destination,headings:[...destination.headings!,destination.headings![0]]})),/ambiguous/);
  assert.throws(()=>formatDraftLinks('changed',[link(text,text,'A note#Start')],'/vault','/vault',()=>destination),/metadata changed/);
});
test('encoded hash characters remain filename characters and filenames escape Markdown emphasis',()=>{
  const text='[Alias](Notes/A%20%23note.md) [[100%]] [[__init__]]';
  const result=formatDraftLinks(text,[link(text,'[Alias](Notes/A%20%23note.md)','Notes/A%20%23note.md'),link(text,'[[100%]]','100%'),link(text,'[[__init__]]','__init__')],'/vault','/vault',target=>({path:target==='100%'?'100%.md':'__init__.py',lines:1}));
  assert.equal(result,'[A #note.md](Notes/A%20%23note.md) [100%.md](100%25.md) [\\_\\_init\\_\\_.py](__init__.py) ');
});

test('formatting adds the whitespace boundaries required by T3 without duplicating adjacent spaces',()=>{
  const text='See[[A]][[B]].';
  const result=formatDraftLinks(text,[link(text,'[[A]]','A'),link(text,'[[B]]','B')],'/vault','/vault',target=>({path:target+'.md',lines:1}));
  assert.equal(result,'See [A.md](A.md) [B.md](B.md) .');
});
test('root-level heading references use T3 line suffixes with an explicit relative path',()=>{
  const text='[[Note#Start]]';
  const result=formatDraftLinks(text,[link(text,text,'Note#Start')],'/vault','/vault',()=>({path:'Note.md',lines:4,headings:[{heading:'Start',level:1,position:{start:{line:0}}},{heading:'End',level:1,position:{start:{line:2}}}]}));
  assert.equal(result,'[Note.md:1-2](./Note.md:1-2) ');
});
