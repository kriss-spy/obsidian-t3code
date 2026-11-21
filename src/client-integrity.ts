import { createHash } from 'node:crypto';
import { APPROVED_CLIENT } from './approved-client';
import { ADAPTER_BUILD, T3_REVISION } from './host-contract';
export async function verifyClientIntegrity(origin: string, value: unknown, fetchBytes: (url:string) => Promise<ArrayBuffer>): Promise<string> {
  if (!value || typeof value !== 'object') throw new Error('The patched T3 client manifest is unavailable.');
  const raw=value as {build?:unknown; revision?:unknown; files?:unknown};
  if(raw.build!==ADAPTER_BUILD || raw.revision!==T3_REVISION || !Array.isArray(raw.files) || raw.files.length<3 || raw.files.length>128) throw new Error('Invalid T3 client manifest.');
  const seen=new Set<string>();
  const files=raw.files.map((entry:unknown)=>{
    if(!entry || typeof entry!=='object')throw new Error('Invalid T3 asset.');
    const f=entry as {path?:unknown;sha256?:unknown};
    if(typeof f.path!=='string' || !/^(?:\/index\.html|\/assets\/[a-zA-Z0-9_.-]+\.js)$/.test(f.path) || typeof f.sha256!=='string' || !/^[a-f0-9]{64}$/.test(f.sha256) || seen.has(f.path))throw new Error('Invalid T3 asset.');
    seen.add(f.path);return {path:f.path,sha256:f.sha256};
  });
  if(!seen.has('/index.html'))throw new Error('T3 entry document is not pinned.');
  const manifest={build:ADAPTER_BUILD,revision:T3_REVISION,files};
  const digest=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  if(!APPROVED_CLIENT || APPROVED_CLIENT.build!==ADAPTER_BUILD || APPROVED_CLIENT.manifestSha256!==digest)throw new Error('This compiled T3 client has not passed the integration gate. Install the matching development client bundle.');
  let next=0;
  await Promise.all(Array.from({length:Math.min(4,files.length)},async()=>{
    while(next<files.length){const file=files[next++];const bytes=await fetchBytes(origin+file.path);if(createHash('sha256').update(new Uint8Array(bytes)).digest('hex')!==file.sha256)throw new Error('The T3 client asset differs from the verified build: '+file.path);}
  }));
  return digest;
}
