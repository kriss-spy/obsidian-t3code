import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformSync } from 'esbuild';
import { readAddedPatchSource } from './patch-source';
import { translateTheme, contrast } from '../src/theme';
const source = {'background-primary':'#202020','background-secondary':'#161616','text-normal':'#dddddd','interactive-accent':'#8855ee'};
const palette = translateTheme(source,'dark');
// The role list is the pinned upstream schema, not a separate implementation fixture.
const roles = Object.keys(palette.colors);
function fixture() {
  let stored: string|null=null, selected='ocean', mode='dark', halves:any={light:'iris'}, choice: (themeId?:string)=>void=()=>{}, writing=0, failAppearance=0;
  let painted:Record<string,string>={};
  const library=new Map<string,any>([['ocean',{id:'ocean',appearance:'dark'}]]);
  const module={exports:{} as any};
  const api={
    refreshTheme:()=>{painted={...library.get(selected)?.colors};},
    getThemeSnapshot:()=>({theme:selected,resolvedTheme:mode,appearanceMode:mode,themeHalves:halves}),
    setTheme:(id:string)=>{selected=id;halves=null;if(!writing)choice(id);return true;},
    setAppearanceMode:(value:string)=>{if(failAppearance-->0)return false;mode=value;if(!writing)choice();return true;},
    setThemeHalf:(appearance:string,id:string)=>{halves={...halves,[appearance]:id};if(!writing)choice(id);return true;},
  };
  const theme={getThemeColorVariable:(role:string)=>role,getThemeDefinition:(id:string)=>library.get(id)??null,serializeThemeFile:JSON.stringify,
    parseThemeFile:(input:any)=>{if(!['light','dark'].includes(input.appearance))throw Error('Invalid appearance');return {...input,label:input.name};},
    installCustomTheme:(value:any)=>{assert(!library.has(value.id));library.set(value.id,value);},
    updateCustomTheme:(value:any)=>{if(!writing)choice();library.set(value.id,value);},removeCustomTheme:(id:string)=>library.delete(id)};
  const ownership={onObsidianThemeChoice:(listener:(themeId?:string)=>void)=>{choice=listener;return ()=>{choice=()=>{};}},setObsidianThemeFollowing:()=>{},writeObsidianTheme:(callback:()=>any)=>{writing++;try{return callback();}finally{writing--;}}};
  const code=transformSync(readAddedPatchSource('apps/web/src/obsidianTheme.ts'),{loader:'ts',format:'cjs'}).code;
  new Function('require','module','exports','window','crypto','document',code)((name:string)=>name.includes('lib/utils')?{randomUUID:()=>globalThis.crypto.randomUUID()}:name.includes('themePalettes')?{THEME_COLOR_ROLES:roles}:name.includes('useTheme')?api:name.includes('Ownership')?ownership:theme,module,module.exports,{localStorage:{getItem:()=>stored,setItem:(_key:string,value:string)=>{stored=value;}}},globalThis.crypto,{documentElement:{style:{getPropertyValue:(role:string)=>painted[role]}}});
  let current=true;
  const create=()=>module.exports.createObsidianThemeHost(()=>current);
  return {host:create(),create,library,api,choice:(themeId?:string)=>choice(themeId),fail:()=>{failAppearance=1;},stale:()=>{current=false;}};
}
const token='00000000-0000-4000-8000-000000000001';
const request=(revision:number,extra={})=>({token,revision,enabled:true,palette,...extra});
test('translation supplies the complete pinned role set with readable text and statuses',()=>{
  const pinned=readAddedPatchSource('apps/web/src/obsidianTheme.ts');
  assert.match(pinned,/THEME_COLOR_ROLES/);
  assert.equal(roles.length,61);
  for(const appearance of ['light','dark'] as const){
    const result=translateTheme({...source,'background-primary':appearance==='light'?'#fafafa':'#202020','text-normal':'#888888'},appearance).colors;
    assert(Object.values(result).every(color=>/^#[0-9a-f]{6}$/.test(color)));
    for(const [fg,bg] of [['text','canvas'],['accentForeground','accent'],['codeForeground','codeBackground'],['errorForeground','errorSurface'],['sidebarForeground','sidebar']])assert(contrast(result[fg],result[bg])>=4.5);
  }
  assert.throws(()=>translateTheme({...source,'text-normal':'rgb(1,2,3)'},'dark'),/Cannot resolve/);
  assert.throws(()=>translateTheme({},'dark'),/Cannot resolve/);
});
test('host retains last palette when disabled and reuses only its unchanged owned definition',()=>{
  const f=fixture();f.host.configure(request(1));const id=f.api.getThemeSnapshot().theme;
  f.host.configure(request(2,{enabled:false}));assert.equal(f.api.getThemeSnapshot().theme,id);
  f.host.configure(request(3,{palette:translateTheme({...source,'interactive-accent':'#cc5566'},'dark')}));assert.equal(f.api.getThemeSnapshot().theme,id);
  f.library.set(id,{...f.library.get(id),label:'User edit'});
  f.host.configure(request(4));assert.notEqual(f.api.getThemeSnapshot().theme,id);assert.equal(f.library.get(id).label,'User edit');
});
test('manual override survives reconnect and explicit enable supersedes it',()=>{
  const f=fixture();f.host.configure(request(1));f.api.setTheme('ocean');
  assert.equal(f.host.configure(request(2)).suspended,true);assert.equal(f.api.getThemeSnapshot().theme,'ocean');
  f.host.dispose();const next=f.create();assert.equal(next.configure(request(1)).suspended,true);
  assert.equal(next.configure(request(2,{token:'00000000-0000-4000-8000-000000000002'})).following,true);
});
test('failed second setter rolls back theme, appearance and mixed halves and removes unused install',()=>{
  const f=fixture();f.fail();assert.throws(()=>f.host.configure(request(1)),/rejected/);
  assert.deepEqual(f.api.getThemeSnapshot(),{theme:'ocean',resolvedTheme:'dark',appearanceMode:'dark',themeHalves:{light:'iris'}});
  assert.equal(f.library.size,1);f.host.configure(request(2));assert.match(f.api.getThemeSnapshot().theme,/^obsidian-/);
});
test('invalid complete palettes and stale requests do not install; cleanup rejects pending writes',()=>{
  const f=fixture();assert.throws(()=>f.host.configure(request(1,{palette:{...palette,colors:{canvas:'#000000'}}})),/complete/);
  assert.equal(f.library.size,1);f.host.configure(request(2));assert.throws(()=>f.host.configure(request(1)),/Stale/);
  f.stale();assert.throws(()=>f.host.configure(request(3)),/Stale/);
  f.host.dispose();assert.throws(()=>f.host.configure(request(4)),/Stale/);
});

test('selecting the owned Obsidian palette resumes and rejects queued disabled updates',()=>{
  const f=fixture();f.host.configure(request(1));const id=f.api.getThemeSnapshot().theme;
  f.api.setTheme('ocean');assert.equal(f.host.status().following,false);
  f.host.configure(request(2,{enabled:false}));
  f.api.setThemeHalf('dark',id);assert.equal(f.host.status().following,true);
  assert.equal(f.host.configure(request(3,{enabled:false})).following,true);
  const changed=translateTheme({...source,'interactive-accent':'#336699'},'light');
  f.host.configure(request(4,{palette:changed}));
  assert.equal(f.api.getThemeSnapshot().theme,id);assert.equal(f.api.getThemeSnapshot().resolvedTheme,'light');
  assert.equal(f.api.getThemeSnapshot().themeHalves,null);
});
test('a pending resume survives reconnect before the plugin acknowledges it',()=>{
  const f=fixture();f.host.configure(request(1));const id=f.api.getThemeSnapshot().theme;
  f.api.setTheme('ocean');f.host.configure(request(2,{enabled:false}));f.api.setTheme(id);
  f.host.dispose();const next=f.create();
  assert.equal(next.configure(request(1,{enabled:false})).following,true);
  assert.equal(next.configure(request(2)).following,true);
});
test('explicit plugin disable wins over a pending resume and keeps the complete palette',()=>{
  const f=fixture();f.host.configure(request(1));const id=f.api.getThemeSnapshot().theme;
  f.api.setTheme(id);const disabled={token:'00000000-0000-4000-8000-000000000002',enabled:false};
  assert.equal(f.host.configure(request(2,disabled)).following,false);
  assert.equal(f.api.getThemeSnapshot().theme,id);
  f.api.setTheme(id);assert.equal(f.host.status().following,true);
});
test('same-name or user-edited palettes do not claim Obsidian theme following',()=>{
  const f=fixture();f.host.configure(request(1));const id=f.api.getThemeSnapshot().theme;
  f.api.setTheme('ocean');f.host.configure(request(2,{enabled:false}));
  f.library.set('lookalike',{id:'lookalike',name:'Obsidian'});f.api.setTheme('lookalike');assert.equal(f.host.status().following,false);
  f.library.set(id,{...f.library.get(id),label:'User edit'});f.api.setTheme(id);assert.equal(f.host.status().following,false);
  assert.equal(f.library.get(id).label,'User edit');
});

test('reselecting the active generated palette clears mixed halves even when colors are unchanged',()=>{
  const f=fixture();f.host.configure(request(1));const id=f.api.getThemeSnapshot().theme;
  f.api.setThemeHalf('dark',id);assert.notEqual(f.api.getThemeSnapshot().themeHalves,null);
  f.host.configure(request(2));assert.equal(f.api.getThemeSnapshot().themeHalves,null);
  assert.equal(f.host.status().following,true);assert.equal(f.host.status().requested,false);
});
