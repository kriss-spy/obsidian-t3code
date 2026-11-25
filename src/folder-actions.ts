import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { Notice, type App, type TFolder, type WorkspaceLeaf } from 'obsidian';
import type { FolderRequest } from './host-contract';
import type { Settings } from './settings';
import { containsDirectory } from './scope';
import { openLocalMarkdown } from './navigation';

export const folderActions = {
  default: 'T3 Code default',
  explorer: 'Reveal in Obsidian file explorer',
  note: 'Open folder note in Obsidian',
  notebook: 'Reveal in Notebook Navigator',
  tree: 'Reveal in File Tree Alternative',
} as const;
export type FolderAction = keyof typeof folderActions;
interface Integrations {
  plugins?: { plugins: Record<string, {
    api?: { navigation?: { navigateToFolder(folder: TFolder): Promise<boolean> } };
  } | undefined> };
}
function integration(app: App, id: string) {
  return (app as App & Integrations).plugins?.plugins[id];
}
export function folderActionAvailable(app: App, action: FolderAction): boolean {
  if (action === 'notebook') return typeof integration(app,'notebook-navigator')?.api?.navigation?.navigateToFolder === 'function';
  if (action === 'tree') return !!integration(app,'file-tree-alternative');
  return true;
}
export function folderNotePath(folder: Pick<TFolder,'name' | 'path'>, template: string): string | null {
  const name = template.replaceAll('{folder}',folder.name);
  if (!name || name.includes('/') || name.includes('\\') || name.includes('\0') || !/\.md$/i.test(name)) return null;
  return folder.path === '/' ? name : folder.path + '/' + name;
}
async function explorerLeaf(app: App, type: string): Promise<WorkspaceLeaf> {
  let leaf = app.workspace.getLeavesOfType(type)[0];
  if (!leaf) {
    leaf = app.workspace.getLeftLeaf(false)!;
    if (!leaf) throw Error('Could not open the explorer pane.');
    await leaf.setViewState({type});
  }
  await app.workspace.revealLeaf(leaf);
  await leaf.loadIfDeferred();
  return leaf;
}
export async function handleFolderAction(app: App, vaultRoot: string, environmentId: string, request: FolderRequest,
  settings: Pick<Settings,'folderAction' | 'folderNoteName' | 'notePlacement'>, isCurrent = () => true, anchor?: WorkspaceLeaf): Promise<boolean> {
  if (settings.folderAction === 'default' || request.environmentId !== environmentId || !path.isAbsolute(request.path)) return false;
  let resolved: string;
  try {
    resolved = await realpath(request.path);
    if (!containsDirectory(vaultRoot,resolved) || !(await stat(resolved)).isDirectory()) return false;
  } catch { return false; }
  if (!isCurrent()) return false;
  const relative = path.relative(vaultRoot,resolved).split(path.sep).join('/') || '/';
  const folder = app.vault.getFolderByPath(relative);
  if (!folder) { new Notice('Folder not found in Obsidian: ' + relative); return true; }
  const action = settings.folderAction;
  if (!folderActionAvailable(app,action)) { new Notice(folderActions[action] + ': required plugin is unavailable.'); return true; }
  try {
    if (action === 'note') {
      const notePath = folderNotePath(folder,settings.folderNoteName);
      if (!notePath) { new Notice('Set a folder note filename ending in .md without a directory path.'); return true; }
      const note = app.vault.getFileByPath(notePath);
      if (!note) { new Notice('Folder note not found: ' + notePath); return true; }
      await openLocalMarkdown(app,vaultRoot,environmentId,{...request,type:'file',path:path.join(vaultRoot,note.path),newTab:true},isCurrent,anchor,settings.notePlacement);
    } else if (action === 'notebook') {
      if (!await integration(app,'notebook-navigator')!.api!.navigation!.navigateToFolder(folder)) throw Error('Notebook Navigator could not reveal this folder.');
    } else if (action === 'explorer') {
      const leaf = await explorerLeaf(app,'file-explorer');
      if (!isCurrent()) return true;
      const view = leaf.view as typeof leaf.view & { revealInFolder?(folder:TFolder): Promise<void> | void };
      if (!view.revealInFolder) throw Error('Obsidian file explorer is unavailable.');
      await view.revealInFolder(folder);
    } else if (action === 'tree') {
      const leaf = await explorerLeaf(app,'file-tree-view');
      // FTA mounts its React event listeners after opening the view.
      const win = leaf.view.containerEl.ownerDocument.defaultView!;
      await new Promise<void>(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve())));
      if (!isCurrent()) return true;
      if (!folderActionAvailable(app,action)) throw Error('File Tree Alternative is unavailable.');
      win.dispatchEvent(new win.CustomEvent('fta-reveal-folder',{detail:{folder}}));
    }
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not perform the folder action.'); }
  return true;
}
