import { serverOrigin } from './connection';
import type { Guest } from './guest';
import { HostSession, HOST_PROTOCOL, parseHostRequest, T3_REVISION, type FileRequest } from './host-contract';

// Admission stays in compatibility(). This transport cannot approve a build.
export class HostBridge {
  private closed = false;
  private polling = false;
  constructor(
    private guest: Pick<Guest, 'getURL' | 'executeJavaScript'>,
    private origin: string,
    private session: HostSession,
    private onFile: (request: FileRequest) => Promise<boolean>,
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
    const identity = {generation:this.session.generation, environmentId:this.session.localEnvironmentId};
    const result = await this.evaluate(`(() => {
      const api = window.t3ObsidianHostV1;
      if (!api || api.protocol !== ${HOST_PROTOCOL} || api.revision !== ${JSON.stringify(T3_REVISION)}) return null;
      return api.initialize(${JSON.stringify(identity)});
    })()`) as Record<string, unknown> | null;
    if (!result || result.protocol !== HOST_PROTOCOL || result.revision !== T3_REVISION || result.generation !== identity.generation) {
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
        const response = request.type === 'scope' ? this.session.scope(request) : {
          id:request.id, generation:this.session.generation,
          handled:request.environmentId === this.session.localEnvironmentId && await this.onFile(request),
        };
        await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify(response)})`);
      }
    } catch (error) { this.close(); throw error; }
    finally { this.polling = false; }
  }
  close() { this.closed = true; this.session.invalidate(); }
}
