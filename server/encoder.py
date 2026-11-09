import re
import unicodedata

# Apache-2.0 general-purpose English sentence encoder (~90 MB), fine-tuned per message type.
BASE_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BASE_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
MAX_SEQ_LENGTH = 256
# Same rule as the browser email model: shorter emails are left to the rules.
MINIMUM_WORDS = {"email": 20, "text": 0}


def word_count(text):
    """Number of tokens as counted by tokens() in scripts/train_models.py and dist/message-classifier.mjs."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]", "", text)
    text = re.sub(r"(?:https?://|www\.)\S+", " __url__ ", text)
    text = re.sub(r"[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+", " __email__ ", text)
    text = re.sub(r"\d+(?:[.,]\d+)*", " __number__ ", text)
    text = re.sub(r"[£$€]", " __money__ ", text)
    return len(re.findall(r"__[a-z]+__|[a-z]{2,}", text))


def eligible(kind, text):
    return word_count(text) >= MINIMUM_WORDS[kind]
