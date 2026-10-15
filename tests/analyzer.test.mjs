import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMessage, extractLinks, highlightRanges, RULES } from '../dist/analyzer.mjs';
import { scenarios } from './scenarios.mjs';
import { classifySms } from '../dist/sms-classifier.mjs';
import { SMS_MODEL } from '../dist/sms-model.mjs';
const check = (message, sender, type) => analyzeMessage({ message, sender, type });
const has = (result, id) => result.findings.some(f => f.id === id);

test('ordinary conversation produces no signals and still advises verification', () => {
  const result = check('Hey Alex, coffee tomorrow at 3? I will bring our study notes.');
  assert.equal(result.score, 0); assert.equal(result.level, 'low');
  assert.match(result.actions[0], /does not confirm/);
});
test('combined credential theft, account pressure and spoofed brand domains are high concern', () => {
  const result = check('Dear customer, your PayPal account will be suspended. Verify your password immediately at https://paypal.com.evil.example/login.', 'security@paypal-alert.example');
  for (const id of ['credentials', 'account-threat', 'brand-link', 'brand-sender', 'urgency']) assert.ok(has(result, id), id);
  assert.equal(result.level, 'high'); assert.ok(result.score <= 100);
});
test('official subdomains are not confused with lookalike domains', () => {
  assert.equal(has(check('PayPal receipt: https://www.paypal.com/activity', 'service@paypal.com'), 'brand-link'), false);
  assert.ok(has(check('PayPal receipt: https://paypal.com.security.example'), 'brand-link'));
  assert.ok(has(check('PayPal receipt: https://notpaypal.com'), 'brand-link'));
});
test('credential mentions and negated requests do not become requests', () => {
  for (const message of ['I changed my password yesterday.', 'Never share your password or security code.', 'We will never ask you to provide your password.', 'Do not send your credit card details.', 'Do not pay with gift cards.']) {
    const result = check(message);
    assert.equal(has(result, 'credentials'), false, message);
    assert.equal(has(result, 'financial-info'), false, message);
    assert.equal(has(result, 'unusual-payment'), false, message);
  }
});
test('negation in one sentence does not suppress a later instruction', () => {
  assert.ok(has(check('Never reply to strangers. Send your password to me.'), 'credentials'));
});
test('secrecy instructions remain detectable despite negative wording', () => {
  assert.ok(has(check("Don't tell anyone. Keep this confidential."), 'secrecy'));
});
test('each signal contributes once even if repeated', () => {
  const result = check('Urgent! Urgent! Act now! Immediately!');
  assert.equal(result.score, RULES.find(rule => rule.id === 'urgency').weight);
});
test('unsafe link structures, bare domains, and punctuation are parsed', () => {
  assert.equal(extractLinks('See https://paypal.com@evil.example/login.')[0].host, 'evil.example');
  assert.ok(has(check('Visit https://paypal.com@evil.example/login'), 'userinfo-link'));
  assert.ok(has(check('See http://192.0.2.1/login'), 'ip-link'));
  assert.ok(has(check('Visit bit.ly/demo'), 'short-link'));
  assert.equal(extractLinks('Email me at help@example.com').length, 0);
  assert.equal(extractLinks('Visit https://example.com/test).')[0].raw, 'https://example.com/test');
});
test('sender details are optional and a text sender is not treated as email authentication', () => {
  assert.equal(check('Hi there.').senderDomain, null);
  assert.equal(has(check('Your PayPal receipt is ready.', 'person@example.com', 'text'), 'brand-sender'), false);
});
test('sensitive information, remote access, and risky attachment instructions match', () => {
  assert.ok(has(check('Please enter your social security number.'), 'financial-info'));
  assert.ok(has(check('Pay us with gift cards.'), 'unusual-payment'));
  assert.ok(has(check('Please install AnyDesk to resolve this.'), 'remote-access'));
  assert.ok(has(check('Open invoice.pdf.exe'), 'attachment'));
});
test('HTML input remains literal and merged evidence offsets are correct', () => {
  const result = check('  <img src=x onerror=alert(1)> Please send your password immediately.  ');
  assert.match(result.message, /^<img/);
  for (const finding of result.findings) for (const evidence of finding.evidence) if (evidence.source === 'message') assert.equal(result.message.slice(evidence.start, evidence.end), evidence.text);
  const ranges = highlightRanges(result);
  ranges.forEach((range, i) => { assert.ok(range.end <= result.message.length); if (i) assert.ok(range.start > ranges[i - 1].end); });
});
test('blank and oversized input rejected; max-size ordinary input accepted', () => {
  assert.throws(() => check('  \n '), /Paste/);
  assert.throws(() => check('x'.repeat(20001)), /20,000/);
  assert.equal(check('x'.repeat(20000)).score, 0);
});

const severity = { low: 0, medium: 1, high: 2 };
for (const scenario of scenarios) test(`scenario: ${scenario.id}`, () => {
  const result = analyzeMessage(scenario);
  if (scenario.minimum) assert.ok(severity[result.level] >= severity[scenario.minimum], `${result.level} (${result.score}); expected at least ${scenario.minimum}`);
  if (scenario.maximum) assert.ok(severity[result.level] <= severity[scenario.maximum], `${result.level} (${result.score}): ${result.findings.map(f => f.id).join(', ')}`);
  for (const finding of result.findings) for (const evidence of finding.evidence) if (evidence.source === 'message') assert.equal(result.message.slice(evidence.start, evidence.end), evidence.text);
});
test('related pressure and identity evidence share a scoring budget', () => {
  const result = check('PayPal Security: Your account is suspended. Act now immediately, final warning! Review https://paypal-security.example/login.', 'PayPal Security <security@paypal-security.example>');
  const pressure = result.findings.filter(f => f.group === 'pressure').reduce((sum, f) => sum + f.weight, 0);
  const identity = result.findings.filter(f => f.group === 'identity').reduce((sum, f) => sum + f.weight, 0);
  assert.ok(pressure <= 24); assert.ok(identity <= 30);
});
test('model vocabulary keys cannot be mistaken for object prototypes', () => {
  assert.ok(Number.isFinite(classifySms('constructor prototype toString ordinary message').margin));
});
test('SMS model runs for short texts only, and never for email', () => {
  assert.equal(check('Free reward: claim your prize now!', '', 'email').smsModel, null);
  assert.equal(classifySms('hello '.repeat(181)).applicable, false);
  assert.equal(classifySms('qzxv wqxz zqqv').applicable, false);
});
test('classifier contributions reproduce the exported linear model', () => {
  const word = Object.keys(SMS_MODEL.features).find(term => /^[a-z]+$/.test(term));
  const [idf, coefficient] = SMS_MODEL.features[word];
  assert.ok(idf > 0);
  assert.ok(Math.abs(classifySms(word).margin - (SMS_MODEL.bias + coefficient)) < 1e-8);
});
test('model explanations exclude function-word-only excerpts', () => {
  const result = check('Fraud department: Transfer your savings to a safe account to protect it. Keep this confidential and do not contact your bank.', '', 'text');
  const model = result.findings.find(f => f.id === 'sms-pattern');
  assert.ok(model);
  for (const evidence of model.evidence) assert.ok(!/^(?:your|to|this|it|the|and)$/i.test(evidence.text));
});
