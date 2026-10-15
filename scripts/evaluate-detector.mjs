import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { analyzeMessage } from '../dist/analyzer.mjs';
import { classifySms } from '../dist/sms-classifier.mjs';
import { analyzeMessage as baseline } from '../research/baseline-v1.mjs';
import { scenarios } from '../tests/scenarios.mjs';

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
    improved_v2: metrics(scenarios, row => analyzeMessage(row).score >= 15),
  },
};
try {
  const rows = JSON.parse(await readFile(new URL('research/data/sms-test.json', root), 'utf8'));
  let maxMarginError = 0;
  for (const row of rows) maxMarginError = Math.max(maxMarginError, Math.abs(classifySms(row.message).margin - row.expected_margin));
  assert.ok(maxMarginError < 1e-6, `Python/JS inference mismatch: ${maxMarginError}`);
  report.public_sms_test = {
    warning: 'Older SMS ham/spam labels, not phishing or email ground truth. No further tuning on these test results.',
    inference_parity_max_error: maxMarginError,
    baseline_v1: metrics(rows, row => baseline({ message: row.message, type: 'text' }).score >= 15),
    improved_v2: metrics(rows, row => analyzeMessage({ message: row.message, type: 'text' }).score >= 15),
    runtime_model_only: metrics(rows, row => classifySms(row.message).matched),
  };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  report.public_sms_test = { unavailable: true, reason: 'Train the model with the ignored local corpus before reproducing the public SMS test.' };
}
await writeFile(new URL('research/detector-evaluation.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
