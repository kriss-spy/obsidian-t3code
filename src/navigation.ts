import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { MarkdownView, Notice, type App, type TFile, type WorkspaceLeaf } from 'obsidian';
import type { FileRequest } from './host-contract';
import { containsDirectory } from './scope';

// Obsidian's desktop external-file lookup is isolated here for compatibility tests.
export function externalMarkdownFile(app: App, absolutePath: string): TFile | null {
  return app.vault.getFileByPath('file:' + absolutePath);
}
export async function openLocalMarkdown(app: App, vaultRoot: string, localEnvironmentId: string, request: FileRequest, isCurrent: () => boolean = () => true, anchor?: WorkspaceLeaf, placement: 'tab' | 'split' = 'tab'): Promise<boolean> {
  if (request.environmentId !== localEnvironmentId || !path.isAbsolute(request.path) || !/\.md$/i.test(request.path)) return false;
  let resolved: string;
  try {
    resolved = await realpath(request.path);
    if (!(await stat(resolved)).isFile()) throw new Error('Not a file');
  } catch { new Notice('Markdown file not found: ' + request.path); return true; }
  if (!isCurrent()) return false;
  let file = containsDirectory(vaultRoot, resolved)
    ? app.vault.getFileByPath(path.relative(vaultRoot, resolved).split(path.sep).join('/'))
    : externalMarkdownFile(app, resolved);
  if (!file) { new Notice('Obsidian could not open: ' + resolved); return true; }
  let existing: WorkspaceLeaf | undefined;
  if (!request.newTab) for (const candidate of app.workspace.getLeavesOfType('markdown')) {
    const opened = candidate.view instanceof MarkdownView ? candidate.view.file : null;
    const state: unknown = candidate.view.getState();
    const statePath = state && typeof state === 'object' && 'file' in state && typeof state.file === 'string' ? state.file : null;
    const openedPath = opened?.path ?? statePath;
    if (!openedPath) continue;
    const physicalPath = openedPath.startsWith('file:/') ? openedPath.slice(5) : path.join(vaultRoot, openedPath);
    try { if (await realpath(physicalPath) === resolved) { existing = candidate; if (opened) file = opened; break; } } catch { /* Missing and virtual editors cannot establish filesystem identity. */ }
  }
  if (!isCurrent()) return false;
  if (!existing && anchor) app.workspace.setActiveLeaf(anchor, {focus:false});
  const leaf = existing ?? (request.newTab || placement === 'tab' ? app.workspace.getLeaf('tab') : app.workspace.getLeaf('split', 'vertical'));
  await leaf.openFile(file, {active:true});
  await app.workspace.revealLeaf(leaf);
  const view = leaf.view;
  if (request.line !== undefined && view instanceof MarkdownView) {
    const line = Math.max(0, Math.min(view.editor.lineCount() - 1, request.line - 1));
    const ch = Math.max(0, Math.min(view.editor.getLine(line).length, (request.column ?? 1) - 1));
    view.editor.setCursor({line, ch});
    view.editor.scrollIntoView({from:{line,ch},to:{line,ch}}, true);
  }
  return true;
}
