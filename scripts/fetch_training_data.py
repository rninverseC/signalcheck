"""Download the public training corpora listed in research/data-sources.json.

Every file is verified against its recorded SHA-256 before it is saved. Raw
messages stay in research/data/raw, which is ignored by Git and never deployed.
"""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "research/data/raw"


def main():
    manifest = json.loads((ROOT / "research/data-sources.json").read_text())
    for source in manifest["sources"]:
        for item in source["files"]:
            target = RAW / source["id"] / item["name"]
            if target.exists() and sha256(target.read_bytes()).hexdigest() == item["sha256"]:
                print(f"ok      {source['id']}/{item['name']}")
                continue
            request = Request(item["url"], headers={"User-Agent": "signalcheck-research"})
            with urlopen(request, timeout=120) as response:
                data = response.read()
            if "extract" in item:
                with ZipFile(BytesIO(data)) as zipped:
                    data = zipped.read(item["extract"])
            if sha256(data).hexdigest() != item["sha256"]:
                raise SystemExit(f"{source['id']}/{item['name']} differs from the recorded hash. Review the source before training.")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            print(f"fetched {source['id']}/{item['name']}")
    print("Verified public corpora saved locally. Raw messages are excluded from Git and deployed assets.")


if __name__ == "__main__":
    main()
