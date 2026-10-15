"""Download the public licensed corpus for local research only."""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
url = "https://archive.ics.uci.edu/static/public/228/sms%2Bspam%2Bcollection.zip"
with urlopen(url, timeout=30) as response:
    archive = response.read()
with ZipFile(BytesIO(archive)) as zipped:
    corpus = zipped.read("SMSSpamCollection")
expected = json.loads((root / "research/sms-model-evaluation.json").read_text())["dataset_sha256"]
if sha256(corpus).hexdigest() != expected:
    raise SystemExit("Corpus hash differs from the recorded evaluation. Review the source before training.")
target = root / "research/data/SMSSpamCollection"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(corpus)
print("Verified public UCI corpus saved locally. Raw messages are excluded from Git and deployed assets.")
