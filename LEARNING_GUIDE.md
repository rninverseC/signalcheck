# Understand SignalCheck, one piece at a time

Start here: the project combines a **checklist**, a **learned SMS pattern check**, and a **points total**. It explains why a message deserves a second look. It does not prove who sent it or whether it is a scam.

## Your first five-minute test

Open the website and scroll to “Try three messages. Notice the difference.”

1. Analyze the bank example. Find the request to transfer savings. Read “Why it matters” and “What you can do.”
2. Analyze the code example. Notice the difference between receiving a code and being asked to forward one. A deadline may still match a weak urgency check.
3. Analyze the deadline example. “Urgent” appears in an ordinary request for an essay. A weak clue should not decide that a message is fraudulent.
4. Open “What does …/100 mean?” in a result. Follow the counted points. These are warning points, not a percentage chance of a scam.
5. Open “How this was detected” beneath one finding. Compare the technical information with its plain-language explanation.

Write down anything you disagree with or do not understand. These are fictional practice messages, not an accuracy benchmark. Later, a useful test notebook can record the message category, expected result, actual result, confusing explanation, and reason for any change you propose. Keep personal details out of shared examples.

## 1. The rules are a checklist

Some requests deserve scrutiny: sharing a password, moving money to a “safe account,” sending gift card codes, or paying to unlock supposed wages.

Rules describe specific wording patterns. A regular expression is a way to say, for example, “look for a request verb near a password or code.” The code also tries to handle context: “Never share your password” differs from “Share your password with me.” These context checks are approximate and can be fooled.

Link checks read the address locally. In `https://paypal.com@billing.example/login`, the destination is `billing.example`; the text before `@` does not determine the website. The checker never opens that link.

Read: `dist/rules.mjs`, `dist/text-utils.mjs`, and `dist/link-checks.mjs`.

Explain it in your own words: why is a request more useful than a single “suspicious” keyword?

## Try another language

Use the **Spanish request** and **Chinese request** sample buttons, then check the message. Notice that the matched words stay in the original language while the explanation is in English. These examples ask for a money transfer to a “safe account,” plus secrecy.

Choose the matching language for your own message. Chinese rules include both Simplified and Traditional writing. These are starter patterns; there is no independent accuracy benchmark for them.

Optionally open **Add an English translation**. Translate on-device if your browser supports it, or paste a translation yourself. Review it, then press **Check this message**. You can compare original and translation in the results. English rules may find additional wording; the trained SMS model is skipped. Findings label translation evidence separately, and link checks use the original addresses.

Why skip the SMS model? It learned wording from English texts. A machine translation has a different style and can change meaning. Its existing benchmark cannot tell us how well it would perform on translated text.

Read: `dist/languages.mjs` and `dist/translator.mjs`.

Explain it in your own words: what could go wrong if a translator changes “do not share your code” into a request to share it?

## 2. The SMS model learns from examples

We trained it on a public collection of text messages labeled ordinary or spam. It learns word-pattern associations with those labels. When you paste an eligible short English text, the browser uses saved model weights to compare its wording with those associations.

It does not remember your messages, learn from them during use, or contact a paid AI service. Email uses the checklist rules without this SMS model. Spam includes unwanted advertising, so “resembles spam” is not the same as “is a scam.”

The technical pipeline is:

1. Normalize and tokenize the words.
2. Count single words and adjacent pairs of words.
3. Apply TF-IDF: repeated words within a message contribute, while words common across many training messages get less distinctiveness weight.
4. Combine features with coefficients learned by logistic regression.
5. Compare the decision value with a threshold selected on validation data.

In this implementation, term frequency is `1 + log(count)`. Each feature is multiplied by its saved inverse-document-frequency value, then the feature vector is normalized. The decision value is the intercept plus the weighted feature sum. The website does not display that value as a fraud probability.

The model has 4,000 features. It is used only for English texts of up to 180 tokens with at least three known vocabulary tokens. Its positive word associations help explain a match, but a word such as “account” is not suspicious by itself.

Read: `dist/sms-classifier.mjs`, `dist/sms-model.mjs`, and `scripts/train_sms_model.py`.

Explain it in your own words: how does a checklist differ from learning patterns from labeled examples?

## 3. Signal points combine the clues

A request to share a password receives more weight than a generic greeting. Related signals share a cap: repeated pressure tactics, for example, should not each count as entirely independent evidence. Some matched signals therefore add fewer or zero additional points. The total is capped at 100.

The bands are:

| Points | Displayed result |
| --- | --- |
| 0–14 | Few signals |
| 15–34 | Some concern |
| 35–100 | High concern |

These weights and thresholds are design choices. **76 points does not mean a 76% chance of a scam.** A low score can miss a scam; a high score can flag a legitimate message.

Read: `dist/analyzer.mjs` for scoring and `dist/explanations.mjs` for the explanation. Presentation code never changes the detector’s score.

Explain it in your own words: why can a matched clue contribute zero additional points?

## 4. Training, validation, and test data have different jobs

Training examples teach the vocabulary and model coefficients. Validation examples help choose its decision threshold. Test examples are kept separate to measure performance after those choices.

If you repeatedly change the model to fit its test messages, those messages stop being a fair independent check. This project removes duplicates and keeps normalized message templates together before splitting, though similar paraphrases can still escape the grouping.

The held-out test includes 100 spam and 700 ordinary messages:

| Actual message | Flagged | Not flagged |
| --- | ---: | ---: |
| Spam | 94 | 6 |
| Ordinary | 8 | 692 |

- A **false positive** is an ordinary message flagged: 8 here.
- A **false negative** is a spam message missed: 6 here.
- **Recall** asks “how much of the spam did we flag?”: 94/100 = 94%.
- **Precision** asks “how much of what we flagged was labeled spam?”: 94/(94+8) ≈ 92.2%.
- The ordinary-message false-positive rate is 8/700 ≈ 1.14%.

These figures describe older SMS spam labels. They do not establish modern phishing or email detection accuracy. The authored scenarios and guided examples were used during development; they are not independent accuracy evidence.

Read: `MODEL_CARD.md`, `research/detector-evaluation.json`, and `scripts/evaluate-detector.mjs`.

Explain it in your own words: why can a detector with high overall accuracy still miss most spam when ordinary messages dominate a dataset?

## A clear way to describe the project

“SignalCheck combines explainable scam rules with an on-device SMS spam model. It highlights the request or link pattern that matched, explains its risk, and suggests an independent way to check it. The detector was evaluated on held-out public SMS data, with both missed spam and false alarms documented. Its score is a warning-points total, not a fraud probability.”

Use only the parts that match work you actually understand and contributed to; credit AI assistance according to your application’s requirements. A useful next contribution is to keep a testing notebook, investigate a confusing result, propose a specific change, and evaluate whether it helps without creating new false alarms.
