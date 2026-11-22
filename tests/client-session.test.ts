import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localClientPath } from '../src/client-session';
test('local client routing separates UI files from server APIs, previews, uploads and authentication', () => {
  const local=(path:string)=>localClientPath(new URL('http://127.0.0.1:3773'+path));
  for(const path of ['/','/pair?token=fixture','/settings/providers','/draft/d1','/12345678-1234-1234-1234-123456789abc/t1']) assert.equal(local(path),'index.html');
  assert.equal(local('/assets/main.js'),'assets/main.js');
  assert.equal(local('/fonts/inter.woff2'),'fonts/inter.woff2');
  for(const path of ['/api/attachments','/.well-known/t3/environment','/oauth/token','/ws','/api/preview/session','/assets/x%2Fy.js','/assets/a%5Cb.js']) assert.equal(local(path),null);
});
