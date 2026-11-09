"""Optional SignalCheck server model. Opt-in only; the browser checker never calls it by default.

Message text is scored in memory and never stored or logged.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from encoder import MINIMUM_WORDS, eligible

VERSION = "server-minilm-finetuned-1"
MAX_LENGTH = 20000
MODEL_DIR = Path(os.environ.get("MODEL_DIR", Path(__file__).parent / "model"))


def load(kind):
    folder = MODEL_DIR / kind
    settings = json.loads((folder / "signalcheck.json").read_text())
    model = AutoModelForSequenceClassification.from_pretrained(folder).eval()
    return settings, AutoTokenizer.from_pretrained(folder), model


torch.set_num_threads(int(os.environ.get("TORCH_THREADS", "2")))
# Only the email model is served: on texts it was no better than the browser model.
KINDS = ("email",)
MODELS = {kind: load(kind) for kind in KINDS}
app = FastAPI(title="SignalCheck server model", docs_url=None, redoc_url=None, openapi_url=None)
origins = [origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "http://127.0.0.1:4173,http://localhost:4173").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["POST", "GET"], allow_headers=["Content-Type"])


class Request(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_LENGTH)
    type: str = Field(default="email", pattern="^email$")


@app.get("/health")
def health():
    return {"ok": True, "version": VERSION, "kinds": list(KINDS)}


@app.post("/analyze")
def analyze(request: Request):
    text = request.message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Paste a message to check first.")
    if not eligible(request.type, text):
        return {"kind": request.type, "version": VERSION, "applicable": False, "minimum_words": MINIMUM_WORDS[request.type]}
    settings, tokenizer, model = MODELS[request.type]
    full_length = len(tokenizer(text)["input_ids"])
    encoded = tokenizer(text, truncation=True, max_length=settings["max_seq_length"], return_tensors="pt")
    with torch.inference_mode():
        logits = model(**encoded).logits[0]
    margin = float(logits[1] - logits[0])
    return {"kind": request.type, "version": VERSION, "applicable": True, "margin": round(margin, 4), "threshold": round(settings["threshold"], 4),
            "matched": margin >= settings["threshold"], "truncated": full_length > settings["max_seq_length"]}
