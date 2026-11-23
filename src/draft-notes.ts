import { MarkdownView, Notice, WorkspaceTabs, type App, type CachedMetadata, type Menu, type TFile, type WorkspaceLeaf } from 'obsidian';
import { DraftReturnRejected, type HostBridge } from './host-bridge';
import { draftLinkParts, externalDraftLink, formatDraftLinks, lineReference } from './draft-links';
import { draftMetadata } from './draft-metadata';

export interface DraftOrigin {
  leaf: WorkspaceLeaf;
  bridge: Pick<HostBridge,'beginDraft' | 'returnDraft' | 'cancelDraft'>;
  current: () => boolean;
  focus: () => Promise<void>;
}
interface DraftEdit {
  origin: DraftOrigin;
  id: string;
  cwd: string;
  file: TFile;
  busy: boolean;
  returnedText?: string;
  status?: string;
  notice?: Notice;
}
interface DraftActions {
  returnAction: HTMLElement;
  cancelAction: HTMLElement;
}
export class DraftNotes {
  private edits = new Map<TFile,DraftEdit>();
  private opening = new Map<WorkspaceLeaf,Promise<void>>();
  private actions = new Map<MarkdownView,DraftActions>();
  private stopped = false;
  constructor(private app: App, private vaultRoot: string, private formatOnReturn: () => boolean = () => false) {}
  has(file: TFile | null) { return !!file && this.edits.has(file); }
  discard(file: TFile) {
    const edit = this.edits.get(file);
    if (!edit) return;
    edit.notice?.hide();
    this.edits.delete(file);
    void edit.origin.bridge.cancelDraft(edit.id).catch(() => {});
    this.syncActions();
  }
  open(origin: DraftOrigin): Promise<void> {
    const pending = this.opening.get(origin.leaf);
    if (pending) return pending;
    const task = this.openOnce(origin).finally(() => this.opening.delete(origin.leaf));
    this.opening.set(origin.leaf,task);
    return task;
  }
  private assertCurrent(origin: DraftOrigin) {
    if (this.stopped || !origin.current()) throw new Error('The originating T3 connection ended. The draft note is preserved.');
  }
  private async openOnce(origin: DraftOrigin) {
    this.assertCurrent(origin);
    const snapshot = await origin.bridge.beginDraft();
    let created: TFile | undefined;
    try {
      this.assertCurrent(origin);
      const file = await this.app.vault.create(`T3 draft ${snapshot.id}.t3draft`,snapshot.text);
      created = file;
      this.assertCurrent(origin);
      this.edits.set(file,{origin,id:snapshot.id,cwd:snapshot.cwd,file,busy:false});
      // A sibling tab also works in a sidebar and never replaces the running T3 view.
      const parent = origin.leaf.parent;
      if (!(parent instanceof WorkspaceTabs)) throw new Error('The T3 tab group is unavailable. The draft note is preserved.');
      const leaf = this.app.workspace.createLeafInParent(parent,-1);
      await leaf.openFile(file,{active:true,state:{mode:'source',source:false}});
      await this.app.workspace.revealLeaf(leaf);
      this.syncActions();
    } catch (error) {
      if (created) this.edits.delete(created);
      await origin.bridge.cancelDraft(snapshot.id).catch(() => {});
      throw error;
    }
  }
  private async step<T>(edit: DraftEdit, stage: string, operation: () => Promise<T>): Promise<T> {
    edit.status = stage + '…';
    edit.notice?.setMessage(edit.status);
    this.syncActions();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation(),new Promise<never>((_,reject) => {
        timer = setTimeout(() => reject(new Error(stage + ' timed out. Your draft is preserved. Retry Return to check again.')),10000);
      })]);
    } finally { clearTimeout(timer); }
  }
  private async formatText(edit: DraftEdit, text: string): Promise<string> {
    const cache = await this.step(edit,'Reading draft links',() => draftMetadata(this.app.metadataCache,text));
    const links = [...(cache.links ?? []),...(cache.embeds ?? [])];
    const destinations = new Map<string, {path:string;headings:NonNullable<CachedMetadata['headings']>;lines:number}>();
    for (const entry of links) {
      if (externalDraftLink(entry)) continue;
      const {wiki,pathname,heading} = draftLinkParts(entry);
      if ((!wiki && (!heading || lineReference(heading))) || !pathname || destinations.has(pathname)) continue;
      const file = this.app.metadataCache.getFirstLinkpathDest(pathname,edit.file.path);
      const name = pathname.replace(/\.md$/i,'');
      const matches = this.app.vault.getFiles().filter(f => f.path.replace(/\.md$/i,'') === name || f.path.replace(/\.md$/i,'').endsWith('/'+name));
      if (!file || file === edit.file || (matches.length > 1 && !matches.some(f => f.path.replace(/\.md$/i,'') === name))) {
        throw new Error('File link is missing or ambiguous: ' + entry.link);
      }
      const content = file.extension.toLowerCase() === 'md' ? await this.step(edit,'Resolving linked notes',() => this.app.vault.read(file)) : '';
      destinations.set(pathname,{path:file.path,headings:this.app.metadataCache.getFileCache(file)?.headings ?? [],lines:content.split('\n').length});
    }
    return formatDraftLinks(text,links,this.vaultRoot,edit.cwd,pathname => {
      const destination = destinations.get(pathname);
      if (!destination) throw new Error('Could not resolve file link: ' + pathname);
      return destination;
    });
  }
  private async deleteNote(edit: DraftEdit) {
    const leaves = this.app.workspace.getLeavesOfType('markdown').filter(leaf =>
      leaf.view instanceof MarkdownView && leaf.view.file === edit.file);
    for (const leaf of leaves) await (leaf.view as MarkdownView).save();
    for (const leaf of leaves) leaf.detach();
    await this.app.vault.delete(edit.file);
  }
  async finish(view: MarkdownView, cancel = false) {
    const edit = view.file && this.edits.get(view.file);
    if (!edit) throw new Error('This note has no active editing request. Copy its text into T3 Code, or open a new draft.');
    if (edit.busy) return;
    edit.busy = true;
    this.syncActions();
    try {
      if (cancel) {
        await this.step(edit,'Saving draft',() => view.save());
        await this.step(edit,'Canceling editing',() => edit.origin.bridge.cancelDraft(edit.id)).catch(() => {});
        await this.deleteNote(edit);
        this.edits.delete(edit.file);
        if (edit.origin.current()) await edit.origin.focus().catch(() => {});
        new Notice('Draft editing canceled. Temporary note deleted.');
        return;
      }
      this.assertCurrent(edit.origin);
      if (edit.returnedText === undefined) {
        const text = view.getViewData();
        await this.step(edit,'Saving draft',() => view.save());
        const returned = this.formatOnReturn() ? await this.formatText(edit,text) : text;
        if (view.file !== edit.file || view.getViewData() !== text) throw new Error('The note changed during return. Try again.');
        if (returned.length > 2000000) throw new Error('The draft exceeds the 2,000,000-character limit.');
        this.assertCurrent(edit.origin);
        // Keep the exact payload for an idempotent retry if the acknowledgement is lost.
        edit.returnedText = returned;
      }
      await this.step(edit,'Returning draft to T3 Code',() => edit.origin.bridge.returnDraft(edit.id,edit.returnedText!));
      this.edits.delete(edit.file);
      try { await this.deleteNote(edit); }
      catch { new Notice('Draft returned. Could not finish temporary-note cleanup. The note may still be in the vault.'); }
      await edit.origin.focus().catch(() => {});
      await edit.origin.bridge.cancelDraft(edit.id).catch(() => {});
    } catch (error) {
      // A rejected return may be retried after the user resolves links or restores the target.
      if (error instanceof DraftReturnRejected) edit.returnedText = undefined;
      edit.status = error instanceof Error ? error.message : String(error);
      throw error;
    } finally { edit.busy = false; this.syncActions(); }
  }
  run(view: MarkdownView, cancel = false) {
    const edit = view.file && this.edits.get(view.file);
    if (edit?.busy) return;
    if (edit) edit.notice?.hide();
    const notice = new Notice(cancel ? 'Canceling draft editing…' : 'Returning draft to T3 Code…',0);
    if (edit) edit.notice = notice;
    void this.finish(view,cancel).then(() => notice.hide()).catch(error => {
      notice.setMessage(error instanceof Error ? error.message : String(error));
    });
  }
  addMenuItems(menu: Menu, view: MarkdownView) {
    const file = view.file, edit = file && this.edits.get(file);
    if (!edit) return;
    for (const cancel of [false,true]) menu.addItem(item => item
      .setTitle(cancel ? 'Cancel draft editing' : 'Return draft to T3 Code')
      .setIcon(cancel ? 'circle-x' : 'corner-up-left')
      .setDisabled(edit.busy)
      .onClick(() => {
        if (view.file !== file) {new Notice('The draft view changed. Open its menu again.');return;}
        this.run(view,cancel);
      }));
  }
  syncActions() {
    const views = this.app.workspace.getLeavesOfType('markdown').map(leaf => leaf.view).filter((view): view is MarkdownView => view instanceof MarkdownView);
    for (const [view,actions] of this.actions) {
      if (!views.includes(view) || !this.has(view.file) || !view.containerEl.contains(actions.returnAction)) {
        actions.returnAction.remove();actions.cancelAction.remove();this.actions.delete(view);
      }
    }
    if (this.stopped) return;
    for (const view of views) {
      const edit = view.file && this.edits.get(view.file);
      if (!edit) continue;
      let actions = this.actions.get(view);
      if (!actions) {
        const returnAction = view.addAction('corner-up-left','Return draft to T3 Code',() => this.run(view));
        const cancelAction = view.addAction('circle-x','Cancel draft editing',() => this.run(view,true));
        returnAction.dataset.t3DraftAction = 'return';
        cancelAction.dataset.t3DraftAction = 'cancel';
        actions = {returnAction,cancelAction};
        this.actions.set(view,actions);
      }
      actions.returnAction.setAttribute('aria-disabled',String(edit.busy));
      actions.cancelAction.setAttribute('aria-disabled',String(edit.busy));
      actions.returnAction.setAttribute('aria-label',edit.busy ? edit.status ?? 'Returning draft…' : 'Return draft to T3 Code');
    }
  }
  close() {
    this.stopped = true;
    for (const actions of this.actions.values()) {actions.returnAction.remove();actions.cancelAction.remove();}
    this.actions.clear();
    for (const edit of this.edits.values()) {
      edit.notice?.hide();
      void edit.origin.bridge.cancelDraft(edit.id).catch(() => {});
    }
    this.edits.clear();
  }
}
