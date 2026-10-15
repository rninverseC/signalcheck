"""Train a reproducible, browser-local SMS classifier. No paid APIs.

Requires numpy and scikit-learn for training only. Runtime inference is plain JS.
The corpus is public UCI SMS Spam Collection (Almeida & Hidalgo, CC BY 4.0).
Never use its old SMS spam labels as modern phishing ground truth.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix

ROOT = Path(__file__).resolve().parents[1]
SEED = "signalcheck-sms-group-split-v1"


def tokens(text):
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]", "", text)
    text = re.sub(r"(?:https?://|www\.)\S+", " __url__ ", text)
    text = re.sub(r"\d+(?:[.,]\d+)*", " __number__ ", text)
    text = re.sub(r"[£$€]", " __money__ ", text)
    return re.findall(r"__[a-z]+__|[a-z]{2,}", text)


def features(text):
    words = tokens(text)
    return words + [f"{a} {b}" for a, b in zip(words, words[1:])]


def template_key(text):
    # Group exact duplicates and templates differing only in case, punctuation,
    # phone numbers, money amounts, or URLs BEFORE splitting. No label is used.
    return " ".join(tokens(text))


def split_name(key):
    bucket = int(hashlib.sha256((SEED + key).encode()).hexdigest()[:8], 16) % 100
    return "train" if bucket < 70 else "validation" if bucket < 85 else "test"


def metrics(labels, predictions):
    tn, fp, fn, tp = confusion_matrix(labels, predictions, labels=[0, 1]).ravel()
    return {
        "messages": len(labels), "ham": int(tn + fp), "spam": int(tp + fn),
        "true_positive": int(tp), "false_positive": int(fp),
        "true_negative": int(tn), "false_negative": int(fn),
        "precision": round(float(tp / (tp + fp)), 5) if tp + fp else 0,
        "recall": round(float(tp / (tp + fn)), 5) if tp + fn else 0,
        "false_positive_rate": round(float(fp / (fp + tn)), 5) if fp + tn else 0,
        "accuracy": round(float((tp + tn) / len(labels)), 5),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=ROOT / "research/data/SMSSpamCollection")
    args = parser.parse_args()
    raw = args.dataset.read_bytes()
    unique = {}
    conflicts = set()
    total = 0
    for line in raw.decode("utf-8-sig").splitlines():
        if "\t" not in line:
            continue
        label, text = line.split("\t", 1)
        if label not in ("ham", "spam"):
            continue
        total += 1
        key = re.sub(r"\s+", " ", text.strip().lower())
        row = {"message": text, "label": int(label == "spam"), "group": template_key(text)}
        if key in unique and unique[key]["label"] != row["label"]:
            conflicts.add(key)
        unique.setdefault(key, row)
    rows = [row for key, row in unique.items() if key not in conflicts]
    splits = {name: [row for row in rows if split_name(row["group"]) == name] for name in ("train", "validation", "test")}
    groups = {name: {row["group"] for row in values} for name, values in splits.items()}
    assert not (groups["train"] & groups["test"] or groups["validation"] & groups["test"] or groups["train"] & groups["validation"])
    vectorizer = TfidfVectorizer(analyzer=features, min_df=2, max_features=4000, sublinear_tf=True, norm="l2")
    x_train = vectorizer.fit_transform([row["message"] for row in splits["train"]])
    model = LogisticRegression(C=8.0, solver="liblinear", random_state=17, max_iter=500)
    model.fit(x_train, [row["label"] for row in splits["train"]])
    x_val = vectorizer.transform([row["message"] for row in splits["validation"]])
    val_scores = model.decision_function(x_val)
    val_labels = np.array([row["label"] for row in splits["validation"]])
    # Select an operating threshold only on validation, aiming for <= 1% ham
    # false positives. Never inspect test errors to tune model or threshold.
    best = None
    for threshold in sorted(set(float(score) for score in val_scores)):
        measured = metrics(val_labels, val_scores >= threshold)
        if measured["false_positive_rate"] <= .01:
            choice = (measured["recall"], measured["precision"], threshold)
            if best is None or choice > best:
                best = choice
    threshold = best[2] if best else 0.0
    names = vectorizer.get_feature_names_out()
    exported = {
        "version": "sms-tfidf-logistic-1",
        "bias": round(float(model.intercept_[0]), 10),
        "threshold": round(threshold, 10),
        "maxTokens": 180, "minimumKnownTokens": 3,
        "features": {str(name): [round(float(idf), 10), round(float(weight), 10)] for name, idf, weight in zip(names, vectorizer.idf_, model.coef_[0])},
    }
    model_path = ROOT / "dist/sms-model.mjs"
    model_path.write_text("// Derived from Almeida & Hidalgo's UCI SMS Spam Collection, CC BY 4.0.\n// https://doi.org/10.24432/C5CC84 — see MODEL_CARD.md for limitations.\nexport const SMS_MODEL = " + json.dumps(exported, ensure_ascii=True, separators=(",", ":")) + ";\n")
    report = {
        "dataset": "UCI SMS Spam Collection", "dataset_doi": "10.24432/C5CC84", "license": "CC BY 4.0",
        "dataset_sha256": hashlib.sha256(raw).hexdigest(), "source_rows": total,
        "unique_rows": len(rows), "conflicting_duplicate_rows_removed": len(conflicts),
        "split_seed": SEED, "split": "70/15/15 stable SHA256 groups, not exact proportions",
        "grouping": "case/punctuation/URL/number-normalized templates; exact duplicates removed; not all paraphrases deduplicated",
        "group_overlap": 0, "feature_count": len(names), "threshold": threshold,
        "test_used_for_training_or_threshold_selection": False,
        "training_libraries": {"numpy": np.__version__, "scikit-learn": sklearn.__version__},
        "split_counts": {name: {"messages": len(values), "groups": len(groups[name]), "labels": dict(Counter("spam" if row["label"] else "ham" for row in values))} for name, values in splits.items()},
        "validation": metrics(val_labels, val_scores >= threshold),
    }
    x_test = vectorizer.transform([row["message"] for row in splits["test"]])
    report["test_model_only"] = metrics([row["label"] for row in splits["test"]], model.decision_function(x_test) >= threshold)
    (ROOT / "research/sms-model-evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    # Local held-out data supports JS parity and end-to-end measurements. It is
    # ignored by Git and never shipped to browsers or published with the Site.
    parity = []
    for row, decision in zip(splits["test"], model.decision_function(x_test)):
        parity.append({**row, "expected_margin": float(decision)})
    (ROOT / "research/data/sms-test.json").write_text(json.dumps(parity))
    print(json.dumps({"feature_count": len(names), "validation": report["validation"], "held_out_test": report["test_model_only"], "model_bytes": model_path.stat().st_size}, indent=2))


if __name__ == "__main__":
    main()
