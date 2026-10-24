"""
text_search.py - accurate "Search by Description".

The old search used ONLY the SigLIP text->image score and ignored what people
wrote in the item description. That is why "redmi" found nothing.

New hybrid search = keyword match on description/category/location
(with synonyms, brand names and typo tolerance)  +  SigLIP visual score.
"""
import re
import difflib

from chatbot import _tokens, _stem, _expand, BRAND_WORDS, COLOURS

WORD_RE = re.compile(r"[a-z0-9]+")


def _item_words(item):
    text = f"{item.get('description', '')} {item.get('category', '')} {item.get('location', '')}".lower()
    words = set(WORD_RE.findall(text))
    return words, {_stem(w) for w in words}


def keyword_score(query_tokens, item):
    """0..1  -> how much of the query is covered by the item's text."""
    if not query_tokens:
        return 0.0
    words, stems = _item_words(item)
    if not words:
        return 0.0
    total = 0.0
    weight_sum = 0.0
    for t in query_tokens:
        st = _stem(t)
        w8 = 0.5 if t in COLOURS else 1.0                     # colour alone is a weak clue
        weight_sum += w8
        if t in words or st in stems:                         # exact word
            total += 1.0 * w8
            continue
        syn = _expand([t]) - {t, st}
        if syn & words or syn & stems:                        # synonym / brand <-> type
            # typed a BRAND (redmi) and item only says "phone" -> weak;  typed a TYPE (phone) and item is a Redmi -> strong
            total += (0.35 if t in BRAND_WORDS else 0.75) * w8
            continue
        if len(t) >= 4:
            if any(len(w) >= 4 and (w.startswith(t) or t.startswith(w)) and min(len(w), len(t)) / max(len(w), len(t)) >= 0.7
                   for w in words):                                       # charge / charger
                total += 0.6 * w8
                continue
            if difflib.get_close_matches(t, words, n=1, cutoff=0.8):     # typo (chargr / wallt)
                total += 0.65 * w8
    return total / weight_sum if weight_sum else 0.0


def semantic_prompt(query):
    """Build a prompt SigLIP understands better than a bare word."""
    q = " ".join(query.lower().split())
    return q if q.startswith("a photo of") else f"a photo of {q}"


def hybrid_rank(query, metadata, sem_scores, top_k=6):
    """
    query       : text typed by the user
    metadata    : list of item dicts (same order as the FAISS index)
    sem_scores  : list/array of raw SigLIP cosine scores for every item (or None)
    """
    toks = _tokens(query)
    if not toks:                      # e.g. only stop-words typed -> use all words
        toks = [w for w in WORD_RE.findall(query.lower()) if len(w) > 1]
    results = []
    best_raw = max([float(x) for x in sem_scores], default=0.0) if sem_scores is not None else 0.0
    for idx, item in enumerate(metadata):
        raw = float(sem_scores[idx]) if sem_scores is not None and idx < len(sem_scores) else 0.0
        kw = keyword_score(toks, item)
        sem_norm = min(1.0, max(0.0, (raw - 0.04) / 0.16))

        if kw > 0:
            combined = 0.7 * kw + 0.3 * sem_norm
            reason = "Description + visual match" if sem_norm > 0.3 else "Description match"
        elif raw >= 0.08 and raw >= best_raw - 0.02:        # only the picture looks similar (and is among the best)
            combined = 0.6 * sem_norm
            reason = "Visual match"
        else:
            continue

        display = min(0.99, max(0.10, 0.15 + combined * 0.85))
        confidence = "High" if combined >= 0.6 else ("Medium" if combined >= 0.3 else "Low")
        res = {"similarity": round(display, 4), "raw_score": round(raw, 4),
               "confidence": confidence, "match_reason": reason}
        res.update(item)
        results.append((combined, item.get("timestamp") or 0, res))

    results.sort(key=lambda x: (-x[0], -x[1]))
    out = []
    for rank, (_, _, r) in enumerate(results[:top_k], start=1):
        r["rank"] = rank
        out.append(r)
    return out
