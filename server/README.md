# Optional SignalCheck server model (emails)

SignalCheck stays browser-only unless a deployment sets the server URL **and** a visitor ticks “Also run the deeper server check”. The published page ships with no server configured and a Content-Security-Policy of `connect-src 'none'`, so the browser itself blocks any request. The server scores the email in memory and does not store or log it (uvicorn access logs are off; FastAPI does not log request bodies).

## Model

[all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) (Apache-2.0, pinned revision in `encoder.py`), a small pretrained transformer, fine-tuned end to end as an email classifier on exactly the same train/validation/test splits as the browser email model. It reads the first 256 word pieces. The epoch and decision threshold were chosen on validation only (≤1% of ordinary emails flagged). Like the browser model, it skips emails under 20 words; those are left to the rules and count as unflagged below.

| Held-out public email test (6,438 emails) | Spam/phishing flagged | Ordinary wrongly flagged |
|---|---:|---:|
| Browser email model (TF-IDF + logistic regression) | 3,083 / 3,437 (89.7%) | 29 / 3,001 (0.97%) |
| **Server email model (fine-tuned MiniLM)** | **3,225 / 3,437 (93.8%)** | **22 / 3,001 (0.73%)** |

On the 426 phishing emails from 2025 that were kept out of training and testing, it flagged 397 (93.2%), versus 356 (83.6%) for the browser model. Full results by source: [research/server-model-evaluation.json](../research/server-model-evaluation.json).

What was tried and not shipped:
- **A text (SMS) server model.** Fine-tuned the same way, it flagged 138/147 suspicious and 4/774 ordinary test texts, versus 137/147 and 4/774 for the browser model, and missed more of the short authored scam texts in `tests/scenarios.mjs`. Not worth sending texts to a server, so the server accepts emails only. `python train.py text` reproduces it.
- **Frozen embeddings + logistic regression** (no fine-tuning): 72.7% of suspicious emails at 1.0% false positives, worse than the browser model.
- **No minimum length:** 99.1% recall on the test set, but it flagged most short ordinary authored emails (for example “Never share your password or move money to a safe account”), so the 20-word rule from the browser model was kept.

Limits: it learned from the same mostly 2002–2006 public corpora, so it may partly recognise which collection an email came from rather than whether it is a scam. Of the 8 longer authored ordinary emails in `tests/email-scenarios.mjs` it wrongly flagged one (a coffee-shop receipt); the browser model flagged none. Its result is shown as a second opinion and does not change the signal points.

## Train

```sh
npm run fetch-data && npm run train   # browser models; also writes research/data/splits/
python3 -m venv ~/.venvs/signalcheck-server
~/.venvs/signalcheck-server/bin/pip install -r server/requirements.txt
npm run train-server                  # ~1 hour on 8 CPU cores; writes server/model/email/ (~90 MB, not committed)
(cd server && ~/.venvs/signalcheck-server/bin/python -m unittest test_app)
```

## Run locally

```sh
npm run serve-model    # http://127.0.0.1:8000
```

In a copy of `dist/index.html`, set `<meta name="signalcheck-server-model" content="http://127.0.0.1:8000">` and change `connect-src 'none'` to `connect-src http://127.0.0.1:8000`, then serve that copy on port 4173 (the server's default `ALLOWED_ORIGINS`).

## Deploy

Build `server/Dockerfile` (after training) on any container host, for example a Hugging Face Docker Space. Set `ALLOWED_ORIGINS` to the site's origin (for example `https://<user>.github.io`). In `dist/index.html`, set the `signalcheck-server-model` meta tag to the server's https origin and add the same origin to `connect-src`; `tests/server-model.test.mjs` checks they match. Only https origins (or localhost) are accepted.

API: `POST /analyze` with `{"message": "...", "type": "email"}` returns `{kind, version, applicable, margin, threshold, matched, truncated}` (`applicable: false` with `minimum_words` for emails under 20 words). `GET /health` reports the version.
