// Install only into an explicitly named disposable integration vault.
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const [vault, origin, target = '/', manifestFile] = process.argv.slice(2);
if (!vault || !origin || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-')) throw new Error('Use only an obsidian-t3-gate-* fixture vault.');
if (!manifestFile) throw new Error('Supply the candidate client manifest path as the fourth argument.');
const manifestText=await readFile(manifestFile,'utf8');
const manifestSha256=createHash('sha256').update(manifestText).digest('hex');
const output = await build({entryPoints:['src/main.ts'],bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian','electron'],plugins:[{
  name:'candidate-admission-for-integration-tests',
  setup(builder) {builder.onLoad({filter:/approved-client\.ts$/},async () => ({loader:'ts',contents:'export const APPROVED_CLIENT = '+JSON.stringify({build:'obsidian-host-v1.2',manifestSha256})+';'}));},
}]});
const folder=path.join(vault,'.obsidian/plugins/t3-code');await mkdir(folder,{recursive:true});
await writeFile(path.join(folder,'main.js'),output.outputFiles[0].text);
for(const file of ['manifest.json','styles.css'])await copyFile(file,path.join(folder,file));
await writeFile(path.join(folder,'data.json'),JSON.stringify({origin,followAppearance:true,target}));
await writeFile(path.join(vault,'.obsidian/community-plugins.json'),'["t3-code"]');
console.log('Installed candidate for isolated gate verification. Production admission is unchanged.');
