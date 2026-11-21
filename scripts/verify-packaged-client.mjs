import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [directory]=process.argv.slice(2);
if(!directory)throw Error('Supply the extracted web directory.');
const manifestText=await readFile(path.join(directory,'obsidian-host-client.json'),'utf8');
const expected='dc2fe4490e9f702a1667942868eb3b7fba604b6edf297c9b10b9c407547627dc';
if(createHash('sha256').update(manifestText).digest('hex')!==expected)throw Error('Wrong client manifest.');
const manifest=JSON.parse(manifestText);
for(const file of manifest.files){
  if(!/^\/(?:index\.html|assets\/[a-zA-Z0-9_.-]+\.js)$/.test(file.path))throw Error('Invalid asset path.');
  const bytes=await readFile(path.join(directory,file.path));
  if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Client asset mismatch: '+file.path);
}
console.log('Verified '+manifest.files.length+' pinned client entry and integration assets.');
