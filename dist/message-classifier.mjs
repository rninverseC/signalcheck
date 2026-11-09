import { TEXT_MODEL } from './text-model.mjs?v=3.1.0';
import { EMAIL_MODEL } from './email-model.mjs?v=3.1.0';

export const MODELS = { text: TEXT_MODEL, email: EMAIL_MODEL };
const vocabularies = new Map(Object.entries(MODELS).map(([kind, model]) => [kind, new Map(Object.entries(model.features))]));
const FUNCTION_WORDS = new Set('i me my mine we us our ours you your yours they them their theirs he him his she her hers it its a an the and or but if then as at by for from in into of on to with is am are was were be been being do does did have has had will would can could should may might this that these those there here now all any some so not no yes'.split(' '));

// Keep in sync with tokens() in scripts/train_models.py.
export function tokenize(text) {
  const normalized = text.normalize('NFKC').toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '')
    .replace(/(?:https?:\/\/|www\.)\S+/g, ' __url__ ')
    .replace(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/g, ' __email__ ')
    .replace(/\p{Nd}+(?:[.,]\p{Nd}+)*/gu, ' __number__ ')
    .replace(/[£$€]/g, ' __money__ ');
  return normalized.match(/__[a-z]+__|[a-z]{2,}/g) ?? [];
}

export function classifyMessage(text, kind = 'text') {
  const model = MODELS[kind];
  if (!model) throw new Error(`Unknown model: ${kind}`);
  const vocabulary = vocabularies.get(kind);
  const allTokens = tokenize(text);
  const tokens = model.truncateTokens ? allTokens.slice(0, model.truncateTokens) : allTokens;
  const features = [...tokens, ...tokens.slice(1).map((token, i) => `${tokens[i]} ${token}`)];
  const counts = new Map();
  for (const feature of features) if (vocabulary.has(feature)) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  const values = [...counts].map(([term, count]) => {
    const [idf, coefficient] = vocabulary.get(term);
    return { term, value: (1 + Math.log(count)) * idf, coefficient };
  });
  const norm = Math.sqrt(values.reduce((sum, feature) => sum + feature.value ** 2, 0)) || 1;
  const margin = model.bias + values.reduce((sum, feature) => sum + feature.value / norm * feature.coefficient, 0);
  const knownTokens = tokens.filter(token => vocabulary.has(token)).length;
  const applicable = (!model.maxTokens || allTokens.length <= model.maxTokens) && allTokens.length >= (model.minimumTokens ?? 0) && knownTokens >= model.minimumKnownTokens;
  const ranked = values.filter(feature => feature.coefficient > 0 && /^[a-z]+(?: [a-z]+)?$/.test(feature.term))
    .sort((a, b) => b.value * b.coefficient - a.value * a.coefficient);
  const clues = ranked.slice(0, 5).map(feature => feature.term);
  // Preserve decision evidence separately. Presentation avoids treating a
  // common function word such as "your" as an independently suspicious phrase.
  const contentClues = ranked.filter(feature => feature.term.split(' ').some(word => !FUNCTION_WORDS.has(word))).slice(0, 5).map(feature => feature.term);
  return { kind, applicable, matched: applicable && margin >= model.threshold, margin, threshold: model.threshold, knownTokens, tokenCount: allTokens.length, truncated: Boolean(model.truncateTokens && allTokens.length > model.truncateTokens), clues, contentClues, version: model.version };
}
