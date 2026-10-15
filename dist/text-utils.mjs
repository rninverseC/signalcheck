// Map normalized characters back to the original input for honest evidence.
export function normalizeText(text) {
  let normalized = '';
  const starts = [], ends = [];
  let offset = 0;
  for (const character of text) {
    const end = offset + character.length;
    const clean = /[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/.test(character)
      ? '' : character.normalize('NFKC').replace(/[‘’]/g, "'").toLowerCase();
    normalized += clean;
    for (let i = 0; i < clean.length; i++) { starts.push(offset); ends.push(end); }
    offset = end;
  }
  return { text: normalized, starts, ends, original: text };
}

export function originalEvidence(normalized, start, end) {
  const originalStart = normalized.starts[start];
  const originalEnd = normalized.ends[end - 1];
  return { text: normalized.original.slice(originalStart, originalEnd), start: originalStart, end: originalEnd, source: 'message' };
}

export function isNegated(text, start) {
  // Scope negation to the current clause. A preceding safety warning must not
  // suppress a new instruction after "but", "however", or a new sentence.
  const prefix = text.slice(Math.max(0, start - 160), start)
    .split(/[.!?\n;]|\b(?:but|however|instead|yet)\b/i).at(-1);
  return /\b(?:never|do\s+not|don't|will\s+not|won't|does\s+not|doesn't|not\s+(?:to|required\s+to|need\s+to)|avoid)\b[^;]{0,110}$/i.test(prefix)
    || /\b(?:scammers?\s+(?:may|might|often)|(?:phishing|scam)\s+(?:example|messages?)|watch\s+out\s+for|beware\s+of)\b[^;]{0,110}$/i.test(prefix);
}
