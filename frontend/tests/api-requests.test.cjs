const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const calls = [];
  let token = 'session-a';
  const localStorage = { getItem: () => token };
  const sandbox = {
    exports: {}, process: { env: {} }, Headers, Response, console, localStorage,
    window: {},
    fetch: (url, options) => new Promise((resolve, reject) => calls.push({ url, options, resolve, reject })),
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(compiled.outputText, sandbox);
  return { fetchAPI: sandbox.exports.fetchAPI, calls, setToken: (value) => { token = value; } };
}

test('simultaneous GET reads share one request and completed responses are not cached', async () => {
  const { fetchAPI, calls } = setup();
  const first = fetchAPI('/api/kam/accounts/');
  const second = fetchAPI('/api/kam/accounts/');
  assert.equal(calls.length, 1);
  calls[0].resolve(Response.json({ count: 7 }));
  assert.deepEqual(await first, await second);
  const third = fetchAPI('/api/kam/accounts/');
  assert.equal(calls.length, 2);
  calls[1].resolve(Response.json({ count: 8 }));
  assert.equal((await third).count, 8);
});

test('different authenticated sessions never share a response', async () => {
  const { fetchAPI, calls, setToken } = setup();
  const first = fetchAPI('/api/kam/accounts/');
  setToken('session-b');
  const second = fetchAPI('/api/kam/accounts/');
  assert.equal(calls.length, 2);
  calls[0].resolve(Response.json({ name: 'a' }));
  calls[1].resolve(Response.json({ name: 'b' }));
  assert.equal((await first).name, 'a');
  assert.equal((await second).name, 'b');
});

test('failed reads can be retried', async () => {
  const { fetchAPI, calls } = setup();
  const failed = fetchAPI('/api/kam/accounts/');
  calls[0].resolve(Response.json({}, { status: 503 }));
  await assert.rejects(failed);
  const retry = fetchAPI('/api/kam/accounts/');
  assert.equal(calls.length, 2);
  calls[1].resolve(Response.json({ count: 2 }));
  assert.equal((await retry).count, 2);
});

test('a mutation prevents subsequent reads from reusing a pre-mutation request', async () => {
  const { fetchAPI, calls } = setup();
  const old = fetchAPI('/api/kam/accounts/');
  const write = fetchAPI('/api/kam/feed/item/convert/', { method: 'POST' });
  const current = fetchAPI('/api/kam/accounts/');
  assert.equal(calls.length, 3);
  calls.forEach((call) => call.resolve(Response.json({ ok: true })));
  await Promise.all([old, write, current]);
});

test('individually abortable reads do not share a request', async () => {
  const { fetchAPI, calls } = setup();
  const controller = new AbortController();
  const first = fetchAPI('/api/kam/accounts/', { signal: controller.signal });
  const second = fetchAPI('/api/kam/accounts/');
  assert.equal(calls.length, 2);
  calls.forEach((call) => call.resolve(Response.json({ ok: true })));
  await Promise.all([first, second]);
});
