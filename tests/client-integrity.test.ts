import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { ADAPTER_BUILD, T3_REVISION } from '../src/host-contract';
test('client admission verifies pinned executable bytes and rejects a declared but different client', async () => {
  const bodies = new Map([['/index.html','<script src="/assets/main.js"></script>'],['/assets/main.js','host startup'],['/assets/gate.js','strict scope']]);
  const manifest = {build:ADAPTER_BUILD,revision:T3_REVISION,files:[...bodies].map(([path,body])=>({path,sha256:createHash('sha256').update(body).digest('hex')}))};
  const digest=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const bundle=await build({entryPoints:['src/client-integrity.ts'],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'test-artifact',setup(builder){builder.onLoad({filter:/approved-client\.ts$/},()=>({loader:'ts',contents:'export const APPROVED_CLIENT='+JSON.stringify({build:ADAPTER_BUILD,manifestSha256:digest})}));}}]});
  const m={exports:{} as {verifyClientIntegrity:(origin:string,manifest:unknown,read:(url:string)=>Promise<ArrayBuffer>)=>Promise<string>}};
  new Function('module','exports','require',bundle.outputFiles[0].text)(m,m.exports,createRequire(import.meta.url));
  const bytes=async(url:string)=>new TextEncoder().encode(bodies.get(new URL(url).pathname)).buffer as ArrayBuffer;
  assert.equal(await m.exports.verifyClientIntegrity('http://127.0.0.1:3773',manifest,bytes),digest);
  await assert.rejects(m.exports.verifyClientIntegrity('http://127.0.0.1:3773',manifest,async()=>new TextEncoder().encode('unpatched client').buffer),/differs/);
  await assert.rejects(m.exports.verifyClientIntegrity('http://127.0.0.1:3773',{...manifest,files:[...manifest.files,{path:'/api/private',sha256:'a'.repeat(64)}]},bytes),/Invalid/);
});
