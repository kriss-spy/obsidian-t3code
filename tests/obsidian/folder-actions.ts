import type { FolderAction } from '../../src/folder-actions';

function check(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
  console.log('threecode-compat: ' + message);
}
async function until(test:()=>boolean) {
  const end=Date.now()+10000;
  while (!test()) {
    if (Date.now()>end) throw Error('Folder UI did not settle: '+document.body.textContent?.slice(-3000));
    await new Promise(resolve=>setTimeout(resolve,50));
  }
}
export async function checkCompatibility(app:any) {
  await app.vault.createFolder('Parent/Child');
  await app.vault.create('Parent/Child/Child.md','# Folder note');
  const root=app.vault.adapter.getBasePath();
  const request={type:'folder' as const,id:'folder-test',generation:'test',environmentId:'local',route:'/',path:root+'/Parent/Child'};
  let plugin=app.plugins.plugins.threecode;
  const run=(folderAction:FolderAction)=>{plugin.settings.folderAction=folderAction;return plugin.openMarkdown(request,'local');};
  check(plugin.settings.folderAction==='default','Existing installs default to native folder behavior');
  await new Promise(resolve=>setTimeout(resolve,1000));
  Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Maybe later')?.click();
  check(await run('default')===false,'Default declines folder interception');
  for (const closed of [false,true]) {
    if (closed) app.workspace.getLeavesOfType('file-explorer').forEach((leaf:any)=>leaf.detach());
    check(await run('explorer'),'Core explorer handles folders');
    const leaf=app.workspace.getLeavesOfType('file-explorer')[0];
    await until(()=>!!leaf?.view.fileItems?.['Parent/Child']);
    await until(()=>!!leaf.view.containerEl.querySelector('[data-path="Parent/Child"]'));
    check(!leaf.view.fileItems.Parent.el.classList.contains('is-collapsed'),'Core explorer expands parent folder');
    check(leaf.view.containerEl.querySelector('[data-path="Parent/Child"]'),'Core explorer renders requested folder');
  }
  check(await run('note'),'Folder note action handles folder');
  check(app.workspace.getActiveFile()?.path==='Parent/Child/Child.md','Folder note opens existing Markdown note');
  for (const closed of [false,true]) {
    if (closed) app.workspace.getLeavesOfType('notebook-navigator').forEach((leaf:any)=>leaf.detach());
    check(await run('notebook'),'Notebook Navigator handles folder');
    const api=app.plugins.plugins['notebook-navigator'].api;
    await until(()=>api.selection.getNavItem()?.folder?.path==='Parent/Child');
    check(app.workspace.getLeavesOfType('notebook-navigator').length,'Notebook Navigator opens closed pane');
  }
  for (const closed of [false,true]) {
    if (closed) app.workspace.getLeavesOfType('file-tree-view').forEach((leaf:any)=>leaf.detach());
    localStorage.removeItem('fileTreePlugin-ActiveFolderPath');
    check(await run('tree'),'File Tree Alternative handles folder');
    await until(()=>localStorage.getItem('fileTreePlugin-ActiveFolderPath')==='Parent/Child');
    check(app.workspace.getLeavesOfType('file-tree-view').length,'File Tree Alternative opens closed pane and selects requested folder');
  }
  plugin.settings.folderAction='note';plugin.settings.folderNoteName='index.md';await plugin.saveSettings();
  await app.plugins.disablePlugin('threecode');await app.plugins.enablePlugin('threecode');
  plugin=app.plugins.plugins.threecode;
  check(plugin.settings.folderAction==='note' && app.plugins.plugins.threecode.settings.folderNoteName==='index.md','Folder settings survive reload');
  await app.plugins.disablePlugin('notebook-navigator');
  check(await run('notebook'),'Unavailable navigator consumes action without native fallback');
  return {checks:['folder setting default/persistence','core explorer open/closed','existing folder note','Notebook Navigator open/closed','File Tree Alternative open/closed','plugin unavailable']};
}
