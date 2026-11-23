// Enable unmodified Frontmatter Templater and Templater with default templates in the fixture.
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault]=process.argv.slice(2);
if(!vault||!path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-'))throw Error('Supply a disposable fixture vault.');
const c=await connectDevelopmentVault(endpoint,vault);
try {
  const result=await c.evaluate(`(async()=>{
    const p=app.plugins.plugins.threecode,t=app.plugins.plugins['frontmatter-templater'],tt=app.plugins.plugins['templater-obsidian'];
    if(!tt?.settings.trigger_on_file_creation)throw Error('Templater must be enabled with automatic processing.');
    if(!p?.draftNotes||!t?.settings.defaultTemplate)throw Error('Both candidate and default-template plugin must be enabled.');
    const leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0];
    if(!leaf)throw Error('Open a fixture T3 tab first.');
    const cases=[];
    for(const text of ['', '   ', 'existing composer input', '<% "TEMPLATE_SCRIPT_MUST_NOT_EXECUTE" %>']) {
      const id=crypto.randomUUID();
      await p.draftNotes.open({leaf,current:()=>true,focus:async()=>{},bridge:{
        beginDraft:async()=>({id,text,cwd:app.vault.adapter.getBasePath()}),
        returnDraft:async()=>{},cancelDraft:async()=>{},
      }});
      const view=app.workspace.activeLeaf.view,file=view.file;
      if(file.extension!=='t3draft'||view.getViewType()!=='markdown')throw Error('Expected a scratch draft in the native Markdown editor.');
      await new Promise(resolve=>window.setTimeout(resolve,1200));
      cases.push({input:text,editor:view.getViewData(),disk:await app.vault.read(file)});
      await view.leaf.openFile(app.vault.getFileByPath(t.settings.defaultTemplate));
      await view.leaf.openFile(file);
      await new Promise(resolve=>window.setTimeout(resolve,700));
      cases.push({input:text,editor:view.getViewData(),disk:await app.vault.read(file)});
      await p.draftNotes.finish(view,true);
      view.leaf.detach();await app.vault.delete(file);
    }
    const ordinary=await app.vault.create('Ordinary template check '+crypto.randomUUID()+'.md','');
    await new Promise(resolve=>window.setTimeout(resolve,1200));
    const ordinaryContent=await app.vault.read(ordinary);
    await app.vault.delete(ordinary);
    return {cases,ordinaryContent};
  })()`);
  for(const item of result.cases){assert.equal(item.editor,item.input,'Default template must not change composer text in editor');assert.equal(item.disk,item.input,'Default template must not change saved composer text');}
  assert(result.ordinaryContent.includes('DEFAULT_TEMPLATE_MUST_NOT_ENTER_DRAFT'),'Ordinary notes must retain default templates');
  console.log(JSON.stringify({defaultTemplateBypassed:true,cases:result.cases.length,ordinaryTemplatePreserved:true,templaterScriptsPreserved:true}));
} finally {c.close();}
