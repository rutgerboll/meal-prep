#!/usr/bin/env python3
"""
Embed seed.json into index.html's inline `const SEED = {...};` bootstrap.

The app ships a self-contained inline SEED so a fresh PWA install works offline
before it has ever synced. We keep that bootstrap LEAN: base64 thumbnails are
stripped here (they're ~650 KB) and instead arrive on the first sync from the
Mac mini, after which they persist in IndexedDB. Everything else — including the
prep-ahead metadata — is embedded so reminders work offline immediately.

Run after build_seed.py:  python3 embed_seed.py
"""
import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SEED_PATH = os.path.join(SCRIPT_DIR, "seed.json")
HTML_PATH = os.path.join(SCRIPT_DIR, "index.html")


def main():
    with open(SEED_PATH, encoding="utf-8") as f:
        seed = json.load(f)

    # Strip heavy thumbnails from the bootstrap copy; they come via sync.
    stripped = 0
    for r in seed.get("recipes", []):
        if r.get("thumbnail"):
            r["thumbnail"] = None
            stripped += 1
    for cb in seed.get("cookbookBacklog", []):
        if cb.get("thumbnail"):
            cb["thumbnail"] = None
            stripped += 1

    compact = json.dumps(seed, separators=(",", ":"), ensure_ascii=False)

    with open(HTML_PATH, encoding="utf-8") as f:
        html = f.read()

    # Function replacement inserts the JSON verbatim — avoids re.sub interpreting
    # backslash escapes in the data. JSON is already valid JS object-literal syntax.
    new_html, n = re.subn(
        r"const SEED = \{.*?\};",
        lambda _m: "const SEED = " + compact + ";",
        html,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        raise SystemExit("ERROR: could not find inline `const SEED = {...};` in index.html")

    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"✓ Embedded seed into index.html "
          f"(schemaVersion {seed['meta'].get('schemaVersion')}, "
          f"{len(seed.get('recipes', []))} recipes, {stripped} thumbnails stripped, "
          f"{len(compact):,} chars)")


if __name__ == "__main__":
    main()
