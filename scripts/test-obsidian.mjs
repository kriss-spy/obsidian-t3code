// Launches only an isolated, disposable vault. No running personal vault is accessed.
import ObsidianLauncher from 'obsidian-launcher';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

const requested = process.env.OBSIDIAN_VERSION ?? 'earliest';
const installer = process.env.OBSIDIAN_INSTALLER ?? 'earliest';
const launcher = new ObsidianLauncher();
const [appVersion, installerVersion] = await launcher.resolveVersion(requested, installer);
console.log(`Testing Obsidian ${appVersion}, installer ${installerVersion}`);
const vault = await mkdtemp(path.join(tmpdir(), 'threecode-compat-'));
let launched, browser;
try {
  await mkdir(path.join(vault, '.obsidian'));
  await writeFile(path.join(vault, '.obsidian', 'app.json'), JSON.stringify({trashOption:'local'}));
  launched = await launcher.launch({appVersion,installerVersion,vault,plugins:[process.cwd()],
    args:['--remote-debugging-port=0'],spawnOptions:{stdio:['ignore','pipe','pipe']}});
  const endpoint = await new Promise((resolve,reject) => {
    let output='';
    const timer=setTimeout(()=>reject(Error('Obsidian debugger startup timed out: '+output)),60000);
    const receive = chunk => {
      output+=chunk.toString();
      const match=/DevTools listening on (ws:\/\/[^\s]+)/.exec(output);
      if(match){clearTimeout(timer);resolve(match[1]);}
    };
    launched.proc.stderr.on('data',receive);
    launched.proc.stdout.on('data',receive);
    launched.proc.once('error',error=>{clearTimeout(timer);reject(error);});
    launched.proc.once('exit',code=>{clearTimeout(timer);reject(Error('Obsidian exited: '+code+' '+output));});
  });
  browser=await chromium.connectOverCDP(endpoint,{noDefaults:true});
  const context=browser.contexts()[0];
  const page=context.pages().find(p=>p.url().startsWith('app://obsidian.md')) ?? await context.waitForEvent('page');
  await page.waitForFunction(()=>window.app?.workspace?.layoutReady && window.app.plugins?.plugins?.threecode,{},{timeout:60000});
  const bundle=await build({entryPoints:['tests/obsidian/compatibility.ts'],bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian'],target:'es2022'});
  const report=await page.evaluate(async ({code,expectedVault})=>{
    if(window.app.vault.adapter.getBasePath()!==expectedVault)throw Error('Refuse a non-fixture vault');
    const module={exports:{}};
    new Function('module','exports','require',code)(module,module.exports,window.require);
    return module.exports.checkCompatibility(window.app);
  },{code:bundle.outputFiles[0].text,expectedVault:vault});
  console.log(JSON.stringify({appVersion,installerVersion,...report},null,2));
} finally {
  await browser?.close();
  if(launched){
    const proc=launched.proc;
    const running=()=>proc.exitCode===null && proc.signalCode===null;
    if(running()){
      const exited=once(proc,'exit');
      proc.kill();
      await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,5000))]);
      if(running()){
        proc.kill('SIGKILL');
        await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('Obsidian failed to stop')),5000))]);
      }
    }
  }
  await rm(vault,{recursive:true,force:true,maxRetries:10,retryDelay:300});
  if(launched)await rm(launched.configDir,{recursive:true,force:true,maxRetries:10,retryDelay:300});
}
