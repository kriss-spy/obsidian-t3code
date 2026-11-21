import { electronHost } from './electron-host';
import { captureContext, encodeContext } from './context';
import { openLocalMarkdown } from './navigation';
import type { FileRequest } from './host-contract';
import { FileSystemAdapter, Notice, Plugin } from 'obsidian';
import { canonicalDirectory } from './scope';
import { defaults, SettingsTab, type Settings } from './settings';
import { partitionFor, savedTarget, serverOrigin } from './connection';
import { T3View, VIEW_TYPE } from './view';

export default class T3Plugin extends Plugin {
  settings: Settings = { ...defaults };
  diagnostic = 'Connection has not been checked.';
  vaultRoot = '';
  private opening = new WeakMap<Document, Promise<T3View>>();
  async onload() {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) throw new Error('T3 Code requires a local desktop vault.');
    this.vaultRoot = canonicalDirectory(adapter.getBasePath());
    const data: unknown = await this.loadData();
    const raw = data && typeof data === 'object' ? data as Partial<Settings> : {};
    try { this.settings.origin = serverOrigin(raw.origin ?? defaults.origin); } catch { /* Retain safe default. */ }
    this.settings.notePlacement = raw.notePlacement === 'split' ? 'split' : 'tab';
    this.settings.followAppearance = typeof raw.followAppearance === 'boolean' ? raw.followAppearance : true;
    this.settings.target = savedTarget(raw.target, this.settings.origin);
    this.registerView(VIEW_TYPE, leaf => new T3View(leaf, this));
    this.addSettingTab(new SettingsTab(this));
    const open = () => { void this.openWorkspace().catch(() => new Notice('Could not open T3 Code.')); };
    this.addCommand({ id: 'open', name: 'Open T3 Code', callback: open });
    this.addRibbonIcon('terminal', 'Open T3 Code', open);
    this.addCommand({id:'focus-workspace',name:'Focus T3 Code',callback:()=>{
      void this.openWorkspace().then(()=>this.app.workspace.leftSplit.collapse()).catch(()=>new Notice('Could not focus T3 Code.'));
    }});
    const add = (editor: import('obsidian').Editor, view: import('obsidian').MarkdownView, selection: boolean) => {
      if (!view.file) { new Notice('Open a Markdown note before adding context.'); return; }
      const captured = captureContext(editor, view.file.path, selection);
      void this.openWorkspace().then(target => target.appendContext(encodeContext(captured))).catch(error => new Notice(error instanceof Error ? error.message : 'Could not add context to T3.'));
    };
    this.addCommand({id:'add-selection',name:'Add selection to T3',editorCheckCallback:(checking,editor,view) => {
      if (!editor.getSelection() || !view.file) return false;
      if (!checking) add(editor, view as import('obsidian').MarkdownView, true);
      return true;
    }});
    this.addCommand({id:'add-note',name:'Add current note to T3',editorCallback:(editor,view) => add(editor, view as import('obsidian').MarkdownView, false)});
    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
      if (!view.file) return;
      const note = captureContext(editor, view.file.path, false);
      const selection = editor.getSelection() ? captureContext(editor, view.file.path, true) : null;
      const append = (context: typeof note) => { void this.openWorkspace().then(target => target.appendContext(encodeContext(context))).catch(error => new Notice(String(error))); };
      menu.addItem(item => item.setTitle('Add selection to T3').setIcon('text-select').setDisabled(!selection).onClick(() => {if(selection) append(selection);}));
      menu.addItem(item => item.setTitle('Add current note to T3').setIcon('file-text').onClick(() => append(note)));
    }));
    this.registerEvent(this.app.workspace.on('css-change', () => this.syncAppearance()));
  }
  openMarkdown(request: FileRequest, verifiedEnvironmentId: string, isCurrent?: () => boolean, anchor?: import('obsidian').WorkspaceLeaf) { return openLocalMarkdown(this.app, this.vaultRoot, verifiedEnvironmentId, request, isCurrent, anchor, this.settings.notePlacement); }
  syncAppearance() { for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) void (leaf.view as T3View).syncAppearance(); }
  async saveSettings() {
    // Whitelist persisted fields. Never spread descriptor, guest state, or pairing data.
    await this.saveData({ origin: serverOrigin(this.settings.origin), followAppearance: this.settings.followAppearance,
      target: savedTarget(this.settings.target, this.settings.origin), notePlacement:this.settings.notePlacement });
  }
  openWorkspace(): Promise<T3View> {
    const owner = this.app.workspace.getMostRecentLeaf()?.view.containerEl.ownerDocument ?? activeDocument;
    const pending = this.opening.get(owner);
    if (pending) return pending;
    const opening = this.openOnce(owner).finally(() => { this.opening.delete(owner); });
    this.opening.set(owner, opening);
    return opening;
  }
  private async openOnce(owner: Document) {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE).find(leaf => leaf.view.containerEl.ownerDocument === owner);
    const leaf = existing ?? this.app.workspace.getLeaf('tab');
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, {focus:true});
    return leaf.view as T3View;
  }
  async reconnect() {
    await Promise.all(this.app.workspace.getLeavesOfType(VIEW_TYPE).map(leaf => (leaf.view as T3View).connect()));
  }
  async resetConnection() {
    const partition = partitionFor(this.vaultRoot, this.settings.origin);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) (leaf.view as T3View).disconnect();
    try {
      // Electron's session API is available through Obsidian's desktop remote bridge.
      const electron = electronHost();
      const session = electron.remote?.session?.fromPartition(partition);
      if (!session) throw new Error('Session API unavailable');
      await session.clearStorageData();
      await session.clearCache();
      this.settings.target = '/';
      await this.saveSettings();
      this.diagnostic = 'This vault connection was reset.';
    } catch { this.diagnostic = 'Connection disconnected. Browser storage reset is unavailable on this host.'; }
    new Notice(this.diagnostic);
  }
  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      (leaf.view as T3View).disconnect();
      leaf.detach();
    }
  }
}
