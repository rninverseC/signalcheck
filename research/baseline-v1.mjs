// Deliberately transparent heuristics. Weights are design choices, not probabilities.
export const VERSION = '1.0';
export const MAX_LENGTH = 20000;
export const RULES = [
  { id: 'credentials', title: 'Request for a password or security code', weight: 35, pattern: /\b(?:send|share|provide|enter|confirm|verify|reply\s+with|give|tell\s+us|submit|disclose)\b[^.!?\n]{0,65}?\b(?:password|passcode|pin|otp|one[- ]time\s+(?:password|code)|(?:verification|security|authentication|2fa)\s+code)\b/gi, explanation: 'A request to send or enter a password or security code can be an attempt to take over an account. Verify the request through the official app or a website you already know.' },
  { id: 'financial-info', title: 'Request for sensitive personal information', weight: 30, pattern: /\b(?:send|share|provide|enter|confirm|verify|reply\s+with|submit|update)\b[^.!?\n]{0,65}?\b(?:social\s+security(?:\s+number)?|ssn|credit\s+card(?:\s+(?:number|details))?|bank\s+(?:account|details)|debit\s+card|card\s+details|payment\s+(?:information|details))\b/gi, explanation: 'The message asks for financial or identity details. A copied message cannot establish who is asking or whether the destination is legitimate.' },
  { id: 'unusual-payment', title: 'Unusual payment instructions', weight: 32, pattern: /\b(?:pay|payment|send|buy|purchase|transfer|deposit)\b[^.!?\n]{0,70}?\b(?:gift\s*cards?|bitcoin|crypto(?:currency)?|wire\s+transfer|western\s+union|moneygram)\b|\b(?:gift\s*cards?|bitcoin|crypto(?:currency)?)\b[^.!?\n]{0,40}?\b(?:payment|pay|send|transfer)\b/gi, explanation: 'Payment requests involving gift cards, cryptocurrency, or wire transfers deserve extra scrutiny. These methods can make recovering money difficult.' },
  { id: 'remote-access', title: 'Request to grant remote access', weight: 30, pattern: /\b(?:install|download|open|run|enable)\b[^.!?\n]{0,45}?\b(?:anydesk|teamviewer|remote\s+(?:access|desktop)|screen[- ]sharing)\b|\b(?:give|grant|allow)\b[^.!?\n]{0,35}?\bremote\s+access\b/gi, explanation: 'Remote access can give another person control of your device. Verify the sender independently before installing software or granting access.' },
  { id: 'investment', title: 'Promise of guaranteed investment returns', weight: 28, pattern: /\b(?:guaranteed\s+(?:returns?|profits?|income)|risk[- ]free\s+(?:investment|returns?|profits?)|double\s+your\s+(?:money|investment))\b/gi, explanation: 'Claims of guaranteed profits or risk-free investments are a common fraud tactic. The checker cannot verify the investment or the person making the offer.' },
  { id: 'attachment', title: 'Potentially risky file extension', weight: 28, pattern: /\b[\w.-]+\.(?:exe|scr|bat|cmd|msi|vbs|ps1|js|jar|hta)\b/gi, explanation: 'The message names a file type that may execute code. This is a text pattern only: no attachment has been uploaded or scanned.' },
  { id: 'secrecy', title: 'Pressure to keep the request secret', weight: 20, pattern: /\b(?:keep\s+(?:this|it)\s+(?:a\s+secret|confidential|between\s+us)|(?:do\s+not|don['’]t)\s+(?:tell|discuss\s+this\s+with)\s+(?:anyone|your\s+(?:family|bank|colleagues))|do\s+not\s+contact\s+(?:your\s+)?bank)\b/gi, explanation: 'Secrecy can isolate you from people who could help check a request. Independently contact someone you trust before acting.', keepNegations: true },
  { id: 'prize', title: 'Prize or unexpected reward', weight: 18, pattern: /\b(?:you(?:['’]ve|\s+have)?\s+(?:won|been\s+selected)|claim\s+your\s+(?:prize|reward|free\s+gift)|(?:free|unclaimed)\s+(?:prize|gift\s*card)|lottery\s+winner|congratulations[^.!?\n]{0,25}?winner)\b/gi, explanation: 'Unexpected prizes and rewards can be bait for personal information or a payment. A reward claim alone does not prove that a message is fraudulent.' },
  { id: 'account-threat', title: 'Threat of an account restriction', weight: 16, pattern: /\b(?:account\b[^.!?\n]{0,35}?\b(?:suspended|locked|blocked|terminated|on\s+hold|disabled|closed)|(?:suspend|close|disable|terminate|lock)\s+(?:your\s+)?account|(?:avoid|prevent)\s+(?:account\s+)?(?:suspension|termination))\b/gi, explanation: 'Claims that an account will be restricted can pressure you into acting. Check account status by opening the official app yourself.' },
  { id: 'urgency', title: 'Pressure to act quickly', weight: 14, pattern: /\b(?:urgent(?:ly)?|immediately|act\s+now|last\s+(?:chance|warning)|final\s+(?:warning|notice)|within\s+(?:\d+|one|two|three|four|twenty[- ]four)\s+(?:minutes?|hours?)|expires?\s+(?:today|in\s+\d+\s+(?:minutes?|hours?)))\b/gi, explanation: 'A tight deadline can discourage you from checking the details. Legitimate reminders can also be urgent, so consider this alongside other signals.' },
  { id: 'payment', title: 'Request for a payment or payment update', weight: 10, pattern: /\b(?:pay\s+(?:a|the|your|\$|£|€)|payment\s+(?:required|overdue|failed|needed)|unpaid\s+(?:invoice|toll|fee)|update\s+(?:your\s+)?(?:billing|payment)|(?:redelivery|delivery|processing)\s+fee)\b/gi, explanation: 'Unexpected invoices, fees, or billing updates are common scam scenarios. Ordinary bills can match too; verify the request in your existing account.' },
  { id: 'generic-greeting', title: 'Generic greeting', weight: 4, pattern: /\b(?:dear\s+(?:customer|user|account\s+holder|valued\s+customer)|hello\s+(?:customer|user))\b/gi, explanation: 'A generic greeting is a weak signal because many legitimate messages use one. It matters more when paired with sensitive requests or unusual links.' },
];

const BRANDS = [
  { name: 'PayPal', pattern: /\bpaypal\b/i, domains: ['paypal.com', 'paypal.me'] },
  { name: 'Apple', pattern: /\bapple\b/i, domains: ['apple.com', 'icloud.com'] },
  { name: 'Microsoft', pattern: /\bmicrosoft\b/i, domains: ['microsoft.com', 'microsoftonline.com', 'live.com', 'outlook.com', 'office.com'] },
  { name: 'Amazon', pattern: /\bamazon\b/i, domains: ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.in', 'amazon.co.jp', 'amazon.com.au'] },
  { name: 'USPS', pattern: /\busps\b|\bu\.?s\.?\s+postal\s+service\b/i, domains: ['usps.com'] },
  { name: 'FedEx', pattern: /\bfedex\b/i, domains: ['fedex.com'] },
  { name: 'UPS', pattern: /\bups\b/i, domains: ['ups.com'] },
];
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'shorturl.at', 'rb.gy', 'rebrand.ly', 'ow.ly', 'buff.ly']);
const isWithin = (host, domain) => host === domain || host.endsWith(`.${domain}`);
const negated = (text, start) => {
  const prefix = text.slice(Math.max(0, start - 100), start).split(/[.!?\n;]/).at(-1);
  return /\b(?:never|do\s+not|don['’]t|will\s+not|won['’]t|does\s+not|doesn['’]t|not\s+(?:to|required\s+to))\b[^,;]{0,75}$/i.test(prefix);
};

export function extractLinks(text) {
  const pattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+|(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>"']*)?/giu;
  const links = [];
  for (const match of text.matchAll(pattern)) {
    const raw = match[0].replace(/[.,;:!?\)\]\}]+$/g, '');
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!url.hostname.includes('.') && !url.hostname.includes(':')) continue;
      links.push({ raw, host: url.hostname.toLowerCase().replace(/\.$/, ''), protocol: url.protocol, hasUserInfo: Boolean(url.username || url.password), start: match.index, end: match.index + raw.length });
    } catch { /* Malformed URLs are left as plain text. */ }
  }
  return links;
}

export function analyzeMessage({ message, sender = '', type = 'email' }) {
  const text = String(message ?? '').trim();
  if (!text) throw new Error('Paste a message to check first.');
  if (text.length > MAX_LENGTH) throw new Error('Please keep the message under 20,000 characters.');
  const senderText = String(sender).trim().slice(0, 320);
  const findings = [];
  const add = (id, title, weight, explanation, evidence) => {
    const existing = findings.find(finding => finding.id === id);
    if (existing) { existing.evidence.push(...evidence.slice(0, Math.max(0, 4 - existing.evidence.length))); return; }
    findings.push({ id, title, weight, explanation, evidence: evidence.slice(0, 4), strength: weight >= 25 ? 'strong' : 'contextual' });
  };
  for (const rule of RULES) {
    const evidence = [];
    for (const match of text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
      if (!rule.keepNegations && negated(text, match.index)) continue;
      evidence.push({ text: match[0], start: match.index, end: match.index + match[0].length, source: 'message' });
      if (evidence.length === 4) break;
    }
    if (evidence.length) add(rule.id, rule.title, rule.weight, rule.explanation, evidence);
  }
  const links = extractLinks(text);
  const claimedBrands = BRANDS.filter(brand => brand.pattern.test(text));
  for (const link of links) {
    const evidence = [{ text: link.raw, start: link.start, end: link.end, source: 'message' }];
    if (SHORTENERS.has(link.host)) add('short-link', 'Shortened link hides its destination', 12, 'A short link obscures the final destination. Short links can be legitimate, but this checker does not expand or visit them.', evidence);
    if (link.protocol === 'http:') add('http-link', 'Link uses an unencrypted connection', 8, 'This link uses HTTP. HTTPS encrypts a connection but does not prove a site is trustworthy; neither kind of link is verified here.', evidence);
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(link.host) || link.host.startsWith('[')) add('ip-link', 'Link points to an IP address', 20, 'A numeric address hides the familiar domain you might expect. This is a structural warning, not a live reputation check.', evidence);
    if (link.hasUserInfo) add('userinfo-link', 'Misleading text before the link hostname', 25, `Text before the @ symbol is not the destination. The actual hostname in this link is ${link.host}.`, evidence);
    if (link.host.includes('xn--')) add('unicode-link', 'Internationalized domain needs a closer look', 12, 'The hostname includes a punycode label. Internationalized names are legitimate, but similar-looking characters can also disguise a destination.', evidence);
    const mismatches = claimedBrands.filter(brand => !brand.domains.some(domain => isWithin(link.host, domain)));
    if (mismatches.length) add('brand-link', 'Link domain differs from a mentioned organization', 22, `This message mentions ${mismatches.map(brand => brand.name).join(', ')}, but the link hostname is ${link.host}. Third-party links can be legitimate. The small built-in domain list is not comprehensive; verify through the organization's official app or a trusted contact.`, evidence);
  }
  let senderDomain = null;
  if (type === 'email' && senderText) {
    const email = senderText.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-z0-9.-]+\.[a-z]{2,24})/i);
    senderDomain = email?.[1].toLowerCase().replace(/\.$/, '') ?? null;
    if (senderDomain) {
      const mismatches = claimedBrands.filter(brand => !brand.domains.some(domain => isWithin(senderDomain, domain)));
      if (mismatches.length) add('brand-sender', 'Sender domain differs from a mentioned organization', 18, `The message mentions ${mismatches.map(brand => brand.name).join(', ')}, while the sender domain is ${senderDomain}. This may have a legitimate explanation. Displayed sender details can also be spoofed; no sender authentication was performed.`, [{ text: senderText, source: 'sender' }]);
    }
  }
  findings.sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, findings.reduce((total, finding) => total + finding.weight, 0));
  const level = score >= 35 ? 'high' : score >= 15 ? 'medium' : 'low';
  const labels = { high: 'High concern', medium: 'Some concern', low: 'Few signals' };
  const actions = level === 'high'
    ? ['Pause before clicking, replying, paying, or sharing information.', 'Verify the request using an official app or a contact you already trust.', 'If it is fraudulent, use your email or messaging app’s report-spam option.']
    : level === 'medium'
      ? ['Check whether you expected this message and recognize the context.', 'Verify unusual requests through an official app or a trusted contact.', 'Avoid sharing sensitive details until you have verified the sender.']
      : ['A low score does not confirm that the message is safe.', 'Verify unexpected links, payments, or requests using a source you already trust.', 'Consider the context: were you expecting this message?'];
  return { message: text, sender: senderText, senderDomain, type, score, level, label: labels[level], findings, links, actions, version: VERSION };
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
