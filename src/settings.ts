import { PluginSettingTab, Notice, type SettingDefinitionItem } from 'obsidian';
import type T3Plugin from './main';
import { COMPONENT_ASSETS } from './component-release';
import { serverOrigin } from './connection';
export interface Settings { origin: string; followAppearance: boolean; target: string; notePlacement: 'tab' | 'split' }
export const defaults: Settings = { origin: 'http://127.0.0.1:3773', followAppearance: true, target: '/', notePlacement: 'tab' };
export class SettingsTab extends PluginSettingTab {
  constructor(private plugin: T3Plugin) { super(plugin.app, plugin); }
  getSettingDefinitions(): SettingDefinitionItem[] {
    let address = this.plugin.settings.origin;
    return [
      {name:'Necessary files', desc:this.plugin.componentMessage,render:setting => {
        setting.addButton(b => b.setButtonText(this.plugin.downloading ? 'Downloading…' : 'Download necessary files').setDisabled(this.plugin.downloading).onClick(() => this.plugin.downloadComponents('core')));
        setting.setDesc(this.plugin.componentMessage + ' Download: ' + (COMPONENT_ASSETS.core.bytes/1000000).toFixed(1) + ' MB. Office previews and bundled device models are excluded.');
      }},
      {name:'Extra fonts',desc:this.plugin.fontMessage,render:setting => {
        setting.addButton(b => b.setButtonText('Download extra fonts').setDisabled(this.plugin.downloading).onClick(() => this.plugin.downloadComponents('fonts')));
        setting.setDesc(this.plugin.fontMessage + ' Optional Inter and terminal symbols: ' + (COMPONENT_ASSETS.fonts.bytes/1000000).toFixed(1) + ' MB.');
      }},

      {name:'T3 server',desc:'Existing server origin. Pairing stays in T3.',render:setting => {
        setting.addText(t => t.setValue(address).onChange(value => { address = value; }));
        setting.addButton(b => b.setButtonText('Connect').onClick(async () => {
          let origin: string;
          try { origin = serverOrigin(address); }
          catch { new Notice('Enter an HTTPS origin or a loopback HTTP origin without credentials or a path.'); return; }
          b.setDisabled(true).setButtonText('Connecting…');
          try {
            this.plugin.settings.origin = origin;
            this.plugin.settings.target = '/';
            await this.plugin.saveSettings();
            await this.plugin.reconnect(true);
            // reconnect only visits existing views. First-run setup needs a tab too.
            await this.plugin.openWorkspace();
            new Notice(this.plugin.diagnostic);
            this.update();
          } catch { new Notice('Could not save or reconnect to T3. Check the connection status.'); }
          finally { b.setDisabled(false).setButtonText('Connect'); }
        }));
      }},
      {name:'Open Markdown notes',desc:'Applies to explicit Obsidian opening. Plain clicks keep the T3 preview.',render:setting => {
        setting.addDropdown(d => d.addOption('tab','Same tab group').addOption('split','Split beside T3').setValue(this.plugin.settings.notePlacement).onChange(async value => {
          this.plugin.settings.notePlacement = value === 'split' ? 'split' : 'tab';
          await this.plugin.saveSettings();
        }));
      }},
      {name:'Use Obsidian font',desc:'T3 controls its colors and theme. Only the font follows Obsidian.',render:setting => {
        setting.addToggle(t => t.setValue(this.plugin.settings.followAppearance).onChange(async value => {
          this.plugin.settings.followAppearance = value;
          await this.plugin.saveSettings();
          this.plugin.syncAppearance();
        }));
      }},
      {name:'Reset connection',desc:'Clears only this vault and server browser partition.',render:setting => {
        setting.addButton(b => b.setButtonText('Reset').onClick(async () => { await this.plugin.resetConnection(); this.update(); }));
      }},
      {name:'Obsidian agent skills',desc:'The official skills teach Markdown, Bases, Canvas, and Obsidian tools. Install them in your T3 agent setup.',render:setting => {
        setting.controlEl.createEl('a', {text:'Installation instructions',href:'https://github.com/obsidianmd/obsidian-skills#installation',attr:{target:'_blank',rel:'noopener noreferrer'}});
      }},
      {name:'Compatibility',desc:this.plugin.diagnostic,render:setting => {
        setting.controlEl.createEl('textarea', {attr:{readonly:'true','aria-label':'Compatibility diagnostics'},text:this.plugin.diagnostic});
      }},
    ];
  }
}
