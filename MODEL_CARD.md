# SignalCheck detector v3.1: evidence and limits

## Intended use

An educational second look at pasted emails and texts. The checker presents explainable indicators and independent-verification steps. It is not an email filter, authentication service, malware scanner, or fraud adjudication system.

The hybrid contains manually authored scam/link rules for both message types, plus two learned models that run in the browser: a **text model** for eligible English SMS-style messages and an **email model** for eligible English emails. The final 0–100 score is an indicator sum with family caps, not a calibrated probability.

## Multilingual extension (v3)

Spanish and Chinese (Simplified/Traditional) use starter hand-authored request patterns, with mapped original evidence and approximate clause-local negation. English patterns still detect English passages and file extensions in mixed messages. Optional browser-provided on-device translation adds an English rule pass with separately labeled translation evidence. Manual translations are accepted and editable. Original links and sender details remain the source of structural checks; translated destinations are ignored. Duplicate signals share the existing scoring caps.

Both learned models are disabled for every non-English message and supplied translation because its training and evaluation did not measure that distribution. No multilingual corpus, translation benchmark, or independent native-language accuracy study has been collected. The authored multilingual scenarios are development/regression tests, not an accuracy claim. Translation and native rules can misread negation, quotation, dialect, or unfamiliar phrasing. Controls and explanations remain in English. Source-script mismatch has a partial-coverage label but is not a full language identification system.

Optional automatic translation uses the [browser Translator API](https://developer.chrome.com/docs/ai/translator-api). Browser support, language-pair availability, downloads, and output quality vary. It makes no cloud translation request from the Site. Manual/direct checking remains available if translation fails.

The benchmarks below describe the English path only.

## Learned text and email models (v3.1)

Both models are TF-IDF over unigrams and adjacent bigrams followed by logistic regression, trained locally with scikit-learn and exported as plain JavaScript constants. The browser evaluates them; there is no remote model service or API key.

| Model | Export | Features | Eligible messages |
| --- | --- | ---: | --- |
| Text (`text-tfidf-logistic-2`) | `dist/text-model.mjs`, ~156 KB | 4,000 | English texts of up to 180 tokens with at least 3 known tokens |
| Email (`email-tfidf-logistic-1`) | `dist/email-model.mjs`, ~236 KB | 6,000 | English emails of at least 20 tokens with at least 5 known tokens; only the first 400 tokens are scored |

Short emails are left to the rules: on one- or two-sentence snippets, the bag-of-words email model mostly reacts to topic words, and it flagged safety advice such as "never move money to a safe account" during development.

### Training data

Sources, licenses, download URLs, and SHA-256 hashes are recorded in [research/data-sources.json](research/data-sources.json). Raw messages are ignored by Git and never deployed.

| Model | Source | Rows used | Labels |
| --- | --- | ---: | --- |
| Text | [UCI SMS Spam Collection](https://doi.org/10.24432/C5CC84) (Almeida & Hidalgo, 2011), CC BY 4.0 | 5,574 | ham / spam |
| Text | [SMS Phishing Dataset](https://doi.org/10.17632/f45bkkt8pr.1) (Mishra & Soni, Mendeley Data), CC BY 4.0 | 5,971 | ham / spam / smishing |
| Email | [Apache SpamAssassin public corpus](https://spamassassin.apache.org/old/publiccorpus/) (2002–2005) | 6,046 | ham / spam |
| Email | [Enron-Spam](https://github.com/MWiechmann/enron_spam_data) (Metsis, Androutsopoulos & Paliouras, 2006) | 33,665 | ham / spam |
| Email | [Nazario phishing corpus](https://monkey.org/~jose/phishing/), CC BY 4.0 | 8,432 | phishing |
| Email | [LLM-Generated Phishing Email Dataset](https://huggingface.co/datasets/Dizzzy0x00/LLMGen-Phishing-Email-Dataset), English part (synthetic, written by OpenAI models), Apache-2.0 | 3,746 | ham / phishing |

"Suspicious" (label 1) merges spam, smishing, and phishing. Spam includes unwanted advertising, so a match means "resembles spam or phishing," not "is a scam." SpamAssassin's terms leave copyright with original senders; no explicit license was found for the Enron-Spam packaging. Only learned weights derived from these corpora are published. No endorsement by the data creators is implied.

The LLMGen set was added because the older ordinary mail rarely mentions accounts, security, or orders. Before it was added, the email model wrongly flagged 496 of its 1,269 ordinary emails (39%); the full checker flagged 524 (41%). It is machine-written and formulaic, and some emails it labels phishing (for example a billing-statement notice) look like genuine notices. Its generator's field labels and sender lines are removed before training.

### Split and training procedure

1. Normalize text (Unicode NFKC, invisible characters removed, URLs, email addresses, numbers, and currency symbols replaced with placeholders). Email HTML is converted to text, attachments are dropped, and mailing-list footers are removed.
2. Remove duplicates and group near-identical templates (text: whole normalized message; email: first 64 normalized tokens). Groups with conflicting labels are dropped.
3. Assign whole groups to train/validation/test with a fixed SHA-256 bucket scheme targeting 70/15/15.
4. Fit the vocabulary, IDF, and coefficients on training data only. For email, features must appear in at least 5 training documents in each of at least 2 corpora, and names of corpus owners and organizations (for example Enron staff names, SpamAssassin, SourceForge) are excluded. This reduces "which corpus is this from?" shortcuts.
5. Choose the regularization strength and decision threshold on validation only: maximize recall with at most 1% ordinary-message false positives. Messages outside the runtime eligibility limits count as unflagged.
6. Evaluate once on the test split. Nazario's 2025 phishing (426 messages) is held out entirely as a later-year check.

Library versions are recorded in [research/model-evaluation.json](research/model-evaluation.json) and pinned in `scripts/requirements-research.txt`. JavaScript decision margins reproduce Python within about 1.4 × 10⁻¹⁰ on every test message for both models.

## Held-out results

"Model" counts a model match within its runtime limits. "Full checker" counts a final signal score of at least 15. Frozen v1 is the original rules-only detector.

**Text test split: 921 messages (147 spam/smishing, 774 ordinary)**

| Component | Suspicious flagged | Ordinary flagged | Precision | Recall |
| --- | ---: | ---: | ---: | ---: |
| Frozen v1 rules | 7 / 147 | 0 / 774 | 100% | 4.8% |
| Text model | 137 / 147 | 4 / 774 | 97.2% | 93.2% |
| Full checker | 136 / 147 | 4 / 774 | 97.1% | 92.5% |

By source (model): Mendeley smishing 22/23, Mendeley spam 26/28, UCI spam 89/96; ordinary false positives 1/76 Mendeley and 3/698 UCI.

**Email test split: 6,438 messages (3,437 spam/phishing, 3,001 ordinary)**

| Component | Suspicious flagged | Ordinary flagged | Precision | Recall |
| --- | ---: | ---: | ---: | ---: |
| Frozen v1 rules | 615 / 3,437 | 88 / 3,001 | 87.5% | 17.9% |
| Email model | 3,083 / 3,437 | 29 / 3,001 | 99.1% | 89.7% |
| Full checker | 3,085 / 3,437 | 84 / 3,001 | 97.3% | 89.8% |

By source (model): Nazario phishing 752/843 (89.2%), Enron spam 1,780/2,021 (88.1%), SpamAssassin spam 172/192 (89.6%), LLMGen phishing 379/381 (99.5%); ordinary false positives 15/2,166 Enron (0.7%), 12/654 SpamAssassin (1.8%), and 2/181 LLMGen (1.1%). LLMGen's near-perfect phishing score reflects its formulaic writing, not real-world performance. About 4.9% of test emails are below the 20-token minimum and are not scored by the model.

The full checker's email false positives (2.8%) come mostly from rules, not the model: 46 of 654 SpamAssassin 2002 mailing-list emails are flagged, often for plain `http://` links alongside sign-in or deadline wording. A plain `http://` link adds points only when the message also asks you to act or share details. Later-year check: the email model flagged 356 of 426 (83.6%) of Nazario's held-out 2025 phishing. That figure is recall only; there is no matching 2025 ordinary mail.

### What these numbers do not show

- **They are not modern-scam accuracy.** Much of the data is old: SpamAssassin 2002–2005, Enron-Spam 2006, and UCI SMS 2011. Nazario phishing runs to 2025, the Mendeley SMS set is more recent, and the only modern ordinary email is synthetic. Current scams, writing styles, and brands differ.
- **Source differences remain.** Real ordinary email comes from two corporate/mailing-list sources, while real phishing comes from one collector's mailbox. Even with the filters above, the model can partly learn source style. The strongest ordinary features include "wrote," "attached," and "thanks," which are common in replies and workplace mail; personal and transactional email is underrepresented.
- **Account-security wording overlaps.** Genuine password-change, billing, or shipping notices share vocabulary with phishing. Among the authored emails, a genuine password-change notice scores closest to the threshold without crossing it.
- **Bag-of-words limits.** The models do not understand negation or intent. Safety advice that discusses scams can resemble scams.
- **Grouping is approximate.** Paraphrased campaigns can still cross split boundaries.

## Optional server email model (v3.2)

An optional, off-by-default email classifier for self-hosting: all-MiniLM-L6-v2 fine-tuned end to end on the same email train split, with epoch and threshold chosen on validation (≤1% false positives) and the same 20-word minimum as the browser model. On the 6,438-email test split it flagged 3,225/3,437 suspicious (93.8%) and 22/3,001 ordinary (0.73%), versus 3,083 and 29 for the browser model; on the 2025 phishing holdout, 397/426 (93.2%) versus 356/426 (83.6%). It shares the training data's age and source-separation limits, wrongly flagged one of eight longer authored ordinary emails (a receipt), and is shown only as a second opinion that does not change the points. A text server model was not shipped: 138/147 and 4/774 on the text test, versus 137/147 and 4/774 for the browser model. Details: [server/README.md](server/README.md) and [research/server-model-evaluation.json](research/server-model-evaluation.json).

## Authored scenario checks

There are 46 authored development scenarios (in `tests/scenarios.mjs`) and 14 authored modern emails (in `tests/email-scenarios.mjs`: 8 ordinary, 6 phishing/scam). The full checker flags all 6 suspicious emails and none of the 8 ordinary ones. Of the 46 general scenarios, there are 24 suspicious requests and 22 ordinary messages or safety instructions. V1 flags 12 of the suspicious cases and 6 ordinary cases; v2 flags all 24 suspicious cases and none of the ordinary cases at the 15-point threshold.

These cases were used to develop the rules. Their results demonstrate regression coverage, not independent accuracy or generalization. Cases cover gift card shopping, brand mentions in normal conversations, security-code notifications, bank-safe-account requests, fake-check requests, job/task deposits, Unicode obfuscation, deceptive pasted links, and local negation boundaries.

## Reliability and privacy

Both components can produce false positives and false negatives. The message's actual sender, hidden destination lost during copying, attachment contents, account context, and current link reputation are unknown. No allowlisted domain authenticates a sender or proves a page is harmless. Lexical brand similarity can match legitimate names; the brand list is incomplete. Local negation and quoted-example handling can be fooled.

The checker never opens pasted links and sends no message content to a server unless a deployment configures the optional server email model and the visitor ticks the deeper check for that email. Static app and model assets are loaded normally. No API costs are incurred by analysis. Results remain guidance to verify a request using an independent source.
