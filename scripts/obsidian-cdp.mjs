// Development checks must name the exact disposable vault before running any code.
export async function connectDevelopmentVault(endpoint, expectedVault) {
  const url = new URL(endpoint);
  if (!['127.0.0.1','localhost'].includes(url.hostname)) throw new Error('Use a loopback CDP endpoint.');
  const tabs = await (await fetch(url.origin + '/json/list')).json();
  const target = tabs.find(t => t.type === 'page' && t.url === 'app://obsidian.md/index.html');
  if (!target) throw new Error('No Obsidian page.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.onopen=resolve;socket.onerror=reject;});
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {const reply=JSON.parse(event.data);pending.get(reply.id)?.(reply);};
  async function call(method, params) {
    const id = ++sequence;
    const response = new Promise((resolve,reject) => {
      const timer=setTimeout(() => {pending.delete(id);reject(new Error('CDP evaluation timed out.'));},30000);
      pending.set(id, reply => {clearTimeout(timer);pending.delete(id);resolve(reply);});
    });
    socket.send(JSON.stringify({id,method,params}));
    const reply = await response;
    if (reply.error || reply.result.exceptionDetails) throw new Error(JSON.stringify(reply.error ?? reply.result.exceptionDetails));
    return reply.result;
  }
  async function evaluate(expression) { return (await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value; }
  try { if (await evaluate('app.vault.adapter.getBasePath()') !== expectedVault) throw new Error('Refuse to operate on another vault.'); }
  catch (error) {socket.close();throw error;}
  return {evaluate,call,close:() => socket.close()};
}
