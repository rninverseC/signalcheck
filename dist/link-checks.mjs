import { normalizeText, originalEvidence } from './text-utils.mjs?v=3.0.0';

export const BRANDS = [
  { name: 'PayPal', token: 'paypal', pattern: /\bpaypal\b/i, domains: ['paypal.com', 'paypal.me'] },
  { name: 'Apple', token: 'apple', pattern: /\bapple\b/i, domains: ['apple.com', 'icloud.com'] },
  { name: 'Microsoft', token: 'microsoft', pattern: /\bmicrosoft\b/i, domains: ['microsoft.com', 'microsoftonline.com', 'live.com', 'outlook.com', 'office.com'] },
  { name: 'Amazon', token: 'amazon', pattern: /\bamazon\b/i, domains: ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.in', 'amazon.co.jp', 'amazon.com.au'] },
  { name: 'USPS', token: 'usps', pattern: /\busps\b|\bu\.?s\.?\s+postal\s+service\b/i, domains: ['usps.com'] },
  { name: 'FedEx', token: 'fedex', pattern: /\bfedex\b/i, domains: ['fedex.com'] },
  { name: 'UPS', token: 'ups', pattern: /\bups\b/i, domains: ['ups.com'] },
];
export const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'shorturl.at', 'rb.gy', 'rebrand.ly', 'ow.ly', 'buff.ly']);
const FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'exe', 'js', 'mjs', 'py', 'bat', 'ps1', 'msi', 'vbs', 'scr']);
export const isWithin = (host, domain) => host === domain || host.endsWith(`.${domain}`);

function replaceMapped(value, pattern, replacement) {
  const starts = [], ends = [];
  let text = '', cursor = 0;
  for (const match of value.text.matchAll(pattern)) {
    text += value.text.slice(cursor, match.index);
    starts.push(...value.starts.slice(cursor, match.index)); ends.push(...value.ends.slice(cursor, match.index));
    const changed = typeof replacement === 'function' ? replacement(match[0]) : replacement;
    text += changed;
    for (let i = 0; i < changed.length; i++) { starts.push(value.starts[match.index]); ends.push(value.ends[match.index + match[0].length - 1]); }
    cursor = match.index + match[0].length;
  }
  text += value.text.slice(cursor); starts.push(...value.starts.slice(cursor)); ends.push(...value.ends.slice(cursor));
  return { ...value, text, starts, ends };
}

export function extractLinks(text) {
  let normalized = normalizeText(text);
  normalized = replaceMapped(normalized, /hxxps?:\/\//g, value => value.replace('xx', 'tt'));
  normalized = replaceMapped(normalized, /\[\.\]|\(\.\)|\{\.\}/g, '.');
  // NFKC turns fullwidth comma/semicolon into ASCII. Treat separators before
  // Chinese prose as an end boundary while preserving the original offsets.
  normalized = replaceMapped(normalized, /[,;](?=[\p{Script=Han}])/gu, ' ');
  const pattern = /\b(?:https?:\/\/|www\.)[^\s<>"'。！？、，；：]+|(?<![@\p{L}\p{N}._-])(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,24}(?:[/:][^\s<>"'。！？、，；：]*)?/giu;
  const links = [];
  for (const match of normalized.text.matchAll(pattern)) {
    const candidate = match[0].replace(/[.,;:!?\)\]\}]+$/g, '');
    const explicit = /^https?:\/\/|^www\./i.test(candidate);
    try {
      const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
      const host = url.hostname.toLowerCase().replace(/\.$/, '');
      if (!host.includes('.') && !host.includes(':')) continue;
      if (!explicit && FILE_EXTENSIONS.has(host.split('.').at(-1))) continue;
      const evidence = originalEvidence(normalized, match.index, match.index + candidate.length);
      links.push({ ...evidence, raw: evidence.text, host, protocol: url.protocol, hasUserInfo: Boolean(url.username || url.password), defanged: /hxxps?|\[\.\]|\(\.\)|\{\.\}/i.test(evidence.text) });
    } catch { /* Invalid destinations remain plain text, never visited. */ }
  }
  return links;
}

export function claimedBrands(text, sender) {
  const normalized = normalizeText(text).text;
  const displayName = normalizeText(sender.includes('<') ? sender.slice(0, sender.indexOf('<')) : '').text;
  return BRANDS.filter(brand => {
    const token = brand.token;
    const role = '(?:security|support|billing|account|receipt|notice|alert|team)';
    const identity = new RegExp(`(?:^(?:dear[^\\n.!?]{0,50}[\\n.!?]\\s*)?${token}\\s*(?::|-|\\b${role}\\b)|\\byour\\s+${token}\\s+${role}\\b|\\b(?:message from|this is|welcome to)\\s+${token}\\b|\\b${token}\\s+${role}\\b)`, 'i');
    return brand.pattern.test(displayName) || identity.test(normalized);
  });
}

function distanceAtMostOne(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}

export function lookalikeBrands(host) {
  const labels = host.split(/[.-]/);
  return BRANDS.filter(brand => !brand.domains.some(domain => isWithin(host, domain)) && labels.some(label =>
    label === brand.token || (brand.token.length >= 5 && distanceAtMostOne(label, brand.token))));
}

export function displayedLinkMismatches(text) {
  const mismatches = [];
  const patterns = [
    /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi,
  ];
  for (let i = 0; i < patterns.length; i++) for (const match of text.matchAll(patterns[i])) {
    const destination = i === 0 ? match[2] : match[2];
    const label = (i === 0 ? match[3].replace(/<[^>]*>/g, '') : match[1]).trim();
    const actual = extractLinks(destination)[0], displayed = extractLinks(label)[0];
    if (!actual || !displayed) continue;
    const same = actual.host === displayed.host || BRANDS.some(brand => brand.domains.some(domain => isWithin(actual.host, domain) && isWithin(displayed.host, domain)));
    if (!same) mismatches.push({ actualHost: actual.host, displayedHost: displayed.host, evidence: { text: match[0], start: match.index, end: match.index + match[0].length, source: 'message' } });
  }
  return mismatches;
}
