import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [directory]=process.argv.slice(2);
if(!directory)throw Error('Supply the extracted candidate directory.');
const root=path.resolve(directory),seen=new Set();
for(const line of (await readFile(path.join(root,'SHA256SUMS'),'utf8')).trimEnd().split('\n')) {
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line);
  if(!match || match[2].includes('\\') || match[2].split('/').some(part=>!part || part==='.' || part==='..') || seen.has(match[2]))throw Error('Invalid checksum entry.');
  const [,expected,file]=match;
  seen.add(file);
  const digest=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  if(digest!==expected)throw Error('Package file mismatch: '+file);
}
async function inspect(directory,prefix='') {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const file=prefix+entry.name;
    if(entry.isDirectory())await inspect(path.join(directory,entry.name),file+'/');
    else if(!entry.isFile() || (file!=='SHA256SUMS' && !seen.delete(file)))throw Error('Unexpected package entry: '+file);
  }
}
await inspect(root);
if(seen.size)throw Error('Missing package files.');
console.log('Verified all candidate file checksums.');
