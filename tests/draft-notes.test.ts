import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import type {DraftNotes} from '../src/draft-notes';
const bundle=buildSync({entryPoints:['src/draft-notes.ts'],bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian']}).outputFiles[0].text;
const nativeRequire=createRequire(import.meta.url);
function fixture() {
  class WorkspaceTabs {}
  const notices:Array<{message:string;visible:boolean}>=[];
  class Notice {
    visible=true;
    constructor(public message:string) {notices.push(this);}
    setMessage(message:string) {this.message=message;return this;}
    hide() {this.visible=false;}
  }
  class MarkdownView {
    file: any;
    text='';
    nativeActions:any[]=[];
    containerEl={contains:(action:any)=>this.nativeActions.includes(action)&&!action.removed};
    contentEl={};
    addAction(icon:string,title:string,click:()=>void) {
      const action={icon,title,click,removed:false,dataset:{} as Record<string,string>,attributes:{} as Record<string,string>,
        setAttribute(name:string,value:string){this.attributes[name]=value;},remove(){this.removed=true;}};
      this.nativeActions.push(action);return action;
    }
    async save() {files.set(this.file,this.text);}
    getViewData() {return this.text;}
  }
  const module={exports:{} as {DraftNotes:typeof DraftNotes}};
  new Function('require','module','exports',bundle)((name:string)=>name==='obsidian'?{MarkdownView,WorkspaceTabs,Notice}:nativeRequire(name),module,module.exports);
  const files=new Map<any,string>(),leaves:any[]=[],events=new Set<(...args:any[])=>void>();
  const deleted:any[]=[],returned:string[]=[],canceled:string[]=[],focused:string[]=[];
  const app={vault:{
    create:async(path:string,text:string)=>{const f={path,extension:path.split('.').pop()};files.set(f,text);return f;},
    modify:async(f:any,text:string)=>{files.set(f,text);for(const event of events)event(f,text,{links:[]});},
    delete:async(f:any)=>{deleted.push(f);files.delete(f);},
    read:async(f:any)=>files.get(f),
  },metadataCache:{computeMetadataAsync:async()=>({links:[]}),on:(_name:string,cb:(...args:any[])=>void)=>{events.add(cb);return cb;},offref:(cb:(...args:any[])=>void)=>events.delete(cb)},workspace:{
    getLeavesOfType:()=>leaves.filter(leaf=>!leaf.closed),
    createLeafInParent:(parent:any)=>{const view=new MarkdownView();const leaf={parent,view,closed:false,openFile:async(f:any)=>{view.file=f;view.text=files.get(f)!;},detach:()=>{leaf.closed=true;}};leaves.push(leaf);return leaf;},
    revealLeaf:async()=>{},
  }};
  let formatting=false;
  const notes=new module.exports.DraftNotes(app as any,'/vault',()=>formatting);
  let current=true,fail=false,returnCalls=0;
  const origin=(id:string)=>({leaf:{parent:new WorkspaceTabs()} as any,current:()=>current,focus:async()=>{focused.push(id);},bridge:{
    beginDraft:async()=>({id,text:'initial '+id,cwd:'/vault'}),
    returnDraft:async(_id:string,text:string)=>{returnCalls++;if(fail)throw Error('lost acknowledgement');returned.push(text);},
    cancelDraft:async(id:string)=>{canceled.push(id);},
  }});
  return {notes,origin,leaves,files,deleted,returned,canceled,focused,app,notices,setFormatting:(value:boolean)=>{formatting=value;},setCurrent:(value:boolean)=>{current=value;},setFailure:(value:boolean)=>{fail=value;},calls:()=>returnCalls};
}
test('drafts open in sibling tabs, return latest unsaved text and clean up only after acknowledgement',async()=>{
  const f=fixture(),origin=f.origin('one');
  const opening=f.notes.open(origin);assert.equal(f.notes.open(origin),opening);await opening;
  assert.equal(f.leaves[0].parent,origin.leaf.parent);
  assert.equal(f.leaves[0].view.file.extension,'t3draft');
  const view=f.leaves[0].view;view.text='unsaved latest';
  await f.notes.finish(view);
  assert.deepEqual(f.returned,['unsaved latest']);assert.deepEqual(f.focused,['one']);
  assert.equal(f.deleted.length,1);assert.equal(f.notes.has(view.file),false);
});
test('cancel deletes only its draft and preserves composer; an ended connection cannot return to another target',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));await f.notes.open(f.origin('two'));
  await f.notes.finish(f.leaves[0].view,true);
  assert.deepEqual(f.canceled,['one']);assert.equal(f.calls(),0);assert.equal(f.files.size,1);assert.equal(f.deleted[0],f.leaves[0].view.file);assert.equal(f.leaves[0].closed,true);
  f.setCurrent(false);
  await assert.rejects(f.notes.finish(f.leaves[1].view),/connection ended/);
  assert.equal(f.calls(),0);assert.equal(f.notes.has(f.leaves[1].view.file),true);
});
test('lost acknowledgements preserve the note until a successful retry deletes it',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));
  const view=f.leaves[0].view;view.text='first return';f.setFailure(true);
  await assert.rejects(f.notes.finish(view),/lost acknowledgement/);
  assert.equal(f.files.size,1);assert.equal(f.notes.has(view.file),true);
  view.text='later edit';f.setFailure(false);await f.notes.finish(view);
  assert.deepEqual(f.returned,['first return']);assert.equal(f.deleted.length,1);assert.equal(f.files.has(view.file),false);assert.equal(f.leaves[0].closed,true);
});
test('deleting a draft note releases only its own editing request',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));await f.notes.open(f.origin('two'));
  f.notes.discard(f.leaves[0].view.file);
  assert.deepEqual(f.canceled,['one']);assert.equal(f.notes.has(f.leaves[0].view.file),false);
  assert.equal(f.notes.has(f.leaves[1].view.file),true);assert.equal(f.calls(),0);
});

test('native Return action displays a persistent notice when its target rejects the draft',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));const view=f.leaves[0].view;f.setFailure(true);
  view.nativeActions[0].click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(f.notices.at(-1)!.message,/lost acknowledgement/);assert.equal(f.notices.at(-1)!.visible,true);
  assert.equal(f.files.size,1);
});
test('a stalled parser reports its stage, times out, and allows a safe retry',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture();await f.notes.open(f.origin('one'));const view=f.leaves[0].view;
  f.setFormatting(true);f.app.metadataCache.computeMetadataAsync=()=>new Promise(()=>{});
  const returning=f.notes.finish(view);
  const rejected=assert.rejects(returning,/Reading draft links timed out/);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(view.nativeActions[0].attributes['aria-label'],'Reading draft links…');
  assert.equal(view.nativeActions[0].attributes['aria-disabled'],'true');
  t.mock.timers.tick(10000);await rejected;
  assert.equal(view.nativeActions[0].attributes['aria-disabled'],'false');
  assert.equal(f.calls(),0);assert.equal(f.files.size,1);
  f.app.metadataCache.computeMetadataAsync=async()=>({links:[]});await f.notes.finish(view);
  assert.equal(f.calls(),1);
});

test('native header actions are removed on completion and unload',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));await f.notes.open(f.origin('two'));
  assert.equal(f.leaves[0].view.nativeActions.length,2);await f.notes.finish(f.leaves[0].view);
  assert(f.leaves[0].view.nativeActions.every((action:any)=>action.removed));
  f.notes.close();assert(f.leaves[1].view.nativeActions.every((action:any)=>action.removed));
});
test('native note menus offer Return and Cancel through the same draft operations',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));const view=f.leaves[0].view,items:any[]=[];
  const menu={addItem(callback:(item:any)=>void){const item={title:'',icon:'',disabled:false,click:()=>{},setTitle(value:string){this.title=value;return this;},setIcon(value:string){this.icon=value;return this;},setDisabled(value:boolean){this.disabled=value;return this;},onClick(value:()=>void){this.click=value;return this;}};callback(item);items.push(item);}};
  f.notes.addMenuItems(menu as any,view);assert.deepEqual(items.map(item=>item.title),['Return draft to T3 Code','Cancel draft editing']);
  items[1].click();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.canceled,['one']);assert.equal(f.calls(),0);
});

test('formatting defaults off and returns existing Markdown paths and wikilinks byte for byte',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));const view=f.leaves[0].view;
  const text='[Alias](relative/A%20note.md) [[New note|Display]]';view.text=text;
  f.app.metadataCache.computeMetadataAsync=async()=>{throw Error('Formatting must be skipped');};
  await f.notes.finish(view);assert.deepEqual(f.returned,[text]);
});
test('enabling formatting while a draft is open normalizes its labels on return',async()=>{
  const f=fixture();await f.notes.open(f.origin('one'));const view=f.leaves[0].view;
  const text='[Theo](resources/Theo.md)';view.text=text;
  f.app.metadataCache.computeMetadataAsync=async()=>({links:[{link:'resources/Theo.md',original:text,position:{start:{offset:0},end:{offset:text.length}}}]} as any);
  f.setFormatting(true);await f.notes.finish(view);assert.deepEqual(f.returned,['[Theo.md](resources/Theo.md) ']);
});

test('cancel deletes the draft even when its T3 connection has ended',async()=>{
  const f=fixture();const origin=f.origin('one');
  origin.bridge.cancelDraft=async()=>{throw Error('connection ended');};
  await f.notes.open(origin);f.setCurrent(false);
  await f.notes.finish(f.leaves[0].view,true);
  assert.equal(f.files.size,0);assert.equal(f.leaves[0].closed,true);assert.equal(f.calls(),0);
});
