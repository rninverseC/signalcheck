// Browser-provided, on-device translation. No remote API or third-party fetch.
// Create is called from an explicit user gesture; never silently download packs.
export function hasTranslator(api = globalThis.Translator) {
  return typeof api?.create === 'function' && typeof api?.availability === 'function';
}
export async function translateToEnglish(text, language, { api = globalThis.Translator, signal, onProgress = () => {} } = {}) {
  if (!hasTranslator(api)) throw new Error('On-device translation is unavailable in this browser. You can still use the direct language checks or paste your own English translation.');
  if (!['es', 'zh', 'zh-Hant'].includes(language)) throw new Error('Choose Spanish or Chinese to translate.');
  if (!text.trim()) throw new Error('Paste the original message before translating.');
  const options = { sourceLanguage: language, targetLanguage: 'en' };
  signal?.throwIfAborted();
  const available = await api.availability(options);
  signal?.throwIfAborted();
  if (available === 'unavailable') throw new Error('This browser cannot translate that language pair. Use the direct checks or paste an English translation.');
  let translator;
  try {
    translator = await api.create({ ...options, signal, monitor(monitor) {
      monitor.addEventListener('downloadprogress', event => onProgress(Math.max(0, Math.min(100, Math.round(event.loaded * 100)))));
    } });
    signal?.throwIfAborted();
    const translated = await translator.translate(text, { signal });
    signal?.throwIfAborted();
    if (typeof translated !== 'string' || !translated.trim()) throw new Error('Translation returned no text. Try direct checks or paste an English translation.');
    if (translated.length > 20000) throw new Error('The English translation is over 20,000 characters. Shorten the original message and try again.');
    return translated.trim();
  } finally { translator?.destroy?.(); }
}
