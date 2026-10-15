# SignalCheck detector v3: evidence and limits

## Intended use

An educational second look at pasted emails and texts. The checker presents explainable indicators and independent-verification steps. It is not an email filter, authentication service, malware scanner, or fraud adjudication system.

The hybrid contains two components: manually authored scam/link rules for both message types, and an unchanged learned model for eligible short English SMS-like texts only. The final 0–100 score is an indicator sum with family caps, not a calibrated probability.

## Multilingual extension (v3)

Spanish and Chinese (Simplified/Traditional) use starter hand-authored request patterns, with mapped original evidence and approximate clause-local negation. English patterns still detect English passages and file extensions in mixed messages. Optional browser-provided on-device translation adds an English rule pass with separately labeled translation evidence. Manual translations are accepted and editable. Original links and sender details remain the source of structural checks; translated destinations are ignored. Duplicate signals share the existing scoring caps.

The English SMS model is disabled for every non-English message and supplied translation because its training and evaluation did not measure that distribution. No multilingual corpus, translation benchmark, or independent native-language accuracy study has been collected. The authored multilingual scenarios are development/regression tests, not an accuracy claim. Translation and native rules can misread negation, quotation, dialect, or unfamiliar phrasing. Controls and explanations remain in English. Source-script mismatch has a partial-coverage label but is not a full language identification system.

Optional automatic translation uses the [browser Translator API](https://developer.chrome.com/docs/ai/translator-api). Browser support, language-pair availability, downloads, and output quality vary. It makes no cloud translation request from the Site. Manual/direct checking remains available if translation fails.

The English benchmark was rerun after the extension: aggregate full-checker results and JavaScript/Python inference parity are unchanged. The historical table below describes that English path only.

## Learned SMS component

The model is TF-IDF over unigrams and bigrams, followed by logistic regression. The exported 4,000 feature weights and IDF values total approximately 155 KB. JavaScript evaluates the model locally; no remote model service or API key is used.

Data attribution: Almeida, T. & Hidalgo, J. (2011), [SMS Spam Collection](https://doi.org/10.24432/C5CC84), UCI Machine Learning Repository. Dataset adapted under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This adaptation normalizes text, removes duplicates, creates grouped partitions, and learns model coefficients. It is not endorsed by the data creators.

The corpus predates current scam patterns and contains ordinary messages and unsolicited spam, including promotions. It does not establish whether every spam message is a scam. Its geographic and linguistic coverage is limited. Learned associations may flag unfamiliar dialects, real promotions, or legitimate award notifications and miss modern bank/job scams.

## Split and training procedure

1. Parse 5,574 labeled source rows; remove case/whitespace-equivalent duplicates and conflicting duplicate labels. Retain 5,159 unique messages.
2. Group templates after case, punctuation, number, money-symbol, and URL normalization. A fixed SHA-256 bucket scheme puts whole groups in training, validation, or test. It targets 70/15/15 proportions without forcing exact sizes.
3. Fit vocabulary, IDF, and coefficients on the training partition only: 3,603 messages, including 446 spam.
4. Select the decision threshold on validation only: 756 messages, including 96 spam. The operating aim is no more than 1% ordinary-message false positives on validation, maximizing spam recall within that constraint.
5. Evaluate on the untouched test partition: 800 messages, including 100 spam and 700 ordinary messages, across 791 normalized groups. No model or threshold tuning follows inspection of test results.

There is no normalized-group overlap across partitions. Near paraphrases and campaigns not captured by this grouping can still overlap; this is not a chronological, geographic, or external deployment test. The retained corpus and its test messages are ignored by Git and never included in deployed assets.

Training uses the library versions and corpus SHA-256 recorded in [sms-model-evaluation.json](research/sms-model-evaluation.json). Scripts and pinned library requirements support reproduction. Floating-point differences may occur across platforms.

## Held-out results

For the full checker, "flagged" means a final signal score of at least 15.

| Component | Spam flagged / 100 | Ordinary flagged / 700 | Precision | Spam recall |
| --- | ---: | ---: | ---: | ---: |
| Frozen v1 rules | 8 | 0 | 100% | 8% |
| v2 full checker | 94 | 8 | 92.2% | 94% |
| Local SMS model with runtime limits | 94 | 8 | 92.2% | 94% |
| Learned model before runtime limits | 95 | 8 | 92.2% | 95% |

Runtime excludes texts longer than 180 tokens or with fewer than three known vocabulary tokens. This guard excludes one otherwise positive spam prediction in this test. The full checker may also suppress model-word evidence that is locally negated.

The improved checker misses 6 spam messages and flags 8 ordinary messages in this set. The ordinary-message false-positive rate is 1.14%. Greater sensitivity than v1 comes with false alarms. V1's high precision reflects very few positive predictions; it does not establish superior overall detection.

The full checker and the runtime model have equal aggregate counts in this test. That does not prove the additional scam rules improve historical SMS spam classification. The rules address different scenarios, tested below. **None of these figures are phishing, email, or modern scam detection accuracy.**

JavaScript decision margins reproduce Python inference within about 1.1 × 10⁻¹⁰ on the held-out test messages. See the [end-to-end report](research/detector-evaluation.json).

## Authored scenario checks

There are 46 authored development scenarios: 24 suspicious requests and 22 ordinary messages or safety instructions. V1 flags 12 of the suspicious cases and 6 ordinary cases; v2 flags all 24 suspicious cases and none of the ordinary cases at the 15-point threshold.

These cases were used to develop the rules. Their results demonstrate regression coverage, not independent accuracy or generalization. Cases cover gift card shopping, brand mentions in normal conversations, security-code notifications, bank-safe-account requests, fake-check requests, job/task deposits, Unicode obfuscation, deceptive pasted links, and local negation boundaries.

## Reliability and privacy

Both components can produce false positives and false negatives. The message's actual sender, hidden destination lost during copying, attachment contents, account context, and current link reputation are unknown. No allowlisted domain authenticates a sender or proves a page is harmless. Lexical brand similarity can match legitimate names; the brand list is incomplete. Local negation and quoted-example handling can be fooled.

The checker never opens pasted links and sends no message content to a server. Static app and model assets are loaded normally. No API costs are incurred by analysis. Results remain guidance to verify a request using an independent source.
