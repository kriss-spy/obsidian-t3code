import { ItemView, requestUrl, type WorkspaceLeaf, type ViewStateResult } from 'obsidian';
import type T3Plugin from './main';
import { compatibility, parseDescriptor, partitionFor, savedTarget, serverOrigin } from './connection';
import { createGuest, type Guest } from './guest';
export const VIEW_TYPE = 't3-code-workspace';
export class T3View extends ItemView {
  private guest?: Guest;
  private generation = 0;
  private route = '/';
  private cleanup: Array<() => void> = [];
  constructor(leaf: WorkspaceLeaf, private plugin: T3Plugin) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'T3 Code'; }
  getIcon() { return 'terminal'; }
  getState() { return { target: savedTarget(this.route, this.plugin.settings.origin) }; }
  async setState(state: unknown, result: ViewStateResult) {
    this.route = savedTarget((state as { target?: unknown } | null)?.target, this.plugin.settings.origin);
    await super.setState(state, result);
    await this.connect();
  }
  async onOpen() { this.route = this.plugin.settings.target; await this.connect(); }
  async onClose() { this.disconnect(); }
  disconnect() {
    ++this.generation;
    for (const fn of this.cleanup.splice(0)) fn();
    this.guest?.remove();
    this.guest = undefined;
  }
  async connect() {
    this.disconnect();
    const generation = this.generation;
    this.contentEl.empty();
    this.contentEl.addClass('t3-code-workspace');
    this.contentEl.createEl('p', { text: 'Checking T3 compatibility…' });
    try {
      const origin = serverOrigin(this.plugin.settings.origin);
      const response = await requestUrl({ url: origin + '/.well-known/t3/environment', throw: false });
      if (generation !== this.generation) return;
      if (response.status !== 200) throw new Error('Descriptor unavailable');
      const descriptor = parseDescriptor(response.json);
      const status = compatibility(descriptor);
      this.plugin.diagnostic = status.message;
      if (!status.supported) { this.showUnavailable(status.message, origin); return; }
      // This path remains gated until an exact T3 build passes issue #4.
      const guest = createGuest(this.contentEl.ownerDocument, partitionFor(this.plugin.vaultRoot, origin), origin + this.route);
      this.guest = guest;
      const invalidate = () => {
        if (generation !== this.generation) return;
        this.disconnect();
        this.showUnavailable('Navigation invalidated host integration. Reconnect to check compatibility.', origin);
      };
      // All cross-document navigation needs a fresh descriptor and host handshake.
      guest.addEventListener('will-navigate', invalidate);
      guest.addEventListener('render-process-gone', invalidate);
      this.cleanup.push(() => guest.removeEventListener('will-navigate', invalidate),
        () => guest.removeEventListener('render-process-gone', invalidate));
      this.contentEl.empty();
      this.contentEl.appendChild(guest);
    } catch {
      if (generation !== this.generation) return;
      this.plugin.diagnostic = 'Could not read a valid T3 descriptor. Guest not mounted.';
      this.showUnavailable(this.plugin.diagnostic, this.plugin.settings.origin);
    }
  }
  private showUnavailable(message: string, origin: string) {
    this.contentEl.empty();
    this.contentEl.createEl('p', { text: message });
    this.contentEl.createEl('a', { text: 'Open the normal T3 app', href: serverOrigin(origin), attr: { target: '_blank', rel: 'noopener noreferrer' } });
    this.contentEl.createEl('p', { text: 'Development build. Strict vault scope and real file-action hooks must pass before embedding is enabled.' });
    const retry = this.contentEl.createEl('button', { text: 'Check again' });
    retry.onclick = () => { void this.connect(); };
  }
}
