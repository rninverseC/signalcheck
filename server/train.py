"""Fine-tune the optional server-side models on the browser models' exact splits.

Each message type gets its own copy of a small pretrained transformer, fine-tuned
end to end so it reads word order and context. The epoch and the threshold are
chosen on validation only (<=1% ordinary messages flagged); test and the future
phishing holdout are scored once at the end.
Run `npm run train` first so research/data/splits/*.jsonl exist, then
`python train.py [email] [text] [--evaluate-only]`. Only the email model is
served (see README.md); the text model can be trained for comparison.
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import numpy as np
import sklearn
import torch
import transformers
from transformers import AutoModelForSequenceClassification, AutoTokenizer, get_linear_schedule_with_warmup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from train_models import breakdown, choose_threshold, metrics, tokens  # noqa: E402

from encoder import BASE_MODEL, BASE_REVISION, MAX_SEQ_LENGTH, MINIMUM_WORDS, eligible, word_count  # noqa: E402

SPLITS = ROOT / "research/data/splits"
MODELS = Path(__file__).parent / "model"
EPOCHS = {"text": 4, "email": 2}
BATCH, LEARNING_RATE, SEED = 16, 5e-5, 0


def read(kind, split):
    path = SPLITS / f"{kind}-{split}.jsonl"
    return [json.loads(line) for line in path.open(encoding="utf-8")] if path.exists() else []


def batches(tokenizer, texts, size):
    for start in range(0, len(texts), size):
        yield tokenizer(texts[start:start + size], truncation=True, max_length=MAX_SEQ_LENGTH, padding=True, return_tensors="pt")


@torch.inference_mode()
def margins(model, tokenizer, rows):
    """Model margins; messages outside the eligibility rule get -inf and are never flagged."""
    model.eval()
    # Sorting by length keeps padding small; results are put back in order.
    order = sorted(range(len(rows)), key=lambda i: len(rows[i]["message"]))
    scores = np.empty(len(rows))
    position = 0
    for batch in batches(tokenizer, [rows[i]["message"] for i in order], 64):
        logits = model(**batch).logits
        values = (logits[:, 1] - logits[:, 0]).numpy()
        scores[order[position:position + len(values)]] = values
        position += len(values)
    return scores


def train(kind, evaluate_only=False):
    rows = {split: read(kind, split) for split in ("train", "validation", "test", "future")}
    assert all(word_count(row["message"]) == len(tokens(row["message"])) for row in rows["validation"]), "encoder.word_count drifted from train_models.tokens"
    mask = {split: np.array([eligible(kind, row["message"]) for row in items]) for split, items in rows.items() if items}
    score = lambda model, tokenizer, split: np.where(mask[split], margins(model, tokenizer, rows[split]), -np.inf)
    labels = {split: np.array([row["label"] for row in items]) for split, items in rows.items() if items}
    torch.manual_seed(SEED)
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, revision=BASE_REVISION)
    model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL, revision=BASE_REVISION, num_labels=2)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=0.01)
    steps = EPOCHS[kind] * math.ceil(len(rows["train"]) / BATCH)
    schedule = get_linear_schedule_with_warmup(optimizer, int(0.06 * steps), steps)
    generator = torch.Generator().manual_seed(SEED)
    best, history = None, []
    for epoch in range(1, 0 if evaluate_only else EPOCHS[kind] + 1):
        model.train()
        started = time.time()
        order = torch.randperm(len(rows["train"]), generator=generator).tolist()
        for start in range(0, len(order), BATCH):
            chosen = [rows["train"][i] for i in order[start:start + BATCH]]
            batch = tokenizer([row["message"] for row in chosen], truncation=True, max_length=MAX_SEQ_LENGTH, padding=True, return_tensors="pt")
            loss = model(**batch, labels=torch.tensor([row["label"] for row in chosen])).loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step(); schedule.step(); optimizer.zero_grad()
        recall, precision, threshold = choose_threshold(labels["validation"], score(model, tokenizer, "validation"))
        history.append({"epoch": epoch, "validation_recall": recall, "validation_precision": precision, "threshold": threshold, "minutes": round((time.time() - started) / 60, 1)})
        print(kind, history[-1], flush=True)
        if best is None or (recall, precision) > best[:2]:
            best = (recall, precision, threshold, epoch)
            model.save_pretrained(MODELS / kind, safe_serialization=True)
            tokenizer.save_pretrained(MODELS / kind)
    model = AutoModelForSequenceClassification.from_pretrained(MODELS / kind)
    if evaluate_only:
        saved = json.loads((MODELS / kind / "signalcheck.json").read_text())
        history = saved.get("epochs", [])
        best = (*choose_threshold(labels["validation"], score(model, tokenizer, "validation")), saved["epoch"])
    *_, threshold, epoch = best
    (MODELS / kind / "signalcheck.json").write_text(json.dumps({"kind": kind, "base_model": BASE_MODEL, "base_revision": BASE_REVISION, "max_seq_length": MAX_SEQ_LENGTH, "minimum_words": MINIMUM_WORDS[kind], "epoch": epoch, "epochs": history, "threshold": threshold}, indent=1) + "\n")
    test_flags = score(model, tokenizer, "test") >= threshold
    report = {
        "kind": kind, "base_model": BASE_MODEL, "base_revision": BASE_REVISION, "max_seq_length": MAX_SEQ_LENGTH,
        "batch_size": BATCH, "learning_rate": LEARNING_RATE, "chosen_epoch": epoch, "threshold": threshold, "epochs": history,
        "eligibility": {"minimum_words": MINIMUM_WORDS[kind], **{f"{split}_eligible_share": round(float(m.mean()), 5) for split, m in mask.items()}},
        "validation": metrics(labels["validation"], score(model, tokenizer, "validation") >= threshold),
        "test": metrics(labels["test"], test_flags),
        "test_by_source": breakdown(rows["test"], test_flags),
    }
    if rows["future"]:
        flagged = int((score(model, tokenizer, "future") >= threshold).sum())
        report["future_phishing_holdout"] = {"messages": len(rows["future"]), "flagged": flagged, "recall": round(flagged / len(rows["future"]), 5)}
    return report


def main():
    torch.set_num_threads(max(1, torch.get_num_threads()))
    evaluate_only = "--evaluate-only" in sys.argv
    kinds = [arg for arg in sys.argv[1:] if not arg.startswith("--")] or ["email"]
    out = ROOT / "research/server-model-evaluation.json"
    reports = json.loads(out.read_text()) if out.exists() else {}
    for kind in kinds:
        reports[kind] = train(kind, evaluate_only)
        reports["versions"] = {"torch": torch.__version__, "transformers": transformers.__version__, "scikit_learn": sklearn.__version__, "numpy": np.__version__}
        reports["warning"] = "Same public-corpus splits as the browser models; see MODEL_CARD.md and server/README.md. Not a measure of modern scam detection."
        out.write_text(json.dumps(reports, indent=1) + "\n")
        print(kind, json.dumps({k: reports[kind][k] for k in ("chosen_epoch", "test", "test_by_source")} | {"future": reports[kind].get("future_phishing_holdout")}, indent=1), flush=True)


if __name__ == "__main__":
    main()
