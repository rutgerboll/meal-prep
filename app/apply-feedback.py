#!/usr/bin/env python3
"""
Apply cook feedback to the recipe markdown library — closes the learning loop.

The phone app pushes cook ratings to meal-server.py's /feedback endpoint, which
appends them to `feedback-inbox-{test,prod}.jsonl` in the library root. Those
entries just sit there until this script folds them into each recipe's markdown:

  * appends a dated line to the recipe's "## Feedback log" section, and
  * updates the `ratings:` frontmatter (cook_count + rolling averages),

so the next plan you generate in Claude actually reflects how the cooking went.

Run (from app-build/app/):
    python3 apply-feedback.py            # apply the PROD inbox
    python3 apply-feedback.py --dry-run  # show what would change, touch nothing
    python3 apply-feedback.py --env test # apply the TEST inbox instead

Each applied entry is moved to `feedback-applied-{env}.jsonl` and the inbox is
truncated, so re-running never double-counts. Entries are also de-duped by `id`
against the applied archive as a belt-and-suspenders guard.

No API key, no network — this only reads/writes your local markdown files.
"""
import argparse
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LIBRARY_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))  # Meal planning/
RECIPES_DIR = os.path.join(LIBRARY_ROOT, "recipes")

DIFFICULTY_WORDS = ["", "very easy", "easy", "medium", "hard", "very hard"]


def load_inbox(path):
    """Read a .jsonl inbox into a list of dicts, skipping blank/garbage lines."""
    if not os.path.exists(path):
        return []
    entries = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"  ! skipping unparseable line: {line[:80]}", file=sys.stderr)
    return entries


def applied_ids(path):
    """Set of entry ids already applied (so re-runs can't double-count)."""
    return {e.get("id") for e in load_inbox(path) if e.get("id") is not None}


def recipe_path_for(recipe_id):
    """Locate the markdown file for a recipe id (filename first, then frontmatter)."""
    direct = os.path.join(RECIPES_DIR, f"{recipe_id}.md")
    if os.path.exists(direct):
        return direct
    for name in os.listdir(RECIPES_DIR):
        if not name.endswith(".md"):
            continue
        full = os.path.join(RECIPES_DIR, name)
        with open(full, encoding="utf-8") as f:
            head = f.read(2000)
        m = re.search(r"^id:\s*(.+?)\s*$", head, re.MULTILINE)
        if m and m.group(1).strip() == recipe_id:
            return full
    return None


def feedback_line(entry):
    """Mirror the app's in-app feedback log line format (saveCookFeedback)."""
    date = entry.get("date", "")
    mins = entry.get("actualMinutes", "?")
    diff = entry.get("difficulty", "?")
    liked = entry.get("liked", "?")
    nxt = (entry.get("changeNote") or "").strip()
    line = f"- {date} — Took {mins} min. Difficulty {diff}/5. Liked {liked}/5."
    if nxt:
        line += f" Next: {nxt}"
    return line


def _num(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def update_ratings_block(text, new_entries):
    """Roll the new cooks into the frontmatter `ratings:` block.

    Uses the stored cook_count + averages as the prior, so we never need to
    re-parse historical feedback lines. Returns (new_text, summary_dict).
    """
    # Match each field on its own line. Crucially the inline-whitespace classes
    # are [ \t]* (NOT \s*) so they can't swallow the newline of an empty-valued
    # field — the seed recipes ship with `avg_difficulty:` etc. left blank.
    block_re = re.compile(
        r"^(?P<ind>[ \t]*)ratings:[ \t]*\n"
        r"(?P<i2>[ \t]*)cook_count:[ \t]*(?P<cc>[^\n]*)\n"
        r"[ \t]*avg_difficulty:[ \t]*(?P<ad>[^\n]*)\n"
        r"[ \t]*avg_actual_minutes:[ \t]*(?P<am>[^\n]*)\n"
        r"[ \t]*liked:[ \t]*(?P<lk>[^\n]*)\n",
        re.MULTILINE,
    )
    m = block_re.search(text)
    if not m:
        return text, None

    ind, i2 = m.group("ind"), m.group("i2")
    old_count = int(_num(m.group("cc")) or 0)
    old_diff = _num(m.group("ad"))
    old_mins = _num(m.group("am"))
    old_liked = _num(m.group("lk"))

    # Reconstruct prior sums from the stored rolling averages.
    sum_diff = (old_diff or 0) * old_count
    sum_mins = (old_mins or 0) * old_count
    sum_liked = (old_liked or 0) * old_count
    count = old_count
    for e in new_entries:
        count += 1
        sum_diff += float(e.get("difficulty", 0))
        sum_mins += float(e.get("actualMinutes", 0))
        sum_liked += float(e.get("liked", 0))

    def fmt(v):
        return f"{v:.1f}".rstrip("0").rstrip(".")

    avg_diff = fmt(sum_diff / count) if count else ""
    avg_mins = fmt(sum_mins / count) if count else ""
    avg_liked = fmt(sum_liked / count) if count else ""

    replacement = (
        f"{ind}ratings:\n"
        f"{i2}cook_count: {count}\n"
        f"{i2}avg_difficulty: {avg_diff}\n"
        f"{i2}avg_actual_minutes: {avg_mins}\n"
        f"{i2}liked: {avg_liked}\n"
    )
    new_text = text[: m.start()] + replacement + text[m.end():]
    summary = {"cook_count": count, "avg_difficulty": avg_diff,
               "avg_actual_minutes": avg_mins, "liked": avg_liked}
    return new_text, summary


def append_feedback_log(text, lines):
    """Append dated lines under the recipe's '## Feedback log' section."""
    header_re = re.compile(r"(^##\s+Feedback log\s*$)", re.MULTILINE)
    m = header_re.search(text)
    block = "\n".join(lines)
    if not m:
        # No section yet — create one at the end of the file.
        sep = "" if text.endswith("\n") else "\n"
        return f"{text}{sep}\n## Feedback log\n{block}\n"
    insert_at = len(text)
    nxt = re.search(r"^##\s+", text[m.end():], re.MULTILINE)
    if nxt:
        insert_at = m.end() + nxt.start()
    before = text[:insert_at].rstrip("\n")
    after = text[insert_at:]
    return f"{before}\n{block}\n{after}"


def main():
    ap = argparse.ArgumentParser(description="Apply cook feedback to recipe markdown.")
    ap.add_argument("--env", choices=["prod", "test"], default="prod",
                    help="Which inbox to apply (default: prod).")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show changes without writing anything.")
    args = ap.parse_args()

    inbox_path = os.path.join(LIBRARY_ROOT, f"feedback-inbox-{args.env}.jsonl")
    applied_path = os.path.join(LIBRARY_ROOT, f"feedback-applied-{args.env}.jsonl")

    entries = load_inbox(inbox_path)
    if not entries:
        print(f"No feedback to apply ({os.path.basename(inbox_path)} is empty).")
        return

    seen = applied_ids(applied_path)
    fresh, dupes = [], 0
    for e in entries:
        if e.get("id") is not None and e.get("id") in seen:
            dupes += 1
            continue
        fresh.append(e)
    if dupes:
        print(f"Skipping {dupes} already-applied entr{'y' if dupes == 1 else 'ies'}.")

    # Group fresh entries by recipe, preserving chronological order.
    by_recipe = {}
    for e in fresh:
        by_recipe.setdefault(e.get("recipeId"), []).append(e)
    for v in by_recipe.values():
        v.sort(key=lambda e: e.get("date", ""))

    applied, skipped = [], []
    for recipe_id, recipe_entries in by_recipe.items():
        path = recipe_path_for(recipe_id) if recipe_id else None
        if not path:
            print(f"  ! no recipe file for '{recipe_id}' — leaving {len(recipe_entries)} entry(ies) in inbox")
            skipped.extend(recipe_entries)
            continue

        with open(path, encoding="utf-8") as f:
            text = f.read()

        text = append_feedback_log(text, [feedback_line(e) for e in recipe_entries])
        text, summary = update_ratings_block(text, recipe_entries)

        rel = os.path.relpath(path, LIBRARY_ROOT)
        n = len(recipe_entries)
        if summary:
            stamp = (f"cook_count {summary['cook_count']}, "
                     f"avg difficulty {summary['avg_difficulty']}/5, "
                     f"~{summary['avg_actual_minutes']} min, liked {summary['liked']}/5")
        else:
            stamp = "(no ratings block found — appended log only)"
        print(f"  {'(dry) ' if args.dry_run else ''}{rel}: +{n} cook{'s' if n != 1 else ''} → {stamp}")

        if not args.dry_run:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
        applied.extend(recipe_entries)

    if args.dry_run:
        print(f"\nDry run: would apply {len(applied)} entr{'y' if len(applied)==1 else 'ies'} "
              f"across {len(by_recipe)} recipe(s). Nothing written.")
        return

    # Archive applied entries and rewrite the inbox with only what we couldn't place.
    if applied:
        with open(applied_path, "a", encoding="utf-8") as f:
            for e in applied:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")
    with open(inbox_path, "w", encoding="utf-8") as f:
        for e in skipped:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"\nApplied {len(applied)} entr{'y' if len(applied)==1 else 'ies'} to "
          f"{len([r for r in by_recipe if recipe_path_for(r)])} recipe(s).")
    if skipped:
        print(f"Left {len(skipped)} unmatched entr{'y' if len(skipped)==1 else 'ies'} in the inbox.")


if __name__ == "__main__":
    main()
