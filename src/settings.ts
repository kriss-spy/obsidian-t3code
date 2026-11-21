import { PluginSettingTab, Setting, Notice } from 'obsidian';
import type T3Plugin from './main';
import { serverOrigin } from './connection';
export interface Settings { origin: string; followAppearance: boolean; target: string }
export const defaults: Settings = { origin: 'http://127.0.0.1:3773', followAppearance: true, target: '/' };
export class SettingsTab extends PluginSettingTab {
  constructor(private plugin: T3Plugin) { super(plugin.app, plugin); }
  display() {
    this.containerEl.empty();
    let address = this.plugin.settings.origin;
    new Setting(this.containerEl).setName('T3 server').setDesc('Existing server origin. Pairing stays in T3.').addText(t =>
      t.setValue(address).onChange(value => { address = value; })).addButton(b => b.setButtonText('Connect').onClick(async () => {
        try {
          const origin = serverOrigin(address);
          this.plugin.settings.origin = origin;
          this.plugin.settings.target = '/';
          await this.plugin.saveSettings();
          await this.plugin.reconnect();
          this.display();
        } catch { new Notice('Enter an HTTPS origin or a loopback HTTP origin without credentials or a path.'); }
      }));
    new Setting(this.containerEl).setName('Follow Obsidian appearance').addToggle(t =>
      t.setValue(this.plugin.settings.followAppearance).onChange(async value => {
        this.plugin.settings.followAppearance = value;
        await this.plugin.saveSettings();
        this.plugin.syncAppearance();
      }));
    new Setting(this.containerEl).setName('Reset connection').setDesc('Clears only this vault and server browser partition.').addButton(b =>
      b.setButtonText('Reset').onClick(async () => { await this.plugin.resetConnection(); this.display(); }));
    this.containerEl.createEl('p', {text:'Recommended: the official Obsidian agent skills teach Markdown, Bases, Canvas, and Obsidian tools. Install them in your T3 agent setup.'});
    this.containerEl.createEl('a', {text:'Obsidian agent skills: current installation instructions', href:'https://github.com/obsidianmd/obsidian-skills#installation', attr:{target:'_blank',rel:'noopener noreferrer'}});
    new Setting(this.containerEl).setName('Compatibility').setDesc(this.plugin.diagnostic);
    this.containerEl.createEl('textarea', { attr: { readonly: 'true', 'aria-label': 'Compatibility diagnostics' }, text: this.plugin.diagnostic });
  }
}
