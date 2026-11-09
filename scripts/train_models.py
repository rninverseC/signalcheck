"""Train the browser-local text and email classifiers from several public corpora.

Requires numpy and scikit-learn for training only; runtime inference is plain JS
(dist/message-classifier.mjs). Run scripts/fetch_training_data.py first.

Labels are corpus labels (spam, smishing, phishing vs ordinary). They are not a
measure of modern fraud in general; see MODEL_CARD.md before citing results.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix

from corpora import load_email_rows, load_text_rows

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "research/data"
SEED = "signalcheck-sms-group-split-v1"
TARGET_FALSE_POSITIVE_RATE = 0.01
C_GRID = (1.0, 4.0, 8.0, 16.0)
MIN_SOURCE_DOCS = 5

MODELS = {
    "text": {"version": "text-tfidf-logistic-2", "const": "TEXT_MODEL", "file": "text-model.mjs", "loader": load_text_rows,
             "max_features": 4000, "maxTokens": 180, "truncateTokens": None, "minimumKnownTokens": 3, "group_tokens": None},
    "email": {"version": "email-tfidf-logistic-1", "const": "EMAIL_MODEL", "file": "email-model.mjs", "loader": load_email_rows,
              "max_features": 6000, "maxTokens": None, "truncateTokens": 400, "minimumKnownTokens": 5, "minimumTokens": 20, "group_tokens": 64, "min_sources": 2},
}
# The newest phishing year is held out entirely to estimate recall on
# templates that appeared after all training data. It has no ordinary mail.
FUTURE = {"email": lambda row: row.get("file") == "phishing-2025"}

# Names of corpus owners, organizations, mailing lists, and people that would
# otherwise act as "ordinary" or "suspicious" shortcuts for one source. Features
# containing these words are removed from the vocabulary before training.
EXCLUDED_TERMS = {
    "email": set("""
        enron ect hou vince kaminski louise daren sally steve jim tom dave
        cnet sponsor sponsored spamassassin razor exmh sourceforge sf ilug
        zzzz
    """.split()),
}

# Keep in sync with tokenize() in dist/message-classifier.mjs.
def tokens(text):
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]", "", text)
    text = re.sub(r"(?:https?://|www\.)\S+", " __url__ ", text)
    text = re.sub(r"[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+", " __email__ ", text)
    text = re.sub(r"\d+(?:[.,]\d+)*", " __number__ ", text)
    text = re.sub(r"[£$€]", " __money__ ", text)
    return re.findall(r"__[a-z]+__|[a-z]{2,}", text)


def make_analyzer(truncate):
    def features(text):
        words = tokens(text)
        if truncate:
            words = words[:truncate]
        return words + [f"{a} {b}" for a, b in zip(words, words[1:])]
    return features


def group_key(text, limit):
    # Group exact duplicates and templates differing only in case, punctuation,
    # phone numbers, money amounts, addresses, or URLs BEFORE splitting.
    words = tokens(text)
    return " ".join(words[:limit] if limit else words)


def split_name(key):
    bucket = int(hashlib.sha256((SEED + key).encode()).hexdigest()[:8], 16) % 100
    return "train" if bucket < 70 else "validation" if bucket < 85 else "test"


def metrics(labels, predictions):
    labels, predictions = np.asarray(labels, dtype=int), np.asarray(predictions, dtype=int)
    tn, fp, fn, tp = confusion_matrix(labels, predictions, labels=[0, 1]).ravel()
    rate = lambda n, d: round(float(n / d), 5) if d else 0
    return {"messages": int(len(labels)), "ordinary": int(tn + fp), "suspicious": int(tp + fn),
            "true_positive": int(tp), "false_positive": int(fp), "true_negative": int(tn), "false_negative": int(fn),
            "precision": rate(tp, tp + fp), "recall": rate(tp, tp + fn), "false_positive_rate": rate(fp, fp + tn),
            "accuracy": rate(tp + tn, len(labels))}


def choose_threshold(labels, scores):
    best = None
    for threshold in np.unique(scores[np.isfinite(scores)]):
        measured = metrics(labels, scores >= threshold)
        if measured["false_positive_rate"] <= TARGET_FALSE_POSITIVE_RATE:
            choice = (measured["recall"], measured["precision"], float(threshold))
            best = choice if best is None or choice > best else best
    return best


def breakdown(rows, predictions):
    out = {}
    for key in sorted({(row["source"], row["category"]) for row in rows}):
        picked = [p for row, p in zip(rows, predictions) if (row["source"], row["category"]) == key]
        label = next(row["label"] for row in rows if (row["source"], row["category"]) == key)
        flagged = int(sum(picked))
        out[f"{key[0]}/{key[1]}"] = {"messages": len(picked), "flagged": flagged,
                                     ("recall" if label else "false_positive_rate"): round(flagged / len(picked), 5)}
    return out


def prepare(name, config):
    raw = sorted(config["loader"](), key=lambda row: row["year"])
    groups, conflicts = {}, set()
    for row in raw:
        key = group_key(row["message"], config["group_tokens"])
        if not key:
            continue
        row = {**row, "group": key}
        if key in groups and groups[key]["label"] != row["label"]:
            conflicts.add(key)
        groups.setdefault(key, row)
    rows = [row for key, row in groups.items() if key not in conflicts]
    future = [row for row in rows if FUTURE.get(name, lambda _: False)(row)]
    rows = [row for row in rows if not FUTURE.get(name, lambda _: False)(row)]
    splits = {split: [row for row in rows if split_name(row["group"]) == split] for split in ("train", "validation", "test")}
    return raw, conflicts, splits, future


def applicable(texts, vocabulary, config):
    # Mirrors the runtime eligibility check in dist/message-classifier.mjs.
    # Ineligible messages are never flagged by the model, so metrics include them as unflagged.
    known = set(vocabulary)
    mask = []
    for text in texts:
        words = tokens(text)
        scored = words[:config["truncateTokens"]] if config["truncateTokens"] else words
        mask.append((not config["maxTokens"] or len(words) <= config["maxTokens"])
                    and len(words) >= config.get("minimumTokens", 0)
                    and sum(word in known for word in scored) >= config["minimumKnownTokens"])
    return np.array(mask)


def train(name, config):
    raw, conflicts, splits, future = prepare(name, config)
    analyzer = make_analyzer(config["truncateTokens"])
    texts = {split: [row["message"] for row in rows] for split, rows in splits.items()}
    labels = {split: np.array([row["label"] for row in rows]) for split, rows in splits.items()}
    vectorizer = TfidfVectorizer(analyzer=analyzer, min_df=2, sublinear_tf=True, norm="l2").fit(texts["train"])
    excluded = EXCLUDED_TERMS.get(name, set())
    present = vectorizer.transform(texts["train"]).astype(bool).tocsc()
    frequency = np.asarray(present.sum(axis=0)).ravel()
    # A word seen in only one corpus is more likely a corpus artifact (a mailing
    # list, company, or person) than a general scam signal. Require at least
    # MIN_SOURCE_DOCS documents in each of `min_sources` different corpora.
    source_ids = np.array([row["source"] for row in splits["train"]])
    per_source = np.vstack([np.asarray(present[source_ids == source].sum(axis=0)).ravel() for source in sorted(set(source_ids))])
    spread = (per_source >= MIN_SOURCE_DOCS).sum(axis=0)
    candidates = [(int(frequency[i]), term) for term, i in vectorizer.vocabulary_.items()
                  if not excluded.intersection(term.split()) and spread[i] >= config.get("min_sources", 0)]
    vocabulary = sorted(term for _, term in sorted(candidates, key=lambda item: (-item[0], item[1]))[:config["max_features"]])
    vectorizer = TfidfVectorizer(analyzer=analyzer, vocabulary=vocabulary, sublinear_tf=True, norm="l2")
    x_train = vectorizer.fit_transform(texts["train"])
    x_val = vectorizer.transform(texts["validation"])
    eligible = {split: applicable(texts[split], vocabulary, config) for split in texts}
    # Regularization and threshold are chosen on validation only. The test
    # split and future holdout are never used to tune either.
    candidates = []
    for c in C_GRID:
        model = LogisticRegression(C=c, solver="liblinear", random_state=17, max_iter=1000).fit(x_train, labels["train"])
        best = choose_threshold(labels["validation"], np.where(eligible["validation"], model.decision_function(x_val), -np.inf))
        if best:
            candidates.append((best[0], best[1], -c, model, best[2]))
    recall, precision, neg_c, model, threshold = max(candidates, key=lambda item: item[:3])
    names = vectorizer.get_feature_names_out()
    exported = {"version": config["version"], "bias": round(float(model.intercept_[0]), 10), "threshold": round(threshold, 10),
                "minimumKnownTokens": config["minimumKnownTokens"],
                "features": {str(n): [round(float(i), 10), round(float(w), 10)] for n, i, w in zip(names, vectorizer.idf_, model.coef_[0])}}
    for key in ("maxTokens", "truncateTokens", "minimumTokens"):
        if config.get(key):
            exported[key] = config[key]
    path = ROOT / "dist" / config["file"]
    sources = sorted({row["source"] for row in raw})
    path.write_text(f"// Trained locally on public corpora ({', '.join(sources)}); see research/data-sources.json\n"
                    "// for licenses and attribution, and MODEL_CARD.md for limitations.\n"
                    f"export const {config['const']} = " + json.dumps(exported, ensure_ascii=True, separators=(",", ":")) + ";\n")

    x_test = vectorizer.transform(texts["test"])
    test_scores = model.decision_function(x_test)
    test_predictions = eligible["test"] & (test_scores >= threshold)
    order = np.argsort(model.coef_[0])
    report = {
        "model": config["version"], "exported_file": f"dist/{config['file']}", "model_bytes": path.stat().st_size,
        "sources": sources, "source_rows": dict(Counter(f"{row['source']}/{row['category']}" for row in raw)),
        "unique_groups_kept": sum(len(rows) for rows in splits.values()) + len(future),
        "conflicting_groups_removed": len(conflicts),
        "split_seed": SEED, "split": "70/15/15 stable SHA256 groups, not exact proportions",
        "grouping": f"case/punctuation/URL/address/number-normalized {'first ' + str(config['group_tokens']) + ' tokens' if config['group_tokens'] else 'templates'}; one row kept per group; not all paraphrases deduplicated",
        "feature_count": len(names), "excluded_identity_terms": sorted(excluded), "minimum_corpora_per_feature": config.get("min_sources", 0), "regularization_C": -neg_c, "threshold": threshold,
        "threshold_rule": f"highest validation recall with false-positive rate <= {TARGET_FALSE_POSITIVE_RATE}",
        "test_used_for_training_or_threshold_selection": False,
        "training_libraries": {"numpy": np.__version__, "scikit-learn": sklearn.__version__},
        "split_counts": {split: {"messages": len(rows), "labels": dict(Counter("suspicious" if row["label"] else "ordinary" for row in rows))} for split, rows in splits.items()},
        "eligibility": {"rule": {key: config.get(key) for key in ("maxTokens", "minimumTokens", "minimumKnownTokens")},
                        "note": "Messages outside these limits are not scored by the model and count as unflagged in the metrics below.",
                        **{f"{split}_eligible_share": round(float(mask.mean()), 5) for split, mask in eligible.items()}},
        "validation": metrics(labels["validation"], eligible["validation"] & (model.decision_function(x_val) >= threshold)),
        "test_model_only": metrics(labels["test"], test_predictions),
        "test_by_source": breakdown(splits["test"], test_predictions),
        "strongest_suspicious_features": [str(names[i]) for i in order[::-1][:25]],
        "strongest_ordinary_features": [str(names[i]) for i in order[:25]],
    }
    if future:
        future_texts = [row["message"] for row in future]
        flagged = int((applicable(future_texts, vocabulary, config) & (model.decision_function(vectorizer.transform(future_texts)) >= threshold)).sum())
        report["future_phishing_holdout"] = {"description": "Nazario phishing-2025 templates not seen in earlier years; excluded from training, validation, and test. Recall only: there is no matching 2025 ordinary mail.",
                                             "messages": len(future), "flagged": flagged, "recall": round(flagged / len(future), 5)}
    # Held-out rows stay in ignored local files for JS parity and end-to-end
    # evaluation. They are never shipped to browsers or committed.
    (DATA / f"{name}-test.json").write_text(json.dumps([{"message": row["message"], "label": row["label"], "category": row["category"], "source": row["source"], "expected_margin": float(m)} for row, m in zip(splits["test"], test_scores)]))
    # Prepared splits let a future server-side model reuse identical data.
    (DATA / "splits").mkdir(parents=True, exist_ok=True)
    for split, rows in {**splits, **({"future": future} if future else {})}.items():
        with open(DATA / "splits" / f"{name}-{split}.jsonl", "w") as handle:
            for row in rows:
                handle.write(json.dumps({k: row[k] for k in ("message", "label", "category", "source", "year")}) + "\n")
    return report


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    reports = {name: train(name, config) for name, config in MODELS.items()}
    (ROOT / "research/model-evaluation.json").write_text(json.dumps(reports, indent=2) + "\n")
    for name, report in reports.items():
        print(name, json.dumps({k: report[k] for k in ("model_bytes", "regularization_C", "validation", "test_model_only", "test_by_source")} | ({"future": report["future_phishing_holdout"]} if "future_phishing_holdout" in report else {}), indent=1))
        print("  top suspicious:", report["strongest_suspicious_features"])
        print("  top ordinary:", report["strongest_ordinary_features"])


if __name__ == "__main__":
    main()
