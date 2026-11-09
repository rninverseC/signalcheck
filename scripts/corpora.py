"""Load the public corpora into plain-text rows a person could paste.

Each row is {"message", "label", "category", "source", "year"}. Label 1 means
spam, smishing, or phishing; 0 means ordinary. Email rows contain the subject
line followed by the visible body text, without headers or attachments.
"""
from __future__ import annotations

import csv
import email
import html
import io
import mailbox
import re
import tarfile
import zipfile
from email import policy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "research/data/raw"

# Mailbox-owner identity in the phishing corpus would otherwise become a
# perfect "phishing" feature. Applied to every email source for consistency.
REDACT = re.compile(r"\bjose\b|@?monkey\.org|nazario", re.I)
# Mailing-list and newsletter footers are source artifacts, not message content.
FOOTERS = [
    re.compile(r"\n_{10,}\s*\n[^\n]*(?:mailing list|listinfo)[\s\S]*$", re.I),
    re.compile(r"\n-{3,}[^\n]*\n[^\n]*(?:yahoo! groups|egroups)[\s\S]*$", re.I),
    re.compile(r"\n[^\n]*(?:to unsubscribe from this group|your use of yahoo! groups)[\s\S]*$", re.I),
    re.compile(r"\n[^\n]*https?://(?:lists\.sourceforge\.net|xent\.com/mailman|listman\.(?:spamassassin\.taint\.org|redhat\.com))[\s\S]*$", re.I),
]


def html_to_text(markup: str) -> str:
    markup = re.sub(r"(?is)<(script|style|head|title)\b.*?</\1\s*>", " ", markup)
    markup = re.sub(r"(?is)<!--.*?-->", " ", markup)
    markup = re.sub(r"(?i)<\s*(?:br|/p|/div|/tr|/li|/h[1-6])\b[^>]*>", "\n", markup)
    markup = re.sub(r"(?s)<[^>]+>", " ", markup)
    return html.unescape(markup)


def _part_text(part) -> str:
    try:
        payload = part.get_content()
    except Exception:  # Malformed charsets and encodings are common in old mail.
        raw = part.get_payload(decode=True) or b""
        payload = raw.decode("latin-1", "replace")
    return payload if isinstance(payload, str) else ""


def email_text(message) -> str:
    plain, rich = [], []
    for part in message.walk():
        if part.is_multipart() or part.get_content_disposition() == "attachment":
            continue
        kind = part.get_content_type()
        if kind == "text/plain":
            plain.append(_part_text(part))
        elif kind == "text/html":
            rich.append(html_to_text(_part_text(part)))
    body = "\n".join(plain) if any(p.strip() for p in plain) else "\n".join(rich)
    if re.search(r"<(?:html|body|div|table|p|font)\b", body, re.I):
        body = html_to_text(body)
    return clean_email(str(message.get("subject", "") or ""), body)


def _year(message, default):
    match = re.search(r"\b(19|20)\d\d\b", str(message.get("date", "") or ""))
    return int(match.group(0)) if match else default


def load_text_rows():
    rows = []
    with zipfile.ZipFile(RAW / "mendeley-smishing/Dataset_5971.zip") as zipped:
        reader = csv.DictReader(io.StringIO(zipped.read("Dataset_5971.csv").decode("utf-8")))
        for record in reader:
            label = record["LABEL"].strip().lower()
            text = record["TEXT"].replace("\ufffd", " ").strip()
            if text and label in ("ham", "spam", "smishing"):
                rows.append({"message": text, "label": int(label != "ham"), "category": label, "source": "mendeley-smishing", "year": 2022})
    for line in (RAW / "uci-sms/SMSSpamCollection").read_bytes().decode("utf-8-sig").splitlines():
        if "\t" in line:
            label, text = line.split("\t", 1)
            if label in ("ham", "spam") and text.strip():
                rows.append({"message": text.strip(), "label": int(label == "spam"), "category": label, "source": "uci-sms", "year": 2011})
    return rows


def repair_spaced_tokens(text: str) -> str:
    # Enron-Spam was distributed with spaces around punctuation, which splits
    # links and addresses ("http : / / www . example . com") into words.
    text = re.sub(r"\bhttps?\s*:\s*/\s*/\s*(?:[\w-]+\s*[./]\s*)*[\w-]+", " https://link.example ", text)
    text = re.sub(r"\bwww\s*\.\s*(?:[\w-]+\s*\.\s*)*[\w-]+", " https://link.example ", text)
    return re.sub(r"[\w.-]+(?:\s*\.\s*[\w-]+)*\s*@\s*[\w-]+(?:\s*\.\s*[\w-]+)+", " someone@mail.example ", text)


def clean_email(subject: str, body: str) -> str:
    for footer in FOOTERS:
        body = footer.sub("", body)
    text = f"{subject}\n{body}" if subject.strip() else body
    text = REDACT.sub(" ", text.replace("\x00", " "))
    text = re.sub(r"[ \t\r\f\v\u00a0]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()


def load_email_rows():
    rows = []
    csv.field_size_limit(1 << 27)
    with open(RAW / "enron-spam/enron_spam_data.csv", encoding="utf-8", errors="replace", newline="") as handle:
        for record in csv.DictReader(line.replace("\x00", " ") for line in handle):
            category = record["Spam/Ham"].strip()
            text = clean_email(repair_spaced_tokens(record["Subject"] or ""), repair_spaced_tokens(record["Message"] or ""))
            if text and category in ("ham", "spam"):
                rows.append({"message": text, "label": int(category == "spam"), "category": category, "source": "enron-spam", "year": int(record["Date"][:4]) if record["Date"][:4].isdigit() else 2002})
    parse = email.message_from_bytes
    for archive in sorted((RAW / "spamassassin").glob("*.tar.bz2")):
        category = "spam" if "spam" in archive.name else "ham"
        with tarfile.open(archive, "r:bz2") as tar:
            for member in tar.getmembers():
                if not member.isfile() or member.name.endswith("cmds"):
                    continue
                message = parse(tar.extractfile(member).read(), policy=policy.default)
                text = email_text(message)
                if text:
                    rows.append({"message": text, "label": int(category == "spam"), "category": category, "source": "spamassassin", "year": _year(message, 2002)})
    for path in sorted((RAW / "nazario-phishing").iterdir()):
        default = int(m.group(0)) if (m := re.search(r"20\d\d", path.name)) else 2006
        default = 2005 if default == 2005 and "1114" in path.name else default
        for message in mailbox.mbox(path, factory=lambda f: parse(f.read(), policy=policy.default), create=False):
            text = email_text(message)
            if text:
                year = default if path.name.startswith("phishing-") else _year(message, default)
                rows.append({"message": text, "label": 1, "category": "phishing", "source": "nazario-phishing", "year": year, "file": path.name})
    return rows
