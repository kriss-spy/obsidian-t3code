import { setTimeout as delay } from 'node:timers/promises';
import { serverOrigin, savedTarget } from './connection';
import type { Guest } from './guest';
import { HostSession, HOST_PROTOCOL, ADAPTER_BUILD, SCOPE_COVERAGE, parseHostRequest, T3_REVISION, type FileRequest } from './host-contract';

// Admission stays in compatibility(). This transport cannot approve a build.
export class HostBridge {
  private closed = false;
  private polling = false;
  constructor(
    private guest: Pick<Guest, 'getURL' | 'executeJavaScript'>,
    private origin: string,
    private session: HostSession,
    private onFile: (request: FileRequest) => Promise<boolean>,
    private onExternal: (path: string) => Promise<void> = async () => {},
    private onDiagnostic: (message: string) => void = () => {},
  ) { this.origin = serverOrigin(origin); }
  private assertCurrent() {
    if (this.closed || new URL(this.guest.getURL()).origin !== this.origin) {
      this.close();
      throw new Error('Guest navigation ended the host session.');
    }
  }
  private async evaluate(code: string) {
    this.assertCurrent();
    const result = await this.guest.executeJavaScript(code);
    this.assertCurrent();
    return result;
  }
  async initialize() {
    const identity = {generation:this.session.generation, environmentId:this.session.localEnvironmentId, vaultRoot:this.session.vaultRoot};
    let result: Record<string, unknown> | null | string = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      result = await this.evaluate(`(() => {
      const api = window.t3ObsidianHostV1;
      if (!api) return "pending";
      if (api.protocol !== ${HOST_PROTOCOL} || api.revision !== ${JSON.stringify(T3_REVISION)}) return null;
      return api.initialize(${JSON.stringify(identity)});
    })()`) as Record<string, unknown> | null | string;
      if (result !== 'pending') break;
      await delay(50);
    }
    if (!result || typeof result !== 'object' || result.protocol !== HOST_PROTOCOL || result.revision !== T3_REVISION || result.generation !== identity.generation || result.build !== ADAPTER_BUILD || !Array.isArray(result.coverage) || SCOPE_COVERAGE.some(entry => !(result.coverage as unknown[]).includes(entry))) {
      this.close();
      throw new Error('Host handshake failed.');
    }
  }
  async poll() {
    if (this.polling || this.closed) return;
    this.polling = true;
    try {
      const batch = await this.evaluate('window.t3ObsidianHostV1.drain()');
      if (!Array.isArray(batch) || batch.length > 8) throw new Error('Invalid host request batch.');
      for (const value of batch) {
        this.assertCurrent();
        const request = parseHostRequest(value, this.session.generation);
        if (request.type === 'external') {
          if (savedTarget(request.path, this.origin) !== request.path) throw new Error('Invalid external T3 route.');
          await this.onExternal(request.path);
          await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify({id:request.id,generation:this.session.generation,handled:true})})`);
          continue;
        }
        const response = request.type === 'scope' ? this.session.scope(request) : {
          id:request.id, generation:this.session.generation,
          handled:request.environmentId === this.session.localEnvironmentId && (request.route === undefined || request.route === new URL(this.guest.getURL()).pathname) && await this.onFile(request),
        };
        if ('diagnostics' in response && response.diagnostics.length) this.onDiagnostic([...new Set(response.diagnostics.map(d => d.reason))].join(' '));
        await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify(response)})`);
      }
    } catch (error) { this.close(); throw error; }
    finally { this.polling = false; }
  }
  async appendContext(text: string) {
    let route = new URL(this.guest.getURL()).pathname;
    let target: unknown = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (new URL(this.guest.getURL()).pathname !== route) throw new Error('The T3 target changed. Context was not added.');
      target = await this.evaluate('window.t3ObsidianHostV1.composerTarget()');
      if (typeof target === 'string') break;
      await delay(50);
    }
    if (typeof target !== 'string') {
      const prepared = await this.evaluate(`window.t3ObsidianHostV1.prepareComposer(${JSON.stringify(route)})`);
      if (typeof prepared !== 'string') throw new Error('Use vault folder or choose an in-vault project before adding context.');
      route = prepared;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (new URL(this.guest.getURL()).pathname !== route) throw new Error('The T3 target changed. Context was not added.');
        target = await this.evaluate('window.t3ObsidianHostV1.composerTarget()');
        if (typeof target === 'string') break;
        await delay(50);
      }
      if (typeof target !== 'string') throw new Error('The in-vault composer is unavailable. Context was not added.');
    }
    const inserted = await this.evaluate(`window.t3ObsidianHostV1.appendContext(${JSON.stringify({generation:this.session.generation, target, text})})`);
    if (inserted !== true) throw new Error('The T3 target changed or its composer is unavailable. Context was not added.');
  }
  close() { this.closed = true; this.session.invalidate(); }
}
