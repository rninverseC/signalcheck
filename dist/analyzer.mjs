import { RULES } from './rules.mjs?v=3.0.0';
import { normalizeText, originalEvidence, isNegated } from './text-utils.mjs?v=3.0.0';
import { BRANDS, SHORTENERS, extractLinks, isWithin, claimedBrands, lookalikeBrands, displayedLinkMismatches } from './link-checks.mjs?v=3.0.0';
import { classifySms } from './sms-classifier.mjs?v=3.0.0';

import { LANGUAGES, LANGUAGE_RULES, languageName, isLanguageNegated, sourceScriptMismatch } from './languages.mjs?v=3.0.0';

export { RULES, extractLinks };
export const VERSION = '3.0.0';
export const MAX_LENGTH = 20000;
// Related signals share a budget: a sender mismatch and a link mismatch do
// not count as two independent identities. Weights remain design choices.
export const GROUP_LIMITS = { sensitive: 45, money: 45, pressure: 24, identity: 30, technical: 40, offer: 28, access: 40, greeting: 4 };

export function analyzeMessage({ message, sender = '', type = 'email', language = 'en', translation = '', translationOrigin = 'manual' }) {
  const text = String(message ?? '').trim();
  if (!text) throw new Error('Paste a message to check first.');
  if (text.length > MAX_LENGTH) throw new Error('Please keep the message under 20,000 characters.');
  if (!LANGUAGES.some(item => item.code === language)) throw new Error('Choose English, Spanish, or Chinese as the message language.');
  const english = language === 'en' ? '' : String(translation ?? '').trim();
  if (english.length > MAX_LENGTH) throw new Error('Please keep the English translation under 20,000 characters.');
  if (english && sourceScriptMismatch(english, 'en')) throw new Error('The translation still contains non-English passages. Review the English translation before checking.');
  const limited = !english && sourceScriptMismatch(text, language);
  const senderText = String(sender).trim().slice(0, 320);
  const normalized = normalizeText(text);
  const findings = [];
  const add = (id, title, weight, group, explanation, evidence, basis = 'rule') => {
    const existing = findings.find(finding => finding.id === id);
    if (existing) {
      if (weight > existing.baseWeight) Object.assign(existing, { baseWeight: weight, title, explanation });
      for (const item of evidence) if (existing.evidence.length < 4 && !existing.evidence.some(e => e.start === item.start && e.source === item.source)) existing.evidence.push(item);
      return;
    }
    findings.push({ id, title, baseWeight: weight, weight, group, explanation, evidence: evidence.slice(0, 4), strength: weight >= 25 ? 'strong' : 'contextual', basis });
  };
  // Keep translated evidence in its own coordinate space. Original URLs and
  // sender details are never replaced with machine-generated equivalents.
  const sources = [{ normalized, source: 'message', rules: RULES, code: 'en' }];
  const nativeCode = language.startsWith('zh') ? 'zh' : language;
  if (nativeCode !== 'en') {
    const nativeRules = LANGUAGE_RULES[nativeCode].filter(item => !['login-link', 'toll-payment'].includes(item.id)).map(item => {
      const base = RULES.find(rule => rule.id === (item.id === 'credentials-entry' ? 'credentials' : item.id) && (item.id !== 'credentials-entry' || rule.weight === 22));
      return { ...base, pattern: item.pattern };
    });
    sources.push({ normalized, source: 'message', rules: nativeRules, code: nativeCode });
  }
  if (english) sources.push({ normalized: normalizeText(english), source: 'translation', rules: RULES.filter(rule => rule.id !== 'attachment'), code: 'en' });
  for (const source of sources) for (const rule of source.rules) {
    const evidence = [];
    for (const match of source.normalized.text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
      if (source.code === 'en' ? isNegated(source.normalized.text, match.index) : isLanguageNegated(source.normalized.text, match.index, source.code)) continue;
      evidence.push({ ...originalEvidence(source.normalized, match.index, match.index + match[0].length), source: source.source });
      if (evidence.length === 4) break;
    }
    const basis = source.source === 'translation' ? 'English translation rule' : source.code !== 'en' ? `${languageName(language)} request rule` : 'rule';
    if (evidence.length) add(rule.id, rule.title, rule.weight, rule.group, rule.explanation, evidence, basis);
  }

  const links = extractLinks(text);
  const identities = [...new Set([...claimedBrands(text, senderText), ...(english ? claimedBrands(english, '') : [])])];
  const actionWords = /\b(?:click|visit|sign\s*in|log\s*in|verify|confirm|pay|payment|update|activate|review|receipt|restore|paga|pague|verifica|verifique|confirma|inicia|actualiza)\b|点击|點擊|支付|付款|验证|驗證|登[录錄入]|更新/iu;
  for (const link of links) {
    const evidence = [{ text: link.raw, start: link.start, end: link.end, source: 'message' }];
    if (SHORTENERS.has(link.host)) add('short-link', 'Shortened link hides its destination', 12, 'technical', 'Short links can be legitimate, but they hide the final destination. This checker does not expand or visit them.', evidence);
    if (link.protocol === 'http:') add('http-link', 'Link uses an unencrypted connection', 8, 'technical', 'HTTP does not encrypt the connection. HTTPS would encrypt it but would still not establish that a site is trustworthy.', evidence);
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(link.host) || link.host.startsWith('[')) add('ip-link', 'Link points to an IP address', 20, 'technical', 'A numeric address hides the familiar domain you might expect. This is a structural signal, not a reputation lookup.', evidence);
    if (link.hasUserInfo) add('userinfo-link', 'Misleading text before the link hostname', 28, 'technical', `Text before the @ symbol is not the destination. The actual hostname is ${link.host}.`, evidence);
    if (link.host.includes('xn--')) add('unicode-link', 'Internationalized domain needs a closer look', 12, 'technical', 'The hostname includes a punycode label. Internationalized names are legitimate, but similar-looking characters can disguise a destination.', evidence);
    const lookalikes = lookalikeBrands(link.host);
    if (lookalikes.length) add('lookalike-link', 'Link resembles an organization’s domain', 30, 'identity', `The hostname ${link.host} contains or closely resembles ${lookalikes.map(brand => brand.name).join(', ')}, outside the checker’s known domain list. This can be a lookalike or an unrelated legitimate name; verify independently.`, evidence);
    const matchesAnIdentity = identities.some(brand => brand.domains.some(domain => isWithin(link.host, domain)));
    const asksForAction = actionWords.test(normalized.text) || (english && actionWords.test(english));
    if (identities.length && !matchesAnIdentity && asksForAction) add('brand-link', 'Link domain differs from the claimed organization', 22, 'identity', `The message appears to identify itself with ${identities.map(brand => brand.name).join(', ')}, but the link hostname is ${link.host}. Third-party services can be legitimate; this limited domain list is not comprehensive.`, evidence);
  }
  for (const mismatch of displayedLinkMismatches(text)) add('displayed-link', 'Displayed link and destination do not agree', 35, 'technical', `The pasted link shows ${mismatch.displayedHost}, but its destination is ${mismatch.actualHost}. Tracking redirects may have legitimate explanations, but verify before following it.`, [mismatch.evidence]);

  let senderDomain = null;
  if (type === 'email' && senderText) {
    const email = senderText.match(/@([\p{L}\p{N}.-]+\.[\p{L}]{2,24})(?=\s|>|$)/iu);
    try { if (email) senderDomain = new URL(`https://${email[1]}`).hostname.toLowerCase().replace(/\.$/, ''); } catch { /* Not an authenticating parser. */ }
    if (senderDomain && identities.length && !identities.some(brand => brand.domains.some(domain => isWithin(senderDomain, domain)))) add('brand-sender', 'Sender domain differs from the claimed organization', 18, 'identity', `The message appears to identify itself with ${identities.map(brand => brand.name).join(', ')}, while the sender domain is ${senderDomain}. Outsourced senders can be legitimate. No email authentication or header checks were performed.`, [{ text: senderText, source: 'sender' }]);
  }

  const requestSources = [{ normalized, source: 'message', code: 'en' }];
  if (nativeCode !== 'en') requestSources.push({ normalized, source: 'message', code: nativeCode });
  if (english) requestSources.push({ normalized: normalizeText(english), source: 'translation', code: 'en' });
  for (const source of requestSources) {
    if (links.length) {
      const extras = source.code === 'en' ? [
        { id: 'login-link', pattern: /\b(?:sign\s*in|log\s*in|confirm\s+(?:your\s+)?account|verify\s+(?:your\s+)?identity)\b/gi },
        { id: 'toll-payment', pattern: /\b(?:unpaid|outstanding|overdue)\s+(?:road\s+)?tolls?\b/gi },
      ] : LANGUAGE_RULES[source.code].filter(rule => ['login-link', 'toll-payment'].includes(rule.id));
      for (const rule of extras) {
        if (rule.id === 'toll-payment' && type !== 'text') continue;
        for (const match of source.normalized.text.matchAll(rule.pattern)) {
          if (source.code === 'en' ? isNegated(source.normalized.text, match.index) : isLanguageNegated(source.normalized.text, match.index, source.code)) continue;
          const login = rule.id === 'login-link';
          add(rule.id, login ? 'Sign-in request accompanied by a link' : 'Text asks about unpaid tolls with a link', login ? 16 : 22, login ? 'sensitive' : 'money', login ? 'The wording asks you to sign in and the original message contains a link. Open the official app yourself to verify.' : 'The wording mentions unpaid tolls and the original text contains a link. Check your toll agency through a contact you already know.', [{ ...originalEvidence(source.normalized, match.index, match.index + match[0].length), source: source.source }], source.source === 'translation' ? 'English translation rule' : 'language request rule');
        }
      }
    }
    if (source.code !== 'en') continue;
    for (const match of source.normalized.text.matchAll(/\b(?:send|forward|share|reply\s+with|tell\s+(?:me|us))\s+(?:it|the\s+code)\b/gi)) {
      const previous = source.normalized.text.slice(Math.max(0, match.index - 160), match.index);
      if (/\b(?:password|passcode|otp|verification\s+code|security\s+code|one[- ]time\s+code)\b/.test(previous) && !isNegated(source.normalized.text, match.index)) add('credentials', 'Request to forward a password or security code', 40, 'sensitive', 'The instruction appears to refer to a password or code mentioned just before it. Sharing that code can grant access to an account.', [{ ...originalEvidence(source.normalized, match.index, match.index + match[0].length), source: source.source }], source.source === 'translation' ? 'English translation rule' : 'rule');
    }
  }

  // Training/evaluation used English SMS. Translation output has a different
  // distribution, so do not claim model coverage for non-English input.
  const smsModel = type === 'text' && language === 'en' && !limited ? classifySms(text) : null;
  if (smsModel?.matched) {
    const evidence = [];
    for (const clue of smsModel.clues) {
      const escaped = clue.split(' ').join('\\W+');
      const match = new RegExp(`\\b${escaped}\\b`, 'i').exec(normalized.text);
      if (match && !isNegated(normalized.text, match.index)) evidence.push(originalEvidence(normalized, match.index, match.index + match[0].length));
      if (evidence.length === 3) break;
    }
    if (evidence.length) {
      const displayEvidence = [];
      for (const clue of smsModel.contentClues) {
        const match = new RegExp(`\\b${clue.split(' ').join('\\W+')}\\b`, 'i').exec(normalized.text);
        if (match && !isNegated(normalized.text, match.index)) displayEvidence.push(originalEvidence(normalized, match.index, match.index + match[0].length));
        if (displayEvidence.length === 3) break;
      }
      add('sms-pattern', 'Wording resembles unsolicited SMS messages', 16, 'offer', 'A small model trained on older public SMS spam examples matched the whole message’s wording pattern. Any excerpts are supporting word associations, not proof that individual words are suspicious. Spam can include advertising, not just scams. This is not a fraud probability and is not evaluated on email.', displayEvidence, 'local SMS model');
    }
  }

  findings.sort((a, b) => b.baseWeight - a.baseWeight);
  const spent = {};
  for (const finding of findings) {
    finding.weight = Math.min(finding.baseWeight, Math.max(0, GROUP_LIMITS[finding.group] - (spent[finding.group] ?? 0)));
    spent[finding.group] = (spent[finding.group] ?? 0) + finding.weight;
  }
  const score = Math.min(100, findings.reduce((total, finding) => total + finding.weight, 0));
  const level = score >= 35 ? 'high' : score >= 15 ? 'medium' : 'low';
  const labels = { high: 'High concern', medium: 'Some concern', low: 'Few signals' };
  const actions = level === 'high'
    ? ['Pause before clicking, replying, paying, or sharing information.', 'Verify the request using an official app or a contact you already trust.', 'If it is fraudulent, use your email or messaging app’s report-spam option.']
    : level === 'medium'
      ? ['Check whether you expected this message and recognize the context.', 'Verify unusual requests through an official app or a trusted contact.', 'Avoid sharing sensitive details until you have verified the sender.']
      : ['A low score does not confirm that the message is safe.', 'Verify unexpected links, payments, or requests using a source you already trust.', 'Consider the context: were you expecting this message?'];
  return { message: text, sender: senderText, senderDomain, type, score, level, label: limited && level !== 'high' ? 'Limited check' : labels[level], findings, links, actions, version: VERSION, smsModel, language, translation: english, translationOrigin: english ? translationOrigin : null, coverage: limited ? 'limited' : english ? 'translation-assisted' : 'direct', languageNotice: limited ? 'Some passages use a different writing system from the selected language. Only partial checks ran. Choose the correct language or provide an English translation; a low points total is not a complete assessment.' : language === 'en' ? 'English rules checked. The SMS model is used only for eligible English texts.' : `${languageName(language)} request patterns and original links checked${english ? ', with English rules also applied to the translation' : ''}. These starter checks have no independent multilingual accuracy benchmark. The English SMS model was skipped.` };
}

export function highlightRanges(result) {
  const ranges = result.findings.flatMap(f => f.evidence.filter(e => e.source === 'message').map(e => ({ start: e.start, end: e.end }))).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}
