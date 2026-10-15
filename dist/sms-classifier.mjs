import { SMS_MODEL } from './sms-model.mjs?v=3.0.0';

const vocabulary = new Map(Object.entries(SMS_MODEL.features));
const FUNCTION_WORDS = new Set('i me my mine we us our ours you your yours they them their theirs he him his she her hers it its a an the and or but if then as at by for from in into of on to with is am are was were be been being do does did have has had will would can could should may might this that these those there here now all any some so not no yes'.split(' '));

export function tokenizeSms(text) {
  const normalized = text.normalize('NFKC').toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '')
    .replace(/(?:https?:\/\/|www\.)\S+/g, ' __url__ ')
    .replace(/\p{Nd}+(?:[.,]\p{Nd}+)*/gu, ' __number__ ')
    .replace(/[£$€]/g, ' __money__ ');
  return normalized.match(/__[a-z]+__|[a-z]{2,}/g) ?? [];
}

export function classifySms(text) {
  const tokens = tokenizeSms(text);
  const features = [...tokens, ...tokens.slice(1).map((token, i) => `${tokens[i]} ${token}`)];
  const counts = new Map();
  for (const feature of features) if (vocabulary.has(feature)) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  const values = [...counts].map(([term, count]) => {
    const [idf, coefficient] = vocabulary.get(term);
    return { term, value: (1 + Math.log(count)) * idf, coefficient };
  });
  const norm = Math.sqrt(values.reduce((sum, feature) => sum + feature.value ** 2, 0)) || 1;
  const margin = SMS_MODEL.bias + values.reduce((sum, feature) => sum + feature.value / norm * feature.coefficient, 0);
  const knownTokens = tokens.filter(token => vocabulary.has(token)).length;
  const applicable = tokens.length <= SMS_MODEL.maxTokens && knownTokens >= SMS_MODEL.minimumKnownTokens;
  const clues = values.filter(feature => feature.coefficient > 0 && /^[a-z]+(?: [a-z]+)?$/.test(feature.term))
    .sort((a, b) => b.value * b.coefficient - a.value * a.coefficient).slice(0, 5).map(feature => feature.term);
  // Preserve decision evidence separately. Presentation avoids treating a
  // common function word such as "your" as an independently suspicious phrase.
  const contentClues = values.filter(feature => feature.coefficient > 0 && /^[a-z]+(?: [a-z]+)?$/.test(feature.term) && feature.term.split(' ').some(word => !FUNCTION_WORDS.has(word)))
    .sort((a, b) => b.value * b.coefficient - a.value * a.coefficient).slice(0, 5).map(feature => feature.term);
  return { applicable, matched: applicable && margin >= SMS_MODEL.threshold, margin, threshold: SMS_MODEL.threshold, knownTokens, tokenCount: tokens.length, clues, contentClues, version: SMS_MODEL.version };
}
