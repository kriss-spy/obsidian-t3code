// Run after building the pinned patched T3 web client. This does not start a server.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const [checkout] = process.argv.slice(2);
if (!checkout) throw new Error('Usage: node scripts/build-client-manifest.mjs <patched T3 checkout>');
const root = path.resolve(checkout), dist = path.join(root,'apps/web/dist');
const revision='59651c1761f6c63e9b6056839067066968e6a406';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==revision)throw new Error('Wrong upstream revision.');
const changed=new Set(execFileSync('git',['diff','--name-only','HEAD','--','apps/web/src'],{cwd:root,encoding:'utf8'}).trim().split('\n').map(f=>path.join(root,f)));
const html=await readFile(path.join(dist,'index.html'),'utf8');
const selected=new Set(['/index.html',...([...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.js)"/g)].map(m=>m[1]))]);
for(const file of await readdir(path.join(dist,'assets'))){
  if(!file.endsWith('.js.map'))continue;
  const full=path.join(dist,'assets',file), map=JSON.parse(await readFile(full,'utf8'));
  if(map.sources.some(source=>changed.has(path.resolve(path.dirname(full),source))))selected.add('/assets/'+file.slice(0,-4));
}
if(selected.size<3)throw new Error('No compiled host integration found in source maps.');
const files=[];
for(const file of [...selected].sort())files.push({path:file,sha256:createHash('sha256').update(await readFile(path.join(dist,file))).digest('hex')});
const manifest={build:'obsidian-host-v1.9',revision,files};
const text=JSON.stringify(manifest);
await writeFile(path.join(dist,'obsidian-host-client.json'),text);
console.log(JSON.stringify({files:files.length,manifestSha256:createHash('sha256').update(text).digest('hex')}));
