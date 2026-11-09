// Optional server model for emails. SignalCheck stays fully browser-only unless
// index.html sets <meta name="signalcheck-server-model" content="https://..."> AND
// allows that origin in the Content-Security-Policy connect-src (it is 'none' by
// default, so the browser itself blocks any request). Even then, nothing is sent
// unless the user ticks the deeper-check option.
export const SERVER_MINIMUM_WORDS = 20;

export function serverModelUrl(configured = globalThis.document?.querySelector('meta[name="signalcheck-server-model"]')?.content ?? '') {
  try {
    const url = new URL(configured);
    return url.protocol === 'https:' || ['127.0.0.1', 'localhost'].includes(url.hostname) ? url.origin : '';
  } catch {
    return '';
  }
}

export async function checkWithServer({ message }, { url = serverModelUrl(), signal, fetcher = globalThis.fetch } = {}) {
  if (!url) throw new Error('No server model is configured.');
  const response = await fetcher(`${url}/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, type: 'email' }),
    signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
  });
  if (!response.ok) throw new Error(`The server model could not check this message (HTTP ${response.status}).`);
  const result = await response.json();
  if (result?.applicable === false) return { kind: 'email', version: String(result.version ?? ''), applicable: false };
  if (typeof result?.matched !== 'boolean' || !Number.isFinite(result.margin) || !Number.isFinite(result.threshold)) throw new Error('The server model returned an unexpected response.');
  return { kind: result.kind, version: String(result.version ?? ''), applicable: true, margin: result.margin, threshold: result.threshold, matched: result.matched, truncated: Boolean(result.truncated) };
}
