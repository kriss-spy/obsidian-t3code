// Package the approved client without starting T3 or opening a database.
import {readFile,mkdir,copyFile,cp,writeFile,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [checkout,label='development.6']=process.argv.slice(2);
if(!checkout || !/^(?:development|rc)\.\d+$/.test(label))throw Error('Supply the pinned patched T3 checkout and an optional development.N or rc.N label.');
const web=path.resolve(checkout,'apps/web/dist');
execFileSync(process.execPath,['scripts/verify-packaged-client.mjs',web],{stdio:'inherit'});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const clientText=await readFile(path.join(web,'obsidian-host-client.json'),'utf8');
const client=JSON.parse(clientText);
const plugin=await readFile('manifest.json','utf8');
const manifest=JSON.parse(plugin);
const pkg=JSON.parse(await readFile('package.json','utf8'));
const versions=JSON.parse(await readFile('versions.json','utf8'));
if(manifest.version!==pkg.version || versions[manifest.version]!==manifest.minAppVersion || manifest.isDesktopOnly!==true)throw Error('Plugin release metadata is inconsistent.');
const main=await readFile('main.js');
if(!main.toString().includes(JSON.stringify(client.build)) || !main.toString().includes(JSON.stringify(hash(clientText))))throw Error('Build the current plugin before packaging this client.');
const git=(args,cwd=process.cwd())=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
if(git(['rev-parse','HEAD'],checkout)!==client.revision)throw Error('Wrong upstream checkout revision.');
const patch=await readFile('upstream/t3-0.1.11-obsidian-host-v1.patch');
execFileSync('git',['apply','--reverse','--check',path.resolve('upstream/t3-0.1.11-obsidian-host-v1.patch')],{cwd:checkout,stdio:'pipe'});
const dist=path.resolve('dist');await mkdir(dist,{recursive:true});
const name=`obsidian-t3code-${manifest.version}-${label}-linux`;
const stage=path.join(dist,name),zip=path.join(dist,name+'.zip');
try{await stat(zip);throw Error('Candidate ZIP already exists. Choose a new label.');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(stage);
await mkdir(path.join(stage,'plugin/t3-code'),{recursive:true});
for(const file of ['main.js','manifest.json','styles.css'])await copyFile(file,path.join(stage,'plugin/t3-code',file));
for(const dir of ['scripts','upstream'])await mkdir(path.join(stage,dir));
for(const file of ['prepare-t3-development.sh','verify-packaged-client.mjs','verify-candidate.mjs'])await copyFile('scripts/'+file,path.join(stage,'scripts',file));
await copyFile('upstream/t3-0.1.11-obsidian-host-v1.patch',path.join(stage,'upstream/t3-0.1.11-obsidian-host-v1.patch'));
await cp('docs',path.join(stage,'docs'),{recursive:true});
await copyFile('README.md',path.join(stage,'README.md'));
await copyFile('LICENSE',path.join(stage,'LICENSE'));
await copyFile('docs/development-install.md',path.join(stage,'DEVELOPMENT.md'));
await copyFile('versions.json',path.join(stage,'versions.json'));
await copyFile(path.join(checkout,'LICENSE'),path.join(stage,'T3-LICENSE'));
await cp(web,path.join(stage,'t3-web'),{recursive:true,filter:source=>!source.endsWith('.map')});
await writeFile(path.join(stage,'candidate.json'),JSON.stringify({version:manifest.version,label,status:'blocked-for-stable-publication',platform:'linux',minAppVersion:manifest.minAppVersion,sourceRevision:git(['rev-parse','HEAD']),sourceDirty:git(['status','--porcelain']).length>0,pluginSha256:hash(main),upstreamRevision:client.revision,patchSha256:hash(patch),clientManifestSha256:hash(clientText)},null,2)+'\n');
async function files(directory,prefix='') {
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const relative=prefix+entry.name;
    if(entry.isDirectory())result.push(...await files(path.join(directory,entry.name),relative+'/'));
    else if(entry.isFile())result.push(relative);
    else throw Error('Unexpected package entry: '+relative);
  }
  return result;
}
const sums=[];
for(const file of (await files(stage)).sort())sums.push(hash(await readFile(path.join(stage,file)))+'  '+file);
await writeFile(path.join(stage,'SHA256SUMS'),sums.join('\n')+'\n');
execFileSync(process.execPath,[path.join(stage,'scripts/verify-candidate.mjs'),stage],{stdio:'inherit'});
execFileSync('zip',['-q','-r',zip,path.basename(stage)],{cwd:dist});
const bytes=await readFile(zip),digest=hash(bytes);
await writeFile(zip+'.sha256',digest+'  '+path.basename(zip)+'\n');
console.log(JSON.stringify({artifact:zip,sha256:digest,bytes:bytes.length}));
