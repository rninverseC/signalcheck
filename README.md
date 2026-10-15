# SignalCheck

An explainable, browser-only email and text checker. Version 3 adds Spanish and Chinese request checks and optional on-device English translation to contextual English scam rules, local link inspection, and a small English SMS spam classifier. No paid API or server-side message analysis.

## Run or publish

The complete website is in `dist/`; it uses HTML, CSS, and JavaScript modules with no build step or npm dependencies. The project includes 113 automated checks, detector research scripts, a model card, and a beginner learning guide.

- **Run:** `npm start`, then open `http://127.0.0.1:4173` (Python 3 required).
- **Test:** `npm test` (Node.js 18 or later).
- **Publish yourself:** follow [DEPLOYMENT.md](DEPLOYMENT.md). The included GitHub Pages workflow runs only when you explicitly start it. Uploading this repository does not publish a website.

## Run locally

Run `npm start` from this directory and open `http://127.0.0.1:4173`. The convenience command requires Python 3; any static HTTP server can serve `dist/`. Use HTTP rather than opening the HTML as a file, because the application uses JavaScript modules.

Run `npm test` with Node.js 18 or later. There are no npm packages to install. The learned model is already included, so normal use and tests do not need Python machine-learning libraries.

## Plain-language explanations and learning

Each finding now shows what was found, why it matters, what to do, and what remains unknown. Technical detection details and point contributions are expandable. Guided bank, sign-in-code, and deadline examples help first-time users explore the distinction between a dangerous request and weak contextual clues. The website also includes a beginner walkthrough of rules, the SMS model, scoring, and evaluation. See [LEARNING_GUIDE.md](LEARNING_GUIDE.md) for a self-guided explanation and first testing session. These presentation changes do not alter detector decisions or the recorded benchmark.

## Languages and translation (version 3)

Choose English, Spanish, Simplified Chinese, or Traditional Chinese. Direct Spanish and Chinese request patterns run locally without a translator, API key, or model download. They cover starter scenarios including code sharing, financial details, gift-card payments, safe-account transfers, advance fees, remote access, and secrecy. They are hand-authored patterns, not multilingual model training or comprehensive language understanding. Interface copy and explanations remain in English.

For Spanish or Chinese, optionally expand **Add an English translation**. **Translate on this device** uses the browser-provided [Translator API](https://developer.chrome.com/docs/ai/translator-api), feature-detected at runtime. Desktop browser support and installed language packs vary; the browser may download packs on the first explicit translation click. Unsupported browsers and unavailable language pairs have a clear fallback: use direct checks or paste a translation yourself. Translations are editable and require review before analysis. Changing the original message or language clears the prior translation and cancels pending work.

English rules also inspect a supplied translation. Evidence is explicitly labeled original or translated and retains separate character offsets. The same signal counts once across both versions. Links are extracted only from the original message; a translation cannot invent or replace checked destinations. Both Chinese writing systems use the same rule set. A clearly mismatched writing system shows **Limited check** rather than a reassuring low result.

The trained English SMS model is **skipped for all non-English and translated messages**. There is no independent multilingual or translation-assisted accuracy benchmark. The new authored tests cover behavior and regression scenarios, not measured real-world accuracy. The English held-out evaluation was rerun and has unchanged aggregate results (94/100 spam, 8/700 ordinary). Translation can lose negation, change requests, or alter context. Direct wording rules also miss unfamiliar phrasing.

## What's improved in version 2

- Detects safe-account bank impersonation, check-and-refund requests, pay-to-unlock earnings, online task recruiting, gift card code requests, and forwarding a recently mentioned security code.
- Checks lookalike domains, internationalized names, deceptive URL user information, defanged links, and differing visible/destination hostnames in pasted HTML or Markdown links.
- Normalizes fullwidth and invisible characters while preserving exact evidence offsets in the original message.
- Treats casual brand mentions, ordinary gift card shopping, generic selection notices, safety advice, and authentication-code notifications more carefully.
- Caps related signal families to reduce repeated scoring of one tactic.
- Screens short text messages using an exported TF-IDF/logistic-regression model trained locally on a public SMS spam corpus. Email uses the contextual rules only.
- Includes authored regression scenarios, a frozen v1 baseline, a reproducible public-data evaluation, and a model card.

## Evidence, with its limits

On the fixed, held-out UCI SMS test set of 800 messages, v2 flagged **94 of 100 spam messages** and **8 of 700 ordinary messages** at a signal score of 15 or higher. Version 1 flagged 8 spam messages and none of the ordinary messages on the same set. Increasing sensitivity introduced false alarms.

Those are historical **SMS spam labels**, not a measured rate of phishing detection, email accuracy, or modern scam detection. The 46 authored development scenarios were used to improve the rules; they are regression checks, not independent accuracy evidence. See [MODEL_CARD.md](MODEL_CARD.md), [detector evaluation](research/detector-evaluation.json), and [training evaluation](research/sms-model-evaluation.json).

## Reproduce the research

The public raw corpus is ignored by Git and excluded from the website. To reproduce training and the held-out evaluation:

```sh
python3 -m pip install -r scripts/requirements-research.txt
python3 scripts/fetch_sms_data.py
npm run train:sms
npm run evaluate
```

The downloader verifies the corpus SHA-256 against the recorded evaluation. Training uses only training data to learn the vocabulary and coefficients, and only validation data to select its threshold. Normalized templates are grouped before splitting. The test split is not used to choose features, coefficients, or thresholds. JavaScript inference is checked against Python on the held-out messages.

`npm run evaluate` without the ignored corpus reports that the public SMS test is unavailable; it can still run the authored scenarios. Reproduction can vary slightly across platforms and library versions; the recorded versions are pinned in `scripts/requirements-research.txt`.

## Privacy and hosting

Local use does not require an account. When you publish this repository, visitor access is controlled by the hosting service you choose. Message text and sender details stay in browser memory until cleared or the page is closed. The checker makes no cloud API requests, visits no pasted links, uses no analytics, and does not persist messages in cookies, local storage, or a server. Model weights and app files are ordinary static assets loaded when the page opens. Optional translation calls the browser’s built-in API; browser-managed language-pack downloads are separate from message processing.

Copy report explicitly copies matched evidence to your clipboard. Static hosting receives ordinary page requests; the message-content privacy claim concerns the checker code.

## What the score means

Each distinct signal contributes a weight. Related families have caps: sensitive requests 45, money requests 45, pressure 24, identity 30, technical link/file cues 40, offers and learned SMS resemblance 28, remote access 40, and generic greetings 4. The total is capped at 100. Scores 0–14 show few signals, 15–34 show some concern, and 35–100 show high concern.

Weights and thresholds are design choices, not fraud probabilities. The SMS model's raw decision margin is not shown as a fraud probability. A low score cannot establish that a message is safe. A high score cannot establish that it is fraudulent.

## Remaining limitations

The three supported languages still miss unfamiliar phrasing, unsupported languages, images, indirect social engineering, and many obfuscations. The SMS model was trained on a small, older corpus and is not evaluated on email. It is only used for English texts and is not used for texts over 180 tokens or with fewer than three known vocabulary tokens.

The checker does not authenticate senders, examine full email headers, scan files, resolve redirects, query live reputation, or know whether you expected a message. Only explicitly pasted HTML/Markdown links can be inspected for hidden destinations; a destination lost during plain-text copying cannot be recovered. Brand/domain comparisons cover a small, incomplete list and can flag legitimate vendors or unrelated names. Negation and educational-context handling are approximate. Unicode normalization is not comprehensive confusable-character detection.

## Sources and attribution

Model data: Almeida, T. & Hidalgo, J. (2011), [SMS Spam Collection](https://doi.org/10.24432/C5CC84), UCI Machine Learning Repository, adapted under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Model weights are derived from this dataset after normalization, duplicate removal, grouped splitting, TF-IDF feature extraction, and logistic-regression training. Raw corpus messages are not published with the Site. No endorsement is implied.

Scam rules draw on FTC guidance about [phishing](https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams), [task scams](https://consumer.ftc.gov/consumer-alerts/2024/11/task-scams-create-illusion-making-money), [safe-account impersonation](https://consumer.ftc.gov/consumer-alerts/2024/06/got-call-about-fraud-activity-your-bank-account-it-could-be-scammer), [toll texts](https://consumer.ftc.gov/consumer-alerts/2025/01/got-text-about-unpaid-tolls-its-probably-scam), and [fake checks](https://consumer.ftc.gov/consumer-alerts/2020/02/ftc-bottom-line-fake-checks-scams). The implementation and weights are original design choices, not FTC-endorsed detection rules.

## Explain the project

Describe the project as a hybrid of explainable scam rules and an on-device statistical SMS spam model. Explain the difference between training, validation, and test sets, why related signals have caps, and the sensitivity/false-alarm tradeoff. For a portfolio, document what you personally designed, investigated, tested, or improved, and credit AI assistance according to the applicable application requirements.

## Source map

- `dist/analyzer.mjs` — combines evidence and scores signal families.
- `dist/rules.mjs` — English contextual request and scenario patterns.
- `dist/languages.mjs` — Spanish/Chinese request patterns, language metadata, and approximate negation.
- `dist/translator.mjs` — optional browser-provided on-device English translation.
- `tests/languages.test.mjs` — multilingual evidence, scoring, original-link preservation, fallback, and cancellation checks.
- `dist/text-utils.mjs` — normalization, evidence mapping, and local negation.
- `dist/link-checks.mjs` — local hostname and pasted-link inspection.
- `dist/sms-classifier.mjs`, `dist/sms-model.mjs` — local learned inference and weights.
- `dist/app.mjs`, `dist/index.html`, `dist/styles.css`, `dist/layout.css` — interface.
- `tests/` — functional and authored scenario checks.
- `scripts/` — research data download, training, and evaluation.
- `research/baseline-v1.mjs` — frozen original detector for comparison.
- `.github/workflows/publish.yml` — manually started GitHub Pages publishing workflow.
- `DEPLOYMENT.md` — independent publishing instructions.

Release note: browser asset query versions are advanced for each interface release so cached modules do not hide updated explanations. The detector and interface version are 3.0.0. The English SMS model weights are unchanged.
