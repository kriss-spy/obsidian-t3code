import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { electronHost, type DesktopSession, type ProtocolRequest, type ProtocolResponse } from './electron-host';
import { serverOrigin } from './connection';

const sessions = new Map<string, { root: string; origin: string; users: number; session: DesktopSession }>();
const mime: Record<string,string> = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.bcmap':'application/octet-stream' };
export function localClientPath(url: URL): string | null {
  const name = decodeURIComponent(url.pathname);
  if (name.includes('\\') || name.includes('\0') || name.split('/').some(part=>part==='.' || part==='..')) return null;
  if (/^\/(?:assets|fonts)\/[a-zA-Z0-9_.-]+$/.test(name) || /^\/(?:obsidian-(?:host-client\.json|extra-fonts\.css)|favicon\.ico|icon-[a-z0-9-]+\.png|manifest\.webmanifest|sw\.js)$/.test(name)) return name.slice(1);
  // API, browser preview, attachment and OAuth requests always reach the original server.
  if (name === '/' || name === '/index.html' || /^\/(?:pair|connect|connect-agent|approve-agent|guest|welcome|new|projects|pull-requests|issues|usage|settings|thread|threads|draft)(?:\/|$)/.test(name) || /^\/[a-f0-9-]{36}\//i.test(name)) return 'index.html';
  return null;
}

export async function attachLocalClient(partition: string, origin: string, directory: string): Promise<() => Promise<void>> {
  origin = serverOrigin(origin);
  const root = await realpath(directory);
  let entry = sessions.get(partition);
  if (entry && (entry.root !== root || entry.origin !== origin)) throw new Error('This T3 browser session already uses another client. Reconnect after closing its views.');
  if (!entry) {
    const session = electronHost().remote?.session?.fromPartition(partition);
    if (!session?.protocol?.interceptBufferProtocol || !session.fetch) throw new Error('This Obsidian version cannot load plugin-owned T3 components.');
    const scheme = new URL(origin).protocol.slice(0,-1);
    const handler = async (request: ProtocolRequest, done: (response: ProtocolResponse) => void) => {
      try {
        const url = new URL(request.url);
        const relative = url.origin === origin && (request.method === 'GET' || request.method === 'HEAD') ? localClientPath(url) : null;
        if (relative) {
          const file = await realpath(path.join(root,relative));
          if (!file.startsWith(root + path.sep)) throw new Error('Invalid local client path.');
          const data = request.method === 'HEAD' ? Buffer.alloc(0) : await readFile(file);
          done({ data, mimeType:mime[path.extname(relative)] ?? 'application/octet-stream',statusCode:200,headers:{'cache-control':'no-store'} });
          return;
        }
        const upload = request.uploadData;
        const body = upload?.length ? Buffer.concat(await Promise.all(upload.map(async part => {
          if (part.bytes) return Buffer.from(part.bytes);
          if (part.blobUUID && session.getBlobData) return session.getBlobData(part.blobUUID);
          if (part.file) return readFile(part.file);
          throw new Error('Unsupported upload.');
        }))) : undefined;
        const response = await session.fetch(request.url,{method:request.method,headers:request.headers,
          ...(body ? {body} : {}),bypassCustomProtocolHandlers:true,redirect:'manual'});
        const headers: Record<string,string|string[]> = {};
        response.headers.forEach((value,key)=>{headers[key]=value;});
        // Chromium receives decoded bytes from fetch; it must not decompress them a second time.
        delete headers['content-encoding']; delete headers['content-length'];
        const cookies = response.headers.getSetCookie?.();
        if (cookies?.length) headers['set-cookie']=cookies;
        done({ data:Buffer.from(await response.arrayBuffer()),statusCode:response.status,headers });
      } catch { done({ data:Buffer.from('T3 component or server request failed. Check T3 Code settings.'),mimeType:'text/plain',statusCode:502 }); }
    };
    const registered = session.protocol.interceptBufferProtocol(scheme,(request,done) => { void handler(request,done); });
    if (registered === false) throw new Error('Could not register the T3 client session.');
    entry = { root, origin, users:0, session };sessions.set(partition,entry);
  }
  entry.users++;
  let released = false;
  return async () => {
    if (released) return; released = true;
    if (--entry.users === 0) {
      sessions.delete(partition);
      await entry.session.protocol!.uninterceptProtocol(new URL(origin).protocol.slice(0,-1));
    }
  };
}
