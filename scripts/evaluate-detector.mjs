import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { analyzeMessage } from '../dist/analyzer.mjs';
import { classifyMessage } from '../dist/message-classifier.mjs';
import { analyzeMessage as baseline } from '../research/baseline-v1.mjs';
import { scenarios } from '../tests/scenarios.mjs';
import { emailScenarios } from '../tests/email-scenarios.mjs';

const root = new URL('../', import.meta.url);
function metrics(rows, predict) {
  const counts = { true_positive: 0, false_positive: 0, true_negative: 0, false_negative: 0 };
  for (const row of rows) {
    const positive = predict(row);
    const actual = row.label === 1 || row.label === 'suspicious';
    counts[actual ? positive ? 'true_positive' : 'false_negative' : positive ? 'false_positive' : 'true_negative']++;
  }
  const { true_positive: tp, false_positive: fp, true_negative: tn, false_negative: fn } = counts;
  const rate = (n, d) => d ? Math.round(n / d * 100000) / 100000 : 0;
  return { ...counts, messages: rows.length, precision: rate(tp, tp + fp), recall: rate(tp, tp + fn), false_positive_rate: rate(fp, fp + tn), accuracy: rate(tp + tn, rows.length) };
}
const report = {
  signal_threshold: 15,
  development_scenarios: {
    warning: 'Authored cases used during development. Not independent accuracy evidence.',
    count: scenarios.length,
    baseline_v1: metrics(scenarios, row => baseline(row).score >= 15),
    current: metrics(scenarios, row => analyzeMessage(row).score >= 15),
  },
  authored_email_scenarios: {
    warning: 'Authored modern emails used during development. Not independent accuracy evidence.',
    count: emailScenarios.length,
    current: metrics(emailScenarios, row => analyzeMessage({ ...row, type: 'email' }).score >= 15),
    email_model_only: metrics(emailScenarios, row => classifyMessage(row.message, 'email').matched),
  },
};
const warnings = {
  text: 'Public SMS ham, spam, and smishing labels (UCI 2011, Mendeley). Not modern-scam ground truth. No further tuning on these test results.',
  email: 'Public email ham, spam, and phishing labels (SpamAssassin, Enron-Spam, Nazario). Sources differ in era and collection method. No further tuning on these test results.',
};
for (const kind of ['text', 'email']) {
  try {
    const rows = JSON.parse(await readFile(new URL(`research/data/${kind}-test.json`, root), 'utf8'));
    let maxMarginError = 0;
    for (const row of rows) maxMarginError = Math.max(maxMarginError, Math.abs(classifyMessage(row.message, kind).margin - row.expected_margin));
    assert.ok(maxMarginError < 1e-6, `Python/JS ${kind} inference mismatch: ${maxMarginError}`);
    const analyzed = rows.map(row => ({ ...row, result: analyzeMessage({ message: row.message.slice(0, 20000), type: kind }) }));
    report[`public_${kind}_test`] = {
      warning: warnings[kind],
      inference_parity_max_error: maxMarginError,
      baseline_v1: metrics(rows, row => baseline({ message: row.message.slice(0, 20000), type: kind }).score >= 15),
      current: metrics(analyzed, row => row.result.score >= 15),
      runtime_model_only: metrics(rows, row => classifyMessage(row.message, kind).matched),
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    report[`public_${kind}_test`] = { unavailable: true, reason: 'Run npm run fetch-data and npm run train to reproduce the public test.' };
  }
}
await writeFile(new URL('research/detector-evaluation.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
