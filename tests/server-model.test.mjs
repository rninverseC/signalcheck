import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkWithServer, serverModelUrl } from '../dist/server-model.mjs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const configured = html.match(/<meta name="signalcheck-server-model" content="([^"]*)">/)[1];
const connectSrc = html.match(/connect-src ([^;"]+)/)[1].trim();

test('the published page is browser-only: no server configured and the browser blocks all requests', () => {
  assert.equal(configured, '');
  assert.equal(connectSrc, "'none'");
});

test('a configured server must also be allowed by connect-src', () => {
  const url = serverModelUrl(configured);
  if (url) assert.ok(connectSrc.split(/\s+/).includes(url), `add ${url} to connect-src`);
});

test('only https servers, or a local development server, are accepted', async () => {
  assert.equal(serverModelUrl(''), '');
  assert.equal(serverModelUrl('https://signalcheck.example/path'), 'https://signalcheck.example');
  assert.equal(serverModelUrl('http://127.0.0.1:8000/'), 'http://127.0.0.1:8000');
  assert.equal(serverModelUrl('http://collector.example'), '');
  assert.equal(serverModelUrl('javascript:alert(1)'), '');
  await assert.rejects(checkWithServer({ message: 'hi' }, { url: '' }), /No server model/);
});

test('server responses are validated and requests omit credentials', async () => {
  let seen;
  const fetcher = async (url, options) => { seen = { url, options }; return { ok: true, json: async () => ({ kind: 'email', version: 'v', applicable: true, margin: 1.5, threshold: 0.5, matched: true }) }; };
  const result = await checkWithServer({ message: 'Win now' }, { url: 'http://127.0.0.1:8000', fetcher });
  assert.equal(seen.url, 'http://127.0.0.1:8000/analyze');
  assert.equal(seen.options.credentials, 'omit');
  assert.deepEqual(JSON.parse(seen.options.body), { message: 'Win now', type: 'email' });
  assert.equal(result.matched, true);
  const short = async () => ({ ok: true, json: async () => ({ kind: 'email', version: 'v', applicable: false, minimum_words: 20 }) });
  assert.deepEqual(await checkWithServer({ message: 'hi' }, { url: 'http://127.0.0.1:8000', fetcher: short }), { kind: 'email', version: 'v', applicable: false });
  const bad = async () => ({ ok: true, json: async () => ({ matched: 'yes' }) });
  await assert.rejects(checkWithServer({ message: 'x' }, { url: 'http://127.0.0.1:8000', fetcher: bad }), /unexpected response/);
  const down = async () => ({ ok: false, status: 503 });
  await assert.rejects(checkWithServer({ message: 'x' }, { url: 'http://127.0.0.1:8000', fetcher: down }), /HTTP 503/);
});
