import { readObsidianTheme } from '../../src/theme';
import { readObsidianFontCSS } from '../../src/fonts';
import { createGuest } from '../../src/guest';

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
  console.log('threecode-compat: '+message);
}
async function until(condition:()=>boolean) {
  const deadline=Date.now()+15000;
  while(!condition()){
    if(Date.now()>deadline)throw Error('Obsidian UI did not settle: '+document.body.textContent?.slice(-1800));
    await new Promise(resolve=>window.setTimeout(resolve,50));
  }
}
export async function checkCompatibility(app: any) {
  const host = app as {plugins:{plugins:Record<string,any>;disablePlugin(id:string):Promise<void>;enablePlugin(id:string):Promise<void>};setting:any};
  let plugin=host.plugins.plugins.threecode;
  check(plugin,'Plugin must load');
  host.setting.open();host.setting.openTabById('threecode');
  await until(()=>!!document.body.textContent?.includes('Download necessary files'));
  check(document.body.textContent?.includes('Download necessary files'),'Settings must render');
  await plugin.setDraftFormatting(true);
  await host.plugins.disablePlugin('threecode');await host.plugins.enablePlugin('threecode');
  plugin=host.plugins.plugins.threecode;
  check(plugin?.settings.formatDraftLinks===true,'Setting must survive reload');
  const palette=readObsidianTheme(document.body);
  check(Object.keys(palette.colors).length===61,'Theme must resolve all palette roles');
  check((await readObsidianFontCSS(document.body)).includes('--font-composer:'),'Fonts must resolve');
  check(typeof (app.metadataCache as any).computeMetadataAsync==='function','Draft metadata parser must exist');
  const parsed=await (app.metadataCache as any).computeMetadataAsync(new TextEncoder().encode('[[Example]]').buffer);
  check(parsed.links?.[0]?.link==='Example','Draft parser must parse wikilinks');
  host.setting.close();
  // Missing components must produce the setup state without attempting a server connection.
  console.log('threecode-compat: Opening workspace');
  const view=await plugin.openWorkspace();
  check(view.contentEl.textContent?.includes('Download'),'Missing components must show setup guidance');
  const returned:string[]=[];
  const origin={leaf:view.leaf,current:()=>true,focus:async()=>{},bridge:{
    beginDraft:async()=>({id:crypto.randomUUID(),text:'original',cwd:app.vault.adapter.getBasePath()}),
    returnDraft:async(_id:string,text:string)=>{returned.push(text);},cancelDraft:async()=>{},
  }};
  for(const cancel of [false,true]){
    await plugin.draftNotes.open(origin);
    const editor=app.workspace.activeLeaf?.view;
    check(editor?.file,'Draft must open in native Markdown view');
    const file=editor.file;
    editor.editor.setValue('edited');
    await plugin.draftNotes.finish(editor,cancel);
    check(!app.vault.getAbstractFileByPath(file.path),'Completed draft must leave the vault');
    check(await app.vault.adapter.exists('.trash/'+file.name),'Draft removal must use local trash');
  }
  check(returned.length===1 && returned[0]==='edited','Return must deliver once; Cancel must not deliver');
  const guest=createGuest(document,'threecode-ci-'+crypto.randomUUID(),'about:blank');
  try{
    await new Promise<void>((resolve,reject)=>{
      const timer=window.setTimeout(()=>reject(Error('Webview failed to load')),15000);
      guest.addEventListener('dom-ready',()=>{window.clearTimeout(timer);resolve();},{once:true});
      document.body.append(guest);
    });
    const globals=await guest.executeJavaScript('({require:typeof require,process:typeof process})') as {require:string;process:string};
    check(globals.require==='undefined' && globals.process==='undefined','Guest must not expose Node globals');
  }finally{guest.remove();}
  await host.plugins.disablePlugin('threecode');
  return {checks:['plugin load/reload','settings persistence','theme and font resolution','draft metadata','missing component state','native draft Return/Cancel and trash','sandboxed webview','plugin disable']};
}
