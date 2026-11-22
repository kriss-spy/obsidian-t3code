import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import type { T3View } from '../src/view';
import type T3Plugin from '../src/main';

const bundle = buildSync({stdin:{contents:"export { registerExplorerDrops } from './src/explorer-drops'; export { T3View } from './src/view';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian','electron']}).outputFiles[0].text;
const nativeRequire = createRequire(import.meta.url);
function fixture(kind: 'file' | 'folder', visible = false) {
  const module = {exports:{} as {T3View:new (...args:any[])=>T3View;registerExplorerDrops:(plugin:T3Plugin,doc:Document)=>void}};
  class Element {
    closest() { return this; }
    getAttribute() { return kind === 'file' ? 'Note.md' : 'Folder'; }
  }
  class TFile {path='Note.md';extension='md';}
  class TFolder {path='Folder';}
  const elements: Array<{removed:boolean;style:{setProperty:()=>void};remove:()=>void;addClass:()=>void;addEventListener:()=>void;getBoundingClientRect:()=>{left:number;right:number;top:number;bottom:number}}> = [];
  const body = {appendChild:()=>{}};
  const doc = {
    body, defaultView:{Element,setTimeout:(fn:()=>void)=>{fn();return 1;}},
    createDocumentFragment:()=>({createDiv:()=>{
      const element={removed:false,style:{setProperty:()=>{}},remove(){this.removed=true;},addClass:()=>{},addEventListener:()=>{},getBoundingClientRect:()=>({left:100,right:200,top:100,bottom:150})};
      elements.push(element);return element;
    }}),
  };
  class ItemView {contentEl={ownerDocument:doc};app:any;constructor(public leaf:any){}}
  new Function('require','module','exports',bundle)((name:string)=>name==='obsidian'?{ItemView,TFile,TFolder,Notice:class{}}:nativeRequire(name),module,module.exports);
  let active = 'note';
  let revealCount=0, focusCount=0, targetCount=0, appendCount=0;
  const captured: string[][]=[];
  const handlers = new Map<string,(event:any)=>void>();
  const unregister: Array<()=>void> = [];
  const leaf={view:null as unknown as T3View};
  const workspace={getLeavesOfType:()=>[leaf],revealLeaf:async()=>{revealCount++;active='t3';visible=true;},setActiveLeaf:()=>{focusCount++;active='t3';}};
  const plugin={settings:{origin:'http://127.0.0.1:39176'},app:{workspace,vault:{getAbstractFileByPath:()=>kind==='file'?new TFile():new TFolder()}},referenceDrags:{capture:(paths:string[])=>{captured.push(paths);return 'token';}},register:(fn:()=>void)=>unregister.push(fn),registerDomEvent:(_doc:Document,name:string,fn:(event:any)=>void)=>handlers.set(name,fn)};
  const view = new module.exports.T3View(leaf,plugin);
  leaf.view=view;
  Object.assign(view,{app:plugin.app,containerEl:{ownerDocument:doc},guest:{getBoundingClientRect:()=>({x:0,y:0,width:visible?400:0,height:visible?300:0}),focus:()=>{focusCount++;}},bridge:{referenceDropTarget:async()=>{targetCount++;return {target:'composer',route:'/',rect:{x:100,y:100,width:100,height:50},viewport:{width:400,height:300}};},appendReferences:async()=>{appendCount++;}}});
  module.exports.registerExplorerDrops(plugin as unknown as T3Plugin,doc as unknown as Document);
  const event=(x:number,y:number,extra:Record<string,unknown>={})=>({clientX:x,clientY:y,button:0,target:new Element(),prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra});
  const emit=(name:string,e=event(0,0))=>{handlers.get(name)?.(e);return e;};
  const settle=async()=>{for(let n=0;n<8;n++)await Promise.resolve();};
  return {view,elements,captured,emit,event,settle,unregister,state:()=>({active,revealCount,focusCount,targetCount,appendCount})};
}

for (const kind of ['file','folder'] as const) {
  for (const end of ['outside','escape','dragend'] as const) {
    test(`${kind} drag from explorer preserves the active note when T3 is hidden (${end})`, async()=>{
      const f=fixture(kind);
      f.emit('pointerdown');
      f.emit('pointermove',f.event(6,0));
      f.emit('dragstart',f.event(6,0,{dataTransfer:{setData:()=>{}}}));
      await f.settle();
      assert.equal(f.state().active,'note');
      assert.equal(f.state().revealCount,0);
      assert.equal(f.state().focusCount,0);
      assert.equal(f.elements.length,0);
      assert.equal(f.state().targetCount,0);
      const e=end==='outside'?f.emit('pointerup',f.event(50,50)):f.emit(end==='escape'?'keydown':'dragend',f.event(50,50,{key:'Escape'}));
      await f.settle();
      assert.equal(e.prevented,false);
      assert.equal(e.stopped,false);
      assert.equal(f.state().active,'note');
      assert.equal(f.state().appendCount,0);
      assert.deepEqual(f.captured,[[kind==='file'?'Note.md':'Folder']]);
    });
  }
  test(`${kind} reference drop into a visible T3 composer activates only on successful drop`,async()=>{
    const f=fixture(kind,true);
    f.emit('pointerdown');f.emit('pointermove',f.event(6,0));
    await f.settle();
    assert.equal(f.elements.length,1);
    assert.equal(f.state().active,'note');
    assert.equal(f.state().revealCount,0);
    assert.equal(f.state().focusCount,0);
    const e=f.emit('pointerup',f.event(125,125));
    await f.settle();
    assert.equal(e.prevented,true);
    assert.equal(e.stopped,true);
    assert.equal(f.state().appendCount,1);
    assert.equal(f.state().active,'t3');
    assert(f.elements.every(element=>element.removed));
  });
}

for (const kind of ['file','folder'] as const) {
  test(`${kind} drag outside a visible T3 composer leaves the active note and normal drop unchanged`,async()=>{
    const f=fixture(kind,true);
    f.emit('pointerdown');f.emit('pointermove',f.event(6,0));
    await f.settle();
    assert.equal(f.elements.length,1);
    const e=f.emit('pointerup',f.event(50,50));
    await f.settle();
    assert.equal(e.prevented,false);
    assert.equal(e.stopped,false);
    assert.equal(f.state().active,'note');
    assert.equal(f.state().focusCount,0);
    assert.equal(f.state().revealCount,0);
    assert.equal(f.state().appendCount,0);
    assert(f.elements.every(element=>element.removed));
  });
  test(`${kind} drag cancellation cleans up a composer zone prepared asynchronously`,async()=>{
    const f=fixture(kind,true);
    f.emit('pointerdown');f.emit('pointermove',f.event(6,0));
    f.emit('keydown',f.event(6,0,{key:'Escape'}));
    await f.settle();
    assert.equal(f.state().active,'note');
    assert.equal(f.state().revealCount,0);
    assert.equal(f.state().focusCount,0);
    assert.equal(f.state().appendCount,0);
    assert.equal(f.elements.length,1);
    assert(f.elements.every(element=>element.removed));
  });
}
