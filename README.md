# SignalCheck

An explainable, browser-only email and text checker. It combines contextual English scam rules, Spanish and Chinese request checks, optional on-device English translation, local link inspection, and two small learned classifiers—one for texts and one for emails—trained on public spam, smishing, and phishing corpora. No paid API or server-side message analysis.

## Run or publish

The complete website is in `dist/`; it uses HTML, CSS, and JavaScript modules with no build step or npm dependencies. The project includes 116 automated checks, detector research scripts, a model card, and a beginner learning guide.

- **Run:** `npm start`, then open `http://127.0.0.1:4173` (Python 3 required).
- **Test:** `npm test` (Node.js 18 or later).
- **Publish yourself:** follow [DEPLOYMENT.md](DEPLOYMENT.md). The included GitHub Pages workflow runs only when you explicitly start it. Uploading this repository does not publish a website.

## Run locally

Run `npm start` from this directory and open `http://127.0.0.1:4173`. The convenience command requires Python 3; any static HTTP server can serve `dist/`. Use HTTP rather than opening the HTML as a file, because the application uses JavaScript modules.

Run `npm test` with Node.js 18 or later. There are no npm packages to install. The learned models are already included, so normal use and tests do not need Python machine-learning libraries.

## Plain-language explanations and learning

Each finding now shows what was found, why it matters, what to do, and what remains unknown. Technical detection details and point contributions are expandable. Guided bank, sign-in-code, and deadline examples help first-time users explore the distinction between a dangerous request and weak contextual clues. The website also includes a beginner walkthrough of rules, the learned models, scoring, and evaluation. See [LEARNING_GUIDE.md](LEARNING_GUIDE.md) for a self-guided explanation and first testing session. These presentation changes do not alter detector decisions or the recorded benchmark.

## Languages and translation (version 3)

Choose English, Spanish, Simplified Chinese, or Traditional Chinese. Direct Spanish and Chinese request patterns run locally without a translator, API key, or model download. They cover starter scenarios including code sharing, financial details, gift-card payments, safe-account transfers, advance fees, remote access, and secrecy. They are hand-authored patterns, not multilingual model training or comprehensive language understanding. Interface copy and explanations remain in English.

For Spanish or Chinese, optionally expand **Add an English translation**. **Translate on this device** uses the browser-provided [Translator API](https://developer.chrome.com/docs/ai/translator-api), feature-detected at runtime. Desktop browser support and installed language packs vary; the browser may download packs on the first explicit translation click. Unsupported browsers and unavailable language pairs have a clear fallback: use direct checks or paste a translation yourself. Translations are editable and require review before analysis. Changing the original message or language clears the prior translation and cancels pending work.

English rules also inspect a supplied translation. Evidence is explicitly labeled original or translated and retains separate character offsets. The same signal counts once across both versions. Links are extracted only from the original message; a translation cannot invent or replace checked destinations. Both Chinese writing systems use the same rule set. A clearly mismatched writing system shows **Limited check** rather than a reassuring low result.

The trained English text and email models are **skipped for all non-English and translated messages**. There is no independent multilingual or translation-assisted accuracy benchmark. The authored tests cover behavior and regression scenarios, not measured real-world accuracy. Translation can lose negation, change requests, or alter context. Direct wording rules also miss unfamiliar phrasing.

## Learned text and email models (version 3.1)

- **Text model:** trained on the UCI SMS Spam Collection plus the Mendeley SMS Phishing dataset (ham, spam, and smishing). Used for English texts of up to 180 tokens.
- **Email model:** trained on the Apache SpamAssassin corpus, Enron-Spam, the Nazario phishing corpus, and a synthetic set of modern ordinary and phishing emails written by language models (LLMGen). Used for English emails of at least 20 tokens; only the first 400 tokens are scored. Shorter emails rely on the rules.
- Both are TF-IDF + logistic regression, exported as JavaScript and run in the browser. A match adds one explained signal ("Wording resembles spam or phishing emails" / "spam or smishing texts") with supporting word associations.
- The training pipeline downloads every corpus from [research/data-sources.json](research/data-sources.json) with SHA-256 checks, removes duplicates, groups templates before splitting, picks thresholds on validation only, and saves the prepared splits so a future optional server-side model can train and be compared on exactly the same data.

## What's improved in version 2

- Detects safe-account bank impersonation, check-and-refund requests, pay-to-unlock earnings, online task recruiting, gift card code requests, and forwarding a recently mentioned security code.
- Checks lookalike domains, internationalized names, deceptive URL user information, defanged links, and differing visible/destination hostnames in pasted HTML or Markdown links.
- Normalizes fullwidth and invisible characters while preserving exact evidence offsets in the original message.
- Treats casual brand mentions, ordinary gift card shopping, generic selection notices, safety advice, and authentication-code notifications more carefully.
- Caps related signal families to reduce repeated scoring of one tactic.
- Screens short text messages using an exported TF-IDF/logistic-regression model trained locally on a public SMS spam corpus. Email uses the contextual rules only.
- Includes authored regression scenarios, a frozen v1 baseline, a reproducible public-data evaluation, and a model card.

## Evidence, with its limits

Held-out public test splits, never used for training or threshold selection ("flagged" = signal score of 15 or more for the full checker):

| Test split | Component | Suspicious flagged | Ordinary flagged |
| --- | --- | ---: | ---: |
| Text: 147 spam/smishing, 774 ordinary | Frozen v1 rules | 7 (4.8%) | 0 (0%) |
| | Text model | 137 (93.2%) | 4 (0.5%) |
| | Full checker | 136 (92.5%) | 4 (0.5%) |
| Email: 3,437 spam/phishing, 3,001 ordinary | Frozen v1 rules | 615 (17.9%) | 88 (2.9%) |
| | Email model | 3,083 (89.7%) | 29 (1.0%) |
| | Full checker | 3,085 (89.8%) | 84 (2.8%) |

The email model also flagged 356 of 426 (83.6%) later-year 2025 phishing emails held out from all splits.

Before the synthetic modern emails were added, the email model wrongly flagged 496 of 1,269 (39%) of that set's ordinary emails, such as account-feature announcements and shipping updates, because its older ordinary mail rarely mentioned accounts or security. After adding the set, it flagged 2 of 181 (1.1%) held-out ordinary emails from it. That set is machine-written and formulaic, so its own scores (379 of 381 phishing flagged) overstate real-world performance.

These are **public-corpus labels, mostly from older data**, not a measured rate of modern scam detection. Spam includes advertising. Ordinary and phishing email come from different collections, so the model can partly learn source style; genuine account-security notices share vocabulary with phishing. The full checker's extra email false positives come mainly from rules on 2002-era SpamAssassin mailing-list mail (46 of 654 flagged). A plain `http://` link now adds points only when the message also asks you to act or share details. The 46 authored development scenarios and 14 authored emails were used during development; they are regression checks, not independent accuracy evidence. See [MODEL_CARD.md](MODEL_CARD.md), [detector evaluation](research/detector-evaluation.json), and [training evaluation](research/model-evaluation.json).

## Reproduce the research

The public raw corpus is ignored by Git and excluded from the website. To reproduce training and the held-out evaluation:

```sh
python3 -m pip install -r scripts/requirements-research.txt
npm run fetch-data   # downloads and verifies the public corpora into research/data/raw/
npm run train        # trains both models, writes dist/*-model.mjs and research/model-evaluation.json
npm run evaluate     # end-to-end checker evaluation and JavaScript/Python parity
```

The downloader verifies every file's SHA-256 against [research/data-sources.json](research/data-sources.json). Training uses only training data to learn the vocabulary and coefficients, and only validation data to choose regularization and the threshold. Normalized templates are grouped before splitting. The test split is not used to choose features, coefficients, or thresholds. JavaScript inference is checked against Python on every held-out message.

Training also writes the prepared splits to `research/data/splits/{text,email}-{train,validation,test}.jsonl` (plus `email-future.jsonl`). A future server-side model should train on these files and report on the same test split so it can be compared directly with the browser models.

`npm run evaluate` without the ignored corpora reports that the public tests are unavailable; it still runs the authored scenarios. Reproduction can vary slightly across platforms and library versions; the recorded versions are pinned in `scripts/requirements-research.txt`.

## Privacy and hosting

Local use does not require an account. When you publish this repository, visitor access is controlled by the hosting service you choose. Message text and sender details stay in browser memory until cleared or the page is closed. The checker makes no cloud API requests, visits no pasted links, uses no analytics, and does not persist messages in cookies, local storage, or a server. Model weights and app files are ordinary static assets loaded when the page opens. Optional translation calls the browser’s built-in API; browser-managed language-pack downloads are separate from message processing.

Copy report explicitly copies matched evidence to your clipboard. Static hosting receives ordinary page requests; the message-content privacy claim concerns the checker code.

## What the score means

Each distinct signal contributes a weight. Related families have caps: sensitive requests 45, money requests 45, pressure 24, identity 30, technical link/file cues 40, offers and learned text/email resemblance 28, remote access 40, and generic greetings 4. The total is capped at 100. Scores 0–14 show few signals, 15–34 show some concern, and 35–100 show high concern.

Weights and thresholds are design choices, not fraud probabilities. The learned models' raw decision margins are not fraud probabilities. A low score cannot establish that a message is safe. A high score cannot establish that it is fraudulent.

## Remaining limitations

The three supported languages still miss unfamiliar phrasing, unsupported languages, images, indirect social engineering, and many obfuscations. The learned models are trained on public corpora that are mostly older and do not represent all current scams or ordinary mail. They are used only for English messages: texts of up to 180 tokens, and emails of at least 20 tokens. They do not understand negation or intent, so safety advice that discusses scams can resemble scams.

The checker does not authenticate senders, examine full email headers, scan files, resolve redirects, query live reputation, or know whether you expected a message. Only explicitly pasted HTML/Markdown links can be inspected for hidden destinations; a destination lost during plain-text copying cannot be recovered. Brand/domain comparisons cover a small, incomplete list and can flag legitimate vendors or unrelated names. Negation and educational-context handling are approximate. Unicode normalization is not comprehensive confusable-character detection.

## Sources and attribution

Model data (details and licenses in [research/data-sources.json](research/data-sources.json) and [MODEL_CARD.md](MODEL_CARD.md)): Almeida & Hidalgo (2011), [SMS Spam Collection](https://doi.org/10.24432/C5CC84), CC BY 4.0; Mishra & Soni, [SMS Phishing Dataset](https://doi.org/10.17632/f45bkkt8pr.1), CC BY 4.0; [Apache SpamAssassin public corpus](https://spamassassin.apache.org/old/publiccorpus/); Metsis, Androutsopoulos & Paliouras, [Enron-Spam](https://github.com/MWiechmann/enron_spam_data); J. Nazario, [phishing corpus](https://monkey.org/~jose/phishing/), CC BY 4.0; [LLM-Generated Phishing Email Dataset](https://huggingface.co/datasets/Dizzzy0x00/LLMGen-Phishing-Email-Dataset) (English part), Apache-2.0. Model weights are derived from these datasets after normalization, duplicate removal, grouped splitting, TF-IDF feature extraction, and logistic-regression training. Raw corpus messages are not published with the Site. No endorsement is implied.

Scam rules draw on FTC guidance about [phishing](https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams), [task scams](https://consumer.ftc.gov/consumer-alerts/2024/11/task-scams-create-illusion-making-money), [safe-account impersonation](https://consumer.ftc.gov/consumer-alerts/2024/06/got-call-about-fraud-activity-your-bank-account-it-could-be-scammer), [toll texts](https://consumer.ftc.gov/consumer-alerts/2025/01/got-text-about-unpaid-tolls-its-probably-scam), and [fake checks](https://consumer.ftc.gov/consumer-alerts/2020/02/ftc-bottom-line-fake-checks-scams). The implementation and weights are original design choices, not FTC-endorsed detection rules.

## Explain the project

Describe the project as a hybrid of explainable scam rules and on-device statistical text and email models. Explain the difference between training, validation, and test sets, why related signals have caps, and the sensitivity/false-alarm tradeoff. For a portfolio, document what you personally designed, investigated, tested, or improved, and credit AI assistance according to the applicable application requirements.

## Source map

- `dist/analyzer.mjs` — combines evidence and scores signal families.
- `dist/rules.mjs` — English contextual request and scenario patterns.
- `dist/languages.mjs` — Spanish/Chinese request patterns, language metadata, and approximate negation.
- `dist/translator.mjs` — optional browser-provided on-device English translation.
- `tests/languages.test.mjs` — multilingual evidence, scoring, original-link preservation, fallback, and cancellation checks.
- `dist/text-utils.mjs` — normalization, evidence mapping, and local negation.
- `dist/link-checks.mjs` — local hostname and pasted-link inspection.
- `dist/message-classifier.mjs`, `dist/text-model.mjs`, `dist/email-model.mjs` — local learned inference and weights.
- `dist/app.mjs`, `dist/index.html`, `dist/styles.css`, `dist/layout.css` — interface.
- `tests/` — functional and authored scenario checks.
- `scripts/` — research data download (`fetch_training_data.py`), corpus parsing (`corpora.py`), training (`train_models.py`), and evaluation.
- `research/data-sources.json` — dataset provenance, licenses, and checksums.
- `research/baseline-v1.mjs` — frozen original detector for comparison.
- `.github/workflows/publish.yml` — manually started GitHub Pages publishing workflow.
- `DEPLOYMENT.md` — independent publishing instructions.

Release note: browser asset query versions are advanced for each interface release so cached modules do not hide updated explanations. The detector and interface version are 3.1.0, which replaces the SMS-only model with separate text and email models.
