import { analyzeMessage, highlightRanges, MAX_LENGTH } from './analyzer.mjs?v=3.0.0';
import { getFindingExplanation, getScoreExplanation } from './explanations.mjs?v=3.0.0';
import { languageName } from './languages.mjs?v=3.0.0';
import { hasTranslator, translateToEnglish } from './translator.mjs?v=3.0.0';
import { SAMPLES } from './samples.mjs?v=3.0.0';

const $ = selector => document.querySelector(selector);
const message = $('#message');
const sender = $('#sender');
const form = $('#check-form');
const content = $('#result-content');
const emptyMarkup = content.innerHTML;
let latestResult = null;
let isSample = false;
const language = $('#message-language');
const translation = $('#english-translation');
let translationOrigin = 'manual';
let translationController = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function icon(name) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('class', 'icon');
  node.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  node.append(use);
  return node;
}
function announce(text) { $('#announcement').textContent = text; }
function currentType() { return form.elements['message-type'].value; }
function updateType() { sender.placeholder = currentType() === 'email' ? 'e.g. support@example.com' : 'e.g. a name or phone number'; }
function clearResults() {
  if (latestResult) { content.innerHTML = emptyMarkup; latestResult = null; $('#result-status').textContent = 'CHECK YOUR UPDATED MESSAGE'; }
}
function updateInputs() {
  $('#character-count').textContent = `${message.value.length.toLocaleString()} / 20,000`;
  $('#message-error').hidden = true;
  message.removeAttribute('aria-invalid');
  isSample = false;
  clearResults();
}
function resetTranslation() {
  translationController?.abort(); translationController = null;
  translation.value = ''; translationOrigin = 'manual';
  $('#translate-button').disabled = !hasTranslator();
  $('#translate-button').textContent = 'Translate on this device';
  $('#translation-status').textContent = hasTranslator() ? 'Translation stays on your device. The browser may download language packs when you click Translate.' : 'On-device translation is unavailable here. Direct checks still work; you can also paste an English translation below.';
}
function updateLanguage() {
  $('#translation-section').hidden = language.value === 'en';
  message.lang = language.value;
  resetTranslation(); updateInputs();
}
language.addEventListener('change', updateLanguage);
message.addEventListener('input', () => { resetTranslation(); updateInputs(); });
translation.addEventListener('input', () => {
  translationController?.abort(); translationController = null;
  $('#translate-button').disabled = !hasTranslator();
  $('#translate-button').textContent = 'Translate on this device';
  $('#translation-status').textContent = 'Using your edited English translation. Review it before checking.';
  translationOrigin = 'manual'; updateInputs();
});
$('#translate-button').addEventListener('click', async () => {
  translationController?.abort();
  const controller = new AbortController(); translationController = controller;
  const original = message.value, originalLanguage = language.value, wasSample = isSample;
  const button = $('#translate-button'), status = $('#translation-status');
  button.disabled = true; button.textContent = 'Translating…';
  status.textContent = 'Preparing on-device translation. A language pack may need to download.';
  try {
    const english = await translateToEnglish(original, originalLanguage, { signal: controller.signal, onProgress(progress) {
      if (translationController === controller) status.textContent = `Downloading language pack: ${progress}%. Your message stays on-device.`;
    } });
    if (translationController !== controller || message.value !== original || language.value !== originalLanguage) return;
    translation.value = english; translationOrigin = 'on-device'; updateInputs(); isSample = wasSample;
    status.textContent = 'Translation ready. Review the English wording, then check this message. Translation can change details.';
    announce('English translation ready for review.');
  } catch (error) {
    if (translationController === controller && !controller.signal.aborted) status.textContent = error.message || 'Translation failed. Try direct checks or paste your own translation.';
  } finally {
    if (translationController === controller) { translationController = null; button.disabled = !hasTranslator(); button.textContent = 'Translate on this device'; }
  }
});
updateLanguage();
sender.addEventListener('input', updateInputs);
form.querySelectorAll('[name="message-type"]').forEach(radio => radio.addEventListener('change', () => { updateType(); updateInputs(); }));
$('#clear-button').addEventListener('click', () => {
  message.value = ''; sender.value = ''; resetTranslation(); updateInputs(); content.innerHTML = emptyMarkup; $('#result-status').textContent = 'READY WHEN YOU ARE'; message.focus(); announce('Message and sender cleared.');
});
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
  const sample = SAMPLES[button.dataset.example];
  message.value = sample.message; sender.value = sample.sender; language.value = sample.language || 'en'; updateLanguage();
  form.querySelector(`[value="${sample.type}"]`).checked = true;
  updateType(); updateInputs(); isSample = true;
  if (button.dataset.autoCheck === 'true') {
    form.requestSubmit();
    if (!matchMedia('(max-width: 760px)').matches) $('.result-panel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  } else {
    announce('Example loaded. Press Check this message to analyze it.');
    message.focus();
  }
}));

function render(result) {
  const partial = result.coverage === 'limited';
  const analysis = el('div', `analysis ${result.level}${partial ? ' limited' : ''}`);
  const summary = el('div', 'result-summary');
  const summaryText = el('div');
  const badge = el('div', 'risk-label'); badge.append(icon(result.level === 'low' ? 'scan' : 'alert'), document.createTextNode(result.label.toUpperCase()));
  const heading = el('h2', 'result-heading', partial && result.level !== 'high' ? 'Check the selected language.' : result.level === 'high' ? 'Pause before you act.' : result.level === 'medium' ? 'Worth a second look.' : 'Few warning signs found.');
  heading.tabIndex = -1;
  const descriptions = { high: 'Several or stronger scam indicators matched. Verify this message independently before taking action.', medium: 'Some patterns deserve a closer look. The context matters, so check the request independently.', low: 'Few common patterns matched. Scams can still look ordinary; this does not establish that a message is safe.' };
  summaryText.append(badge, heading, el('p', 'summary-copy', partial ? 'Only partial checks ran. Choose the message’s language or provide an English translation before interpreting the result.' : descriptions[result.level]));
  const score = el('div', 'score'); score.append(document.createTextNode(partial ? '—' : String(result.score)), el('small', '', partial ? `${result.score} points found` : '/100'), el('span', '', partial ? 'PARTIAL CHECK' : 'SIGNAL POINTS'));
  summary.append(summaryText, score); analysis.append(summary);
  const meter = el('div', 'meter'); meter.setAttribute('aria-hidden', 'true');
  ['low', 'medium', 'high'].forEach(level => meter.append(el('span', !partial && level === result.level ? 'chosen' : '')));
  analysis.append(meter, el('div', 'meter-caption', partial ? 'Partial coverage · review the language choice' : 'Warning points · not a scam percentage'));
  const scoreCopy = getScoreExplanation(result);
  const scoreGuide = el('details', 'score-guide');
  scoreGuide.append(el('summary', '', partial ? 'What did the partial check find?' : `What does ${result.score}/100 mean?`), el('p', '', scoreCopy.meaning), el('p', '', scoreCopy.probability));
  if (scoreCopy.rows.length) {
    const table = el('table', 'score-table'); table.append(el('caption', 'sr-only', 'Signals contributing to the score'));
    const head = el('thead'), header = el('tr');
    for (const title of ['Matched signal', 'Points']) { const cell = el('th', '', title); cell.scope = 'col'; header.append(cell); }
    head.append(header); table.append(head); const body = el('tbody');
    for (const row of scoreCopy.rows) {
      const line = el('tr'), title = el('td', '', row.title), points = el('td', '', String(row.points));
      if (row.related) title.append(el('span', 'related-note', 'Related clues share a limit'));
      line.append(title, points); body.append(line);
    }
    table.append(body); scoreGuide.append(table);
    scoreGuide.append(el('p', '', scoreCopy.capped ? `The counted points add to ${scoreCopy.total}; the displayed total is capped at 100.` : `Counted points add to ${scoreCopy.total}. Related clues share limits so one tactic is not repeatedly counted.`));
  } else scoreGuide.append(el('p', '', 'No signal points were added. Checks can still miss scams.'));
  scoreGuide.append(el('p', '', '0–14: few signals. 15–34: some concern. 35–100: high concern. These thresholds are design choices.'));
  analysis.append(scoreGuide);
  analysis.append(el('p', `language-notice${partial ? ' limited' : ''}`, result.languageNotice));
  if (result.translation) {
    const review = el('details', 'translation-review');
    review.append(el('summary', '', 'Compare original and English translation'), el('p', '', `${languageName(result.language)} original`));
    const original = el('pre', '', result.message); original.lang = result.language;
    const english = el('pre', '', result.translation); english.lang = 'en';
    review.append(original, el('p', '', `English translation · ${result.translationOrigin === 'on-device' ? 'generated on this device' : 'provided by you'}`), english, el('p', '', 'Translation can miss or alter meaning. Original links and sender details were checked separately; no translated addresses were used as destinations.'));
    analysis.append(review);
  }
  const method = result.language !== 'en' ? `${result.translation ? 'Native and English translation request rules' : 'Native request rules'}, plus original-link checks. The English SMS model was skipped.` : result.coverage === 'limited' ? 'Partial wording and link checks. The English SMS model was skipped because the writing system did not match.' : result.smsModel ? result.smsModel.applicable ? 'Checked with scam rules and the on-device SMS model.' : 'Scam rules checked. This text is outside the SMS model’s length or vocabulary limits.' : 'Checked with scam and link rules. The SMS model is not used for email.';
  analysis.append(el('p', 'analysis-method', method));
  const findingHeader = el('div', 'findings-title', result.findings.length ? `${result.findings.length} ${result.findings.length === 1 ? 'signal' : 'signals'} to review` : 'No matching signals');
  const copy = el('button', 'copy-button'); copy.type = 'button'; copy.append(icon('copy'), document.createTextNode('Copy report')); copy.addEventListener('click', () => copyReport(result, copy)); findingHeader.append(copy); analysis.append(findingHeader);
  for (const [index, finding] of result.findings.entries()) {
    const details = el('details', `finding ${finding.strength}`);
    if (index === 0) details.open = true;
    const summary = el('summary'); summary.append(el('span', 'signal-dot'), document.createTextNode(finding.title));
    details.append(summary);
    const explanation = getFindingExplanation(finding, result);
    details.append(el('h3', 'explanation-label', 'What we found'), el('p', '', explanation.found));
    if (finding.id !== 'sms-pattern') for (const evidence of finding.evidence) {
      const quote = el('blockquote');
      if (result.language !== 'en' || evidence.source === 'translation') quote.append(el('span', 'evidence-source', evidence.source === 'translation' ? 'English translation' : evidence.source === 'sender' ? 'Original sender' : 'Original message'));
      if (evidence.source === 'sender') quote.append(document.createTextNode('Sender: '));
      const mark = el('mark', '', evidence.text); mark.lang = evidence.source === 'translation' ? 'en' : result.language; quote.append(mark); details.append(quote);
    }
    details.append(el('h3', 'explanation-label', 'Why it matters'), el('p', '', explanation.why), el('h3', 'explanation-label', 'What you can do'), el('p', '', explanation.next), el('p', 'explanation-limit', `Keep in mind: ${explanation.limit}`));
    const technical = el('details', 'finding-technical'); technical.append(el('summary', '', 'How this was detected'));
    technical.append(el('p', '', `Method: ${explanation.method}. Category: ${explanation.family}.`), el('p', '', explanation.counted), el('p', '', explanation.technical));
    if (finding.id === 'sms-pattern' && result.smsModel) technical.append(el('p', '', `The model’s decision value is ${result.smsModel.margin.toFixed(4)}, compared with its ${result.smsModel.threshold.toFixed(4)} threshold. These model numbers are not percentages. The threshold was selected on validation messages, separate from training and test messages.`));
    if (finding.id === 'sms-pattern' && finding.evidence.length) technical.append(el('p', '', `Supporting word associations: ${finding.evidence.map(e => e.text).join(', ')}. These words are not suspicious on their own.`));
    details.append(technical); analysis.append(details);
  }
  if (!result.findings.length) analysis.append(el('p', 'no-findings', 'No configured warning signals matched. Sender authenticity, link reputation, and attachments have not been checked.'));
  if (result.links.length || result.sender) {
    const details = el('details', 'link-review'); details.append(el('summary', '', 'Links & sender details'));
    const list = el('ul');
    if (result.sender) list.append(el('li', '', `Sender: ${result.senderDomain || result.sender} — not authenticated`));
    const hosts = [...new Set(result.links.map(link => link.host))];
    hosts.forEach(host => list.append(el('li', '', `${host} — not visited or verified${result.links.some(link => link.host === host && link.defanged) ? ' (defanged in pasted text)' : ''}`)));
    details.append(list); analysis.append(details);
  }
  if (result.findings.some(f => f.evidence.some(e => e.source === 'message'))) {
    const details = el('details', 'highlight-section'); details.append(el('summary', '', 'View highlighted message'));
    const highlighted = el('div', 'highlight-message'); highlighted.lang = result.language; let position = 0;
    for (const range of highlightRanges(result)) {
      highlighted.append(document.createTextNode(result.message.slice(position, range.start)), el('mark', '', result.message.slice(range.start, range.end))); position = range.end;
    }
    highlighted.append(document.createTextNode(result.message.slice(position))); details.append(highlighted); analysis.append(details);
  }
  const actions = el('div', 'next-steps'); actions.append(el('h3', '', 'What to do next')); const list = el('ol');
  result.actions.forEach(action => list.append(el('li', '', action))); actions.append(list); analysis.append(actions);
  if (isSample) analysis.append(el('p', 'sample-notice', 'Synthetic demo message. Any example links use reserved .example domains.'));
  content.replaceChildren(analysis); $('#result-status').textContent = 'CHECK COMPLETE';
  heading.focus({ preventScroll: true });
  if (matchMedia('(max-width: 760px)').matches) heading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  announce(`Check complete. ${result.label}. ${result.score} signal points out of 100. ${result.findings.length} ${result.findings.length === 1 ? 'signal' : 'signals'} to review.`);
}
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (message.value.length > MAX_LENGTH) throw new Error('Please keep the message under 20,000 characters.');
    if (translationController) throw new Error('Wait for the translation to finish, or edit the original message to cancel it.');
    latestResult = analyzeMessage({ message: message.value, sender: sender.value, type: currentType(), language: language.value, translation: translation.value, translationOrigin });
    render(latestResult);
  } catch (error) {
    $('#message-error').textContent = error.message; $('#message-error').hidden = false; message.setAttribute('aria-invalid', 'true'); message.focus();
  }
});
async function copyReport(result, button) {
  const report = ['SignalCheck — message analysis', `Detector version: ${result.version}`, `Message type: ${result.type}`, `Message language: ${languageName(result.language)}`, `Coverage: ${result.coverage}. ${result.languageNotice}`, `Translation: ${result.translation ? result.translationOrigin + '; English rules used; English SMS model skipped' : 'not used'}`, `Concern: ${result.label}`, `Signal points: ${result.score}/100. This is not a percentage chance of a scam.`, 'Related signals share a limit; the displayed total is capped at 100.', result.smsModel ? `Local SMS model: ${result.smsModel.applicable ? 'screened' : 'outside length or vocabulary limits'}` : 'SMS model not used for this message.', '', ...result.findings.map(f => {
    const copy = getFindingExplanation(f, result);
    return `${f.title}\nWhat we found: ${copy.found}\n${f.evidence.map(e => `${e.source === 'translation' ? 'English translation evidence' : f.id === 'sms-pattern' ? 'Supporting word association' : 'Original matched text'}: ${e.text}`).join('\n')}\nWhy it matters: ${copy.why}\nWhat you can do: ${copy.next}\nKeep in mind: ${copy.limit}\nTechnical detail: ${copy.counted} ${copy.technical}`;
  }), '', 'Next steps:', ...result.actions.map((action, i) => `${i + 1}. ${action}`), '', 'Limitations: English, Spanish, and Chinese request rules; an English-only older-data SMS spam model. Multilingual and translated messages have no independent accuracy benchmark. Translation can alter meaning. Spam labels do not establish phishing detection accuracy. No sender authentication, attachment scan, or live link reputation check. A low score does not mean safe. False positives and missed scams are possible.'].join('\n');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(report);
    button.replaceChildren(icon('check'), document.createTextNode('Copied'));
    announce('Analysis report copied to your clipboard.');
  } catch {
    $('#report-text').value = report; $('#copy-dialog').showModal(); $('#report-text').focus(); $('#report-text').select();
  }
}
$('#close-dialog').addEventListener('click', () => $('#copy-dialog').close());
// Message content is never transmitted, stored, logged, or interpolated as HTML.
