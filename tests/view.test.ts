import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import type { T3View } from '../src/view';

const bundle = buildSync({entryPoints:['src/view.ts'],bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian','electron','./fonts']}).outputFiles[0].text;
const nativeRequire = createRequire(import.meta.url);
function fixture(readFonts:()=>Promise<string>=async()=>':root{--font-sans:test-font}') {
  const module = {exports:{} as {T3View:new (...args:any[])=>T3View}};
  const body = {};
  class ItemView {contentEl={removeClass:()=>{},ownerDocument:{body,defaultView:{getComputedStyle:()=>({fontFamily:'test-font'})}}};}
  new Function('require','module','exports',bundle)((name:string)=>name==='obsidian'?{ItemView}:name==='./fonts'?{readObsidianFontCSS:readFonts}:nativeRequire(name),module,module.exports);
  const plugin = {settings:{origin:'http://127.0.0.1:39176',followAppearance:true}};
  const view = new module.exports.T3View({},plugin);
  // The real boundary is Electron's asynchronous stylesheet API.
  const pending:Array<(key:string)=>void>=[];
  const removed:string[]=[];
  const guest={classList:{add:()=>{}},insertCSS:()=>new Promise<string>(resolve=>pending.push(resolve)),removeInsertedCSS:async(key:string)=>{removed.push(key);},remove:()=>{}};
  Object.assign(view,{guest});
  return {view,plugin,pending,removed};
}

test('overlapping appearance updates remove superseded styles, including after disconnect', async () => {
  const f=fixture();
  // Match the legacy global style API as well as the owning window's API.
  const old=Object.getOwnPropertyDescriptor(globalThis,'getComputedStyle');
  Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({fontFamily:'test-font'})});
  try {
    const first=f.view.syncAppearance();
    await Promise.resolve();
    f.plugin.settings.followAppearance=false;
    const second=f.view.syncAppearance();
    f.pending[1]('new');await second;
    f.pending[0]('old');await first;
    assert.deepEqual(f.removed,['old']);
    const third=f.view.syncAppearance();
    await Promise.resolve();
    assert.deepEqual(f.removed,['old','new']);
    f.view.disconnect();
    f.pending[2]('closing');await third;
    assert.deepEqual(f.removed,['old','new','closing']);
  } finally {
    if(old)Object.defineProperty(globalThis,'getComputedStyle',old);
    else Reflect.deleteProperty(globalThis,'getComputedStyle');
  }
});

test('disabling font following cancels an older font-resource read before stylesheet insertion', async()=>{
  let ready!:(css:string)=>void;
  const f=fixture(()=>new Promise(resolve=>{ready=resolve;}));
  const loading=f.view.syncAppearance();
  f.plugin.settings.followAppearance=false;
  const disabled=f.view.syncAppearance();
  assert.equal(f.pending.length,1);
  f.pending[0]('disabled');await disabled;
  ready(':root{--font-sans:stale-font}');await loading;
  assert.equal(f.pending.length,1);
  f.view.disconnect();
});
