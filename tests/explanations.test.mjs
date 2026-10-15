import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMessage, RULES } from '../dist/analyzer.mjs';
import { getFindingExplanation, getScoreExplanation, EXPLANATIONS } from '../dist/explanations.mjs';
import { SAMPLES } from '../dist/samples.mjs';

test('bank warning gives a mechanism, independent action, and an uncertainty', () => {
  const result = analyzeMessage(SAMPLES.bank);
  const copy = getFindingExplanation(result.findings.find(f => f.id === 'safe-account'), result);
  assert.match(copy.why, /account they control/);
  assert.match(copy.next, /contact your bank/);
  assert.match(copy.limit, /does not know/);
});
test('link explanation names the actual destination, not distracting URL user information', () => {
  const result = analyzeMessage({message:'Check https://paypal.com@billing.example/login'});
  const copy = getFindingExplanation(result.findings.find(f => f.id === 'userinfo-link'), result);
  assert.equal(copy.found, 'Actual link destination: billing.example.');
});
test('displayed link explanation distinguishes the visible address and destination', () => {
  const result = analyzeMessage({message:'[https://paypal.com](https://billing.example/login)'});
  const copy = getFindingExplanation(result.findings.find(f => f.id === 'displayed-link'), result);
  assert.match(copy.found, /visible address names paypal\.com.*points to billing\.example/);
});
test('model explanation distinguishes spam resemblance from sender verification', () => {
  const result = analyzeMessage(SAMPLES.bank);
  const copy = getFindingExplanation(result.findings.find(f => f.id === 'sms-pattern'), result);
  assert.match(copy.limit, /advertising rather than a scam/);
  assert.match(copy.limit, /does not know who sent/);
});
test('score explanation accounts for related clues and the final 100-point cap', () => {
  const related = analyzeMessage({message:'PayPal Security: Send your password immediately. Your account will be suspended. Review https://paypal-security.example/login.',sender:'PayPal <security@paypal-security.example>'});
  const zero = related.findings.find(f => f.weight === 0);
  assert.ok(zero); assert.match(getFindingExplanation(zero, related).counted, /0 additional points/);
  const capped = analyzeMessage({message:'Send your password. Install AnyDesk. Pay with gift cards. Keep this confidential.'});
  const copy = getScoreExplanation(capped);
  assert.equal(capped.score, 100); assert.ok(copy.capped); assert.ok(copy.total > 100);
  assert.equal(copy.rows.reduce((sum, row) => sum + row.points, 0), copy.total);
  assert.match(copy.probability, /does not mean.*100%/);
});
test('explanations do not mutate a decision or its evidence', () => {
  const result = analyzeMessage(SAMPLES.account), before = structuredClone(result);
  result.findings.forEach(f => getFindingExplanation(f, result)); getScoreExplanation(result);
  assert.deepEqual(result, before);
});
test('guided practice separates a dangerous request from a code and an ordinary deadline', () => {
  assert.equal(analyzeMessage(SAMPLES.bank).level, 'high');
  assert.equal(analyzeMessage(SAMPLES.otp).level, 'low');
  assert.equal(analyzeMessage(SAMPLES.deadline).level, 'low');
  assert.equal(analyzeMessage(SAMPLES.otp).findings.some(f => f.id === 'credentials'), false);
});
test('all configured rules and structural checks have plain-language guidance', () => {
  const ids = new Set([...RULES.map(rule => rule.id), 'short-link', 'http-link', 'ip-link', 'userinfo-link', 'unicode-link', 'lookalike-link', 'brand-link', 'displayed-link', 'brand-sender', 'login-link', 'toll-payment', 'sms-pattern']);
  for (const id of ids) {
    assert.ok(EXPLANATIONS[id], id);
    for (const field of ['why','next','limit']) assert.ok(EXPLANATIONS[id][field].length > 20, `${id}.${field}`);
  }
});
