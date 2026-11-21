import { FileSystemAdapter, Notice, Plugin } from 'obsidian';
import { canonicalDirectory } from './scope';
import { defaults, SettingsTab, type Settings } from './settings';
import { partitionFor, savedTarget, serverOrigin } from './connection';
import { T3View, VIEW_TYPE } from './view';

export default class T3Plugin extends Plugin {
  settings: Settings = { ...defaults };
  diagnostic = 'Connection has not been checked.';
  vaultRoot = '';
  private opening?: Promise<T3View>;
  async onload() {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) throw new Error('T3 Code requires a local desktop vault.');
    this.vaultRoot = canonicalDirectory(adapter.getBasePath());
    const data: unknown = await this.loadData();
    const raw = data && typeof data === 'object' ? data as Partial<Settings> : {};
    try { this.settings.origin = serverOrigin(raw.origin ?? defaults.origin); } catch { /* Retain safe default. */ }
    this.settings.followAppearance = typeof raw.followAppearance === 'boolean' ? raw.followAppearance : true;
    this.settings.target = savedTarget(raw.target, this.settings.origin);
    this.registerView(VIEW_TYPE, leaf => new T3View(leaf, this));
    this.addSettingTab(new SettingsTab(this));
    const open = () => { void this.openWorkspace().catch(() => new Notice('Could not open T3 Code.')); };
    this.addCommand({ id: 'open', name: 'Open T3 Code', callback: open });
    this.addRibbonIcon('terminal', 'Open T3 Code', open);
  }
  async saveSettings() {
    // Whitelist persisted fields. Never spread descriptor, guest state, or pairing data.
    await this.saveData({ origin: serverOrigin(this.settings.origin), followAppearance: this.settings.followAppearance,
      target: savedTarget(this.settings.target, this.settings.origin) });
  }
  openWorkspace(): Promise<T3View> {
    if (this.opening) return this.opening;
    this.opening = this.openOnce().finally(() => { this.opening = undefined; });
    return this.opening;
  }
  private async openOnce() {
    const owner = this.app.workspace.activeLeaf?.view.containerEl.ownerDocument ?? document;
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE).find(leaf => leaf.view.containerEl.ownerDocument === owner);
    const leaf = existing ?? this.app.workspace.getLeaf('tab');
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
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
      const electron = require('electron');
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
