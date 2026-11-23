import { PluginSettingTab, Notice, type SettingDefinitionItem } from 'obsidian';
import type T3Plugin from './main';
import { COMPONENT_ASSETS } from './component-release';
import { serverOrigin } from './connection';
export interface Settings { origin: string; followAppearance: boolean; followTheme: boolean; themeFollowToken: string; target: string; notePlacement: 'tab' | 'split'; formatDraftLinks: boolean }
export const defaults: Settings = { origin: 'http://127.0.0.1:3773', followAppearance: true, followTheme: false, themeFollowToken: '', target: '/', notePlacement: 'tab', formatDraftLinks:false };
export class SettingsTab extends PluginSettingTab {
  constructor(private plugin: T3Plugin) { super(plugin.app, plugin); }
  getSettingDefinitions(): SettingDefinitionItem[] {
    let address = this.plugin.settings.origin;
    return [
      {name:'Necessary files', desc:this.plugin.componentMessage,render:setting => {
        setting.addButton(b => b.setButtonText(this.plugin.deleting === 'core' ? 'Deleting…' : this.plugin.downloading ? 'Downloading…' : this.plugin.componentsInstalled ? 'Delete' : 'Download necessary files').setDisabled(this.plugin.downloading || this.plugin.deleting !== null).onClick(() => this.plugin.componentsInstalled ? this.plugin.deleteComponents('core') : this.plugin.downloadComponents('core')));
        setting.setDesc(this.plugin.componentMessage + ' Download: ' + (COMPONENT_ASSETS.core.bytes/1000000).toFixed(1) + ' MB. Office previews and bundled device models are excluded.');
      }},
      {name:'Extra fonts',desc:this.plugin.fontMessage,render:setting => {
        setting.addButton(b => b.setButtonText(this.plugin.deleting === 'fonts' ? 'Deleting…' : this.plugin.fontsInstalled ? 'Delete' : 'Download extra fonts').setDisabled(this.plugin.downloading || this.plugin.deleting !== null).onClick(() => this.plugin.fontsInstalled ? this.plugin.deleteComponents('fonts') : this.plugin.downloadComponents('fonts')));
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
      {name:'Follow Obsidian theme',desc:'Follow this window’s colors and light or dark appearance. Choosing another T3 theme or appearance turns this off. Choosing the generated Obsidian theme resumes following. Turning this off keeps the last palette.',render:setting => {
        setting.addToggle(t => t.setValue(this.plugin.settings.followTheme).onChange(value => this.plugin.setFollowTheme(value)));
      }},
      {name:'Format draft links on return',desc:'Convert wikilinks to T3 file mentions and use full filenames as link labels. Keep existing Markdown file paths. Off returns the draft text exactly as edited.',render:setting => {
        setting.addToggle(t => t.setValue(this.plugin.settings.formatDraftLinks).onChange(async value => {
          try { await this.plugin.setDraftFormatting(value); }
          catch { new Notice('Could not save the draft formatting setting.'); this.update(); }
        }));
      }},
      {name:'Follow Obsidian fonts',desc:'Use the interface font for T3 controls, text font for chat and composer, and monospace font for code and terminal. Font sizes stay in T3.',render:setting => {
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
        setting.controlEl.createEl('a', {text:'Link',href:'https://github.com/obsidianmd/obsidian-skills#installation',attr:{target:'_blank',rel:'noopener noreferrer','aria-label':'Obsidian agent skills installation instructions'}});
      }},
      {name:'Compatibility',render:setting => {
        setting.setClass('t3-code-compatibility');
        setting.descEl.createEl('div', {cls:'t3-code-compatibility-status',attr:{role:'status'},text:this.plugin.diagnostic});
      }},
    ];
  }
}
