import { context } from 'esbuild';
import { builtinModules } from 'node:module';
const build = await context({
  entryPoints: ['src/main.ts'], outfile: 'main.js', bundle: true,
  format: 'cjs', platform: 'node', target: 'es2022',
  external: ['obsidian', 'electron', ...builtinModules, ...builtinModules.map(m => `node:${m}`)],
  minify: !process.argv.includes('--watch'),
  sourcemap: process.argv.includes('--watch') ? 'inline' : false,
});
if (process.argv.includes('--watch')) await build.watch();
else { await build.rebuild(); await build.dispose(); }
