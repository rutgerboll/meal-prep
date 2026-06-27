#!/usr/bin/env python3
"""
Seed builder for the Meal Planning app.
Reads all markdown files and emits seed.json conforming to the spec data model.
Run: python3 build_seed.py  (from the app-build/app/ directory, or adjust BASE_DIR)
"""

import json
import os
import re
import sys
import math
import base64
import subprocess
import tempfile
from datetime import datetime, date

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(SCRIPT_DIR, "..", "..")  # Meal planning/
RECIPES_DIR = os.path.join(BASE_DIR, "recipes")
PLANS_DIR   = os.path.join(BASE_DIR, "meal-plans")
PHOTOS_DIR  = os.path.join(BASE_DIR, "recipe pics")
PANTRY_FILE = os.path.join(BASE_DIR, "pantry.md")
PREFS_FILE  = os.path.join(BASE_DIR, "preferences.md")
UNITS_FILE  = os.path.join(BASE_DIR, "purchase-units.md")

NOW = "2026-06-21T00:00:00Z"

# ── Thumbnail pipeline (macOS `sips`, no Python deps) ─────────────────────────
# Photos are large phone JPEGs (~4 MB each). We resize them to small base64
# thumbnails and bundle them into seed.json so images work fully offline.
# meal-server.py rebuilds the bundle on EVERY sync request, so thumbnails are
# cached by (path, mtime) in .thumb-cache.json — only new/changed photos hit sips.
THUMB_MAX = 256        # longest edge, px
THUMB_QUALITY = 50     # JPEG quality (sips formatOptions)
THUMB_CACHE_PATH = os.path.join(SCRIPT_DIR, ".thumb-cache.json")
_thumb_cache = None
_thumb_made = 0
_thumb_hits = 0


def _load_thumb_cache():
    global _thumb_cache
    if _thumb_cache is None:
        try:
            with open(THUMB_CACHE_PATH, encoding="utf-8") as f:
                _thumb_cache = json.load(f)
        except Exception:
            _thumb_cache = {}
    return _thumb_cache


def save_thumb_cache():
    if _thumb_cache is not None:
        try:
            with open(THUMB_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(_thumb_cache, f)
        except Exception as e:
            warnings.append(f"  WARN: could not write thumbnail cache: {e}")


def make_thumbnail(src_path):
    """Return a base64 data-URI thumbnail for src_path, or None if unavailable."""
    global _thumb_made, _thumb_hits
    if not src_path or not os.path.isfile(src_path):
        return None
    cache = _load_thumb_cache()
    try:
        mtime = int(os.path.getmtime(src_path))
    except OSError:
        return None
    key = f"{os.path.relpath(src_path, BASE_DIR)}|{mtime}|{THUMB_MAX}|{THUMB_QUALITY}"
    if key in cache:
        _thumb_hits += 1
        return cache[key]
    tmp = None
    try:
        fd, tmp = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        subprocess.run(
            ["sips", "-Z", str(THUMB_MAX), "-s", "format", "jpeg",
             "-s", "formatOptions", str(THUMB_QUALITY), src_path, "--out", tmp],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        with open(tmp, "rb") as f:
            data = f.read()
        data_uri = "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
        cache[key] = data_uri
        _thumb_made += 1
        return data_uri
    except FileNotFoundError:
        warnings.append("  WARN: `sips` not found — thumbnails skipped (run on macOS).")
        return None
    except Exception as e:
        warnings.append(f"  WARN: thumbnail failed for {os.path.basename(src_path)}: {e}")
        return None
    finally:
        if tmp and os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass

# ── Aisle re-assignment table (§8) ───────────────────────────────────────────
# Keys are lowercased item names (partial match allowed for broad categories)
PANTRY_AISLE_MAP = {
    # exact / prefix matches first
    "jasmine or basmati rice": "pasta-grains",
    "jasmine rice": "pasta-grains",
    "basmati rice": "pasta-grains",
    "rigatoni": "pasta-grains",
    "rigatoni pasta": "pasta-grains",
    "rigatoni or penne": "pasta-grains",
    "spaghetti": "pasta-grains",
    "egg noodles": "pasta-grains",
    "egg noodles (wide)": "pasta-grains",
    "wide egg noodles": "pasta-grains",
    "pasta": "pasta-grains",
    "penne": "pasta-grains",
    "croutons": "pasta-grains",
    "tortilla chips": "pasta-grains",
    "breadcrumbs": "pasta-grains",
    "crushed tomatoes": "canned",
    "diced tomatoes": "canned",
    "tomato paste": "canned",
    "beef broth": "canned",
    "chicken broth": "canned",
    "black beans": "canned",
    "corn (canned or frozen)": "canned",
    "corn (canned)": "canned",
    "corn (frozen)": "frozen",
    "coconut milk": "canned",
    "marinara sauce": "condiments",
    "kalamata olives": "international",
    "capers": "condiments",
    "olive oil": "spices",
}

# Additional known-pantry items that need aisles
EXTRA_PANTRY_AISLE_MAP = {
    "brown sugar": "spices",
    "cornstarch": "spices",
    "all-purpose flour": "spices",
    "vegetable oil": "spices",
    "sesame oil": "spices",
    "honey": "condiments",
    "soy sauce": "international",
}

def reassign_pantry_aisle(item_name: str) -> tuple:
    """
    Returns (corrected_aisle, was_remapped, warning).
    Only called when aisle == 'pantry'.
    """
    key = item_name.strip().lower()
    if key in PANTRY_AISLE_MAP:
        return PANTRY_AISLE_MAP[key], True, None
    if key in EXTRA_PANTRY_AISLE_MAP:
        return EXTRA_PANTRY_AISLE_MAP[key], True, None
    # Fallback
    return "condiments", True, f"WARN: aisle:pantry item '{item_name}' not in mapping table → defaulted to 'condiments'"

# ── Unit normalization ────────────────────────────────────────────────────────
def normalize_unit(unit_str: str) -> str:
    """Strip qualifier words from unit strings per §5.3."""
    if not unit_str:
        return "each"
    u = unit_str.strip().lower()
    # compound count-with-size → each
    if re.match(r'^(bottle|jar|can|bag|tub|container|packet|block|wedge|bunch|pint|head|knob|pack)\s*\(', u):
        return "each"
    # "cup grated", "cup shredded" etc → cup
    if u.startswith("cup "):
        return "cup"
    # "small bunch" → "bunch"
    if "bunch" in u:
        return "bunch"
    # stalk → each
    if u == "stalk":
        return "each"
    # "bag (small)" → each
    if u.startswith("bag"):
        return "each"
    # "can (10 oz)" etc
    if u.startswith("can"):
        return "can"
    # "bottle (12 oz)" → each
    if u.startswith("bottle"):
        return "each"
    # "jar" variants → each
    if u.startswith("jar"):
        return "each"
    # "pint" → each (for cherry tomatoes purchased as a pint container)
    # leave pint as-is — it's a valid volume unit
    return u

# ── Alias map (§8, seed-time) ────────────────────────────────────────────────
ALIAS_MAP = {
    "jasmine or basmati rice": "jasmine rice",
    "ground beef (85/15)": "ground beef",
    "ground beef (80/20)": "ground beef",
    "corn (canned or frozen)": "corn",
    "corn (frozen)": "corn",
    "corn (canned)": "corn",
    "chicken thighs (boneless)": "chicken thighs",
    "romaine lettuce hearts": "romaine",
    "romaine or iceberg lettuce": "romaine",
    "rigatoni or penne": "rigatoni",
    "rigatoni pasta": "rigatoni",
    "egg noodles (wide)": "egg noodles",
    "wide egg noodles": "egg noodles",
    "thai red or green curry paste": "thai curry paste",
    "thai curry paste": "thai curry paste",
    "bbq sauce": "bbq sauce",
    "red enchilada sauce": "red enchilada sauce",
    "baby spinach": "spinach",
    "shredded mexican cheese blend": "shredded mexican cheese blend",
    "lemons": "lemon",
    "flour tortillas (large)": "flour tortillas",
    "corn tortillas": "corn tortillas",
    "caesar dressing": "caesar dressing",
    "basmati rice": "jasmine rice",
}

# ── YAML frontmatter parser ───────────────────────────────────────────────────
def parse_frontmatter(text: str) -> tuple:
    """
    Returns (frontmatter_dict, body_text).
    Handles YAML-ish frontmatter between --- delimiters.
    """
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', text, re.DOTALL)
    if not m:
        return {}, text
    fm_text = m.group(1)
    body = m.group(2)
    fm = parse_yaml_simple(fm_text)
    return fm, body

def parse_yaml_simple(text: str) -> dict:
    """
    Minimal YAML parser that handles:
    - key: value
    - key: [list, of, items]  (inline)
    - multiline lists with - items
    - nested ingredient objects: { item: "x", qty: 1, unit: lb, aisle: produce }
    - ratings block
    """
    result = {}
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        # Skip comments and blank lines
        if line.strip().startswith('#') or not line.strip():
            i += 1
            continue
        # Key: value line
        m = re.match(r'^(\w[\w_-]*)\s*:\s*(.*)', line)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            if val == '' or val == '|' or val == '>':
                # Multiline or list follows
                # Check if next lines are indented list items
                sub_lines = []
                j = i + 1
                while j < len(lines) and (lines[j].startswith('  ') or lines[j].startswith('\t') or lines[j].strip() == ''):
                    if lines[j].strip():
                        sub_lines.append(lines[j])
                    j += 1
                if sub_lines:
                    # Try to parse as list of objects or simple values
                    parsed_list = []
                    for sl in sub_lines:
                        sl_stripped = sl.strip()
                        if sl_stripped.startswith('-'):
                            item_text = sl_stripped[1:].strip()
                            if item_text.startswith('{'):
                                parsed_list.append(parse_ingredient_obj(item_text))
                            else:
                                # Simple string list item (strip optional quotes)
                                parsed_list.append(item_text.strip().strip('"').strip("'"))
                        else:
                            # sub-key: sub-value (e.g. ratings block)
                            sm = re.match(r'(\w[\w_-]*)\s*:\s*(.*)', sl_stripped)
                            if sm:
                                sk = sm.group(1)
                                sv = sm.group(2).strip()
                                if key not in result:
                                    result[key] = {}
                                if isinstance(result[key], dict):
                                    result[key][sk] = parse_scalar(sv)
                    if parsed_list:
                        result[key] = parsed_list
                    i = j
                    continue
                else:
                    result[key] = None
            elif val.startswith('['):
                # Inline list
                result[key] = parse_inline_list(val)
            elif val.startswith('{'):
                result[key] = parse_ingredient_obj(val)
            else:
                result[key] = parse_scalar(val)
        i += 1
    return result

def parse_scalar(val: str):
    """Parse a scalar YAML value."""
    if val == '' or val is None:
        return None
    if val.lower() in ('true', 'yes'):
        return True
    if val.lower() in ('false', 'no'):
        return False
    if val.startswith('"') and val.endswith('"'):
        return val[1:-1]
    if val.startswith("'") and val.endswith("'"):
        return val[1:-1]
    # Number?
    try:
        if '.' in val:
            return float(val)
        return int(val)
    except (ValueError, TypeError):
        return val

def parse_inline_list(val: str) -> list:
    """Parse [a, b, c] style YAML list."""
    inner = val.strip()
    if inner.startswith('[') and inner.endswith(']'):
        inner = inner[1:-1]
    items = []
    for part in inner.split(','):
        part = part.strip().strip('"').strip("'")
        if part:
            items.append(part)
    return items

def parse_ingredient_obj(text: str) -> dict:
    """
    Parse an ingredient object like:
    { item: "chicken thighs (boneless)", qty: 4.5, unit: lb, aisle: meat, staple: true }
    """
    text = text.strip()
    if text.startswith('{'):
        text = text[1:]
    if text.endswith('}'):
        text = text[:-1]
    result = {}
    # Split by commas, but not commas inside quotes
    parts = re.split(r',\s*(?=\w+\s*:)', text)
    for part in parts:
        m = re.match(r'(\w[\w_-]*)\s*:\s*(.*)', part.strip())
        if m:
            k = m.group(1).strip()
            v = m.group(2).strip().strip('"').strip("'")
            result[k] = parse_scalar(v)
    return result

# ── Body parsers ──────────────────────────────────────────────────────────────
def parse_steps(body: str) -> list:
    """Extract numbered steps from ## Steps section."""
    steps = []
    in_steps = False
    for line in body.split('\n'):
        if re.match(r'^##\s*Steps', line, re.IGNORECASE):
            in_steps = True
            continue
        if in_steps:
            if re.match(r'^##\s', line):
                break  # Next section
            m = re.match(r'^\d+\.\s+(.*)', line)
            if m:
                steps.append(m.group(1).strip())
    return steps

def parse_feedback_log(body: str) -> list:
    """Extract dated feedback entries from ## Feedback log section."""
    entries = []
    in_log = False
    for line in body.split('\n'):
        if re.match(r'^##\s*Feedback log', line, re.IGNORECASE):
            in_log = True
            continue
        if in_log:
            if re.match(r'^##\s', line):
                break
            # Pattern: - 2026-06-23 — ...
            m = re.match(r'^-\s+(\d{4}-\d{2}-\d{2})\s+[—–-]\s+(.*)', line)
            if m:
                entries.append({
                    "date": m.group(1),
                    "text": m.group(2).strip()
                })
    return entries

# ── Aisle validation ──────────────────────────────────────────────────────────
VALID_AISLES = {
    "meat", "produce", "dairy", "refrigerated", "frozen",
    "spices", "international", "canned", "pasta-grains",
    "condiments", "bakery"
}

warnings = []

def process_ingredient(ing: dict, recipe_id: str) -> dict:
    """
    Normalize a raw ingredient dict:
    - Re-assign aisle:pantry
    - Normalize unit
    - Ensure staple is bool
    """
    item = ing.get("item", "")
    qty = ing.get("qty", 0)
    unit = ing.get("unit", "each")
    aisle = ing.get("aisle", "produce")
    staple = ing.get("staple", False)
    note = ing.get("note", None)

    # Coerce types
    if not isinstance(qty, (int, float)):
        try:
            qty = float(qty)
        except (ValueError, TypeError):
            qty = 0

    if not isinstance(staple, bool):
        staple = str(staple).lower() in ('true', 'yes', '1')

    aisle = str(aisle).lower().strip() if aisle else "produce"

    # Re-assign pantry aisle
    if aisle == "pantry":
        new_aisle, _, warn = reassign_pantry_aisle(item)
        if warn:
            warnings.append(f"  [{recipe_id}] {warn}")
        aisle = new_aisle

    if aisle not in VALID_AISLES:
        warnings.append(f"  [{recipe_id}] WARN: unknown aisle '{aisle}' for '{item}' → defaulting to 'condiments'")
        aisle = "condiments"

    # Normalize unit
    unit_str = str(unit).strip() if unit else "each"
    norm_unit = normalize_unit(unit_str)

    result = {
        "item": item,
        "qty": qty,
        "unit": norm_unit,
        "aisle": aisle,
        "staple": staple
    }
    if note:
        result["note"] = note
    return result

# ── Recipe loader ─────────────────────────────────────────────────────────────
def load_recipe(filepath: str) -> dict:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    fm, body = parse_frontmatter(text)

    rid = fm.get("id", os.path.splitext(os.path.basename(filepath))[0])
    title = fm.get("title", rid)
    servings = fm.get("servings", 4)
    time_minutes = fm.get("time_minutes", None)
    tags_raw = fm.get("tags", [])
    tags = tags_raw if isinstance(tags_raw, list) else [str(tags_raw)]
    source = fm.get("source", "generated")
    calories = fm.get("calories_per_serving", None)
    # Handle comment in calories
    if isinstance(calories, str):
        calories = float(re.match(r'[\d.]+', str(calories)).group()) if re.match(r'[\d.]+', str(calories)) else None
    note = fm.get("note", None)
    base_recipe_id = fm.get("base_recipe", None)

    # Derive flags
    is_base = "base" in tags or "neutral" in tags
    is_finish = "finish" in tags or "uses-base" in tags

    # Ratings
    ratings_raw = fm.get("ratings", {})
    if isinstance(ratings_raw, dict):
        def to_num_or_null(v):
            if v is None or v == '' or str(v).strip() == '':
                return None
            try:
                return float(v)
            except (ValueError, TypeError):
                return None
        ratings = {
            "cookCount": int(ratings_raw.get("cook_count", 0) or 0),
            "avgDifficulty": to_num_or_null(ratings_raw.get("avg_difficulty")),
            "avgActualMinutes": to_num_or_null(ratings_raw.get("avg_actual_minutes")),
            "liked": to_num_or_null(ratings_raw.get("liked"))
        }
    else:
        ratings = {"cookCount": 0, "avgDifficulty": None, "avgActualMinutes": None, "liked": None}

    # Ingredients
    raw_ings = fm.get("ingredients", [])
    if not isinstance(raw_ings, list):
        raw_ings = []
    ingredients = [process_ingredient(ing, rid) for ing in raw_ings if isinstance(ing, dict)]

    steps = parse_steps(body)
    feedback_log = parse_feedback_log(body)

    # Prep-ahead metadata (Phase 2 schema) — drives date-aware thaw/prep reminders.
    thaw_raw = fm.get("thaw_hours_ahead", None)
    try:
        thaw_hours = float(thaw_raw) if thaw_raw not in (None, "") else None
    except (ValueError, TypeError):
        thaw_hours = None
    prep_raw = fm.get("prep_ahead", [])
    if isinstance(prep_raw, list):
        prep_ahead = [str(s).strip() for s in prep_raw if str(s).strip()]
    elif prep_raw:
        prep_ahead = [str(prep_raw).strip()]
    else:
        prep_ahead = []

    # Recipe image → bundled base64 thumbnail (filename lives in "recipe pics/").
    image = fm.get("image", None)
    image = str(image).strip() if image else None
    thumbnail = make_thumbnail(os.path.join(PHOTOS_DIR, image)) if image else None
    if image and thumbnail is None:
        warnings.append(f"  [{rid}] WARN: image '{image}' not found in recipe pics/ → no thumbnail")

    recipe = {
        "id": rid,
        "title": title,
        "servings": servings,
        "timeMinutes": time_minutes,
        "tags": tags,
        "source": source,
        "caloriesPerServing": calories,
        "note": note,
        "isBase": is_base,
        "isFinish": is_finish,
        "baseRecipeId": base_recipe_id,
        "ingredients": ingredients,
        "ratings": ratings,
        "steps": steps,
        "feedbackLog": feedback_log,
        "thawHoursAhead": thaw_hours,
        "prepAhead": prep_ahead,
        "image": image,
        "sourcePhotoRef": image,
        "thumbnail": thumbnail,
        "createdAt": NOW,
        "updatedAt": NOW
    }
    return recipe

# ── Day string → dayDate + dayLabel ──────────────────────────────────────────
MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
}

def parse_day_label(day_str: str, plan_year: int = 2026) -> tuple:
    """
    Parse 'Mon Jun 23' or 'Sun Jun 22 (batch cook)' or 'Tue Jul 1' etc.
    Returns (iso_date_str, display_label).
    """
    day_str = day_str.strip()
    # Extract date portion: try pattern like "Mon Jun 23" at the start
    m = re.search(r'\b([A-Za-z]{3})\s+(\d{1,2})\b', day_str)
    if m:
        month_str = m.group(1).lower()
        day_num = int(m.group(2))
        month_num = MONTH_MAP.get(month_str)
        if month_num:
            try:
                d = date(plan_year, month_num, day_num)
                iso = d.isoformat()
                return iso, day_str
            except ValueError:
                pass
    warnings.append(f"  WARN: could not parse day string '{day_str}' → dayDate: null")
    return None, day_str

# ── Meal plan loader ──────────────────────────────────────────────────────────
def load_plan(filepath: str) -> dict:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    fm, body = parse_frontmatter(text)

    filename = os.path.splitext(os.path.basename(filepath))[0]
    label = fm.get("label", filename)
    plan_id = label  # Use the label as the ID (matches filename convention)
    servings_default = fm.get("servings_default", 2)
    note = fm.get("note", None)

    # Determine plan year from id / label
    year_m = re.search(r'(\d{4})', plan_id)
    plan_year = int(year_m.group(1)) if year_m else 2026

    meals_raw = fm.get("meals", [])
    if not isinstance(meals_raw, list):
        meals_raw = []

    entries = []
    for m in meals_raw:
        if not isinstance(m, dict):
            continue
        recipe_id = m.get("recipe", m.get("recipe_id", ""))
        servings = m.get("servings", servings_default)
        if not isinstance(servings, (int, float)):
            try:
                servings = float(servings)
            except (ValueError, TypeError):
                servings = servings_default
        day_str = m.get("day", None)
        meal_slot = m.get("meal", "dinner")

        # Infer meal slot from recipe tags or day label
        if day_str and "batch cook" in str(day_str).lower():
            meal_slot = "batch"
        elif meal_slot not in ("dinner", "lunch", "batch"):
            meal_slot = "dinner"

        if day_str:
            day_date, day_label = parse_day_label(str(day_str), plan_year)
        else:
            day_date, day_label = None, None

        entry = {
            "recipeId": recipe_id,
            "servings": servings,
            "dayDate": day_date,
            "dayLabel": day_label,
            "meal": meal_slot,
            "cooked": False,
            "ruleWarningDismissed": False
        }
        entries.append(entry)

    # Derive kind
    if "two-week" in plan_id or "2week" in plan_id or "two_week" in plan_id:
        kind = "bulk-2week"
    elif "week" in plan_id:
        kind = "weekly"
    else:
        kind = "custom"

    # Current plan is active if it's the 2026-06-22 plan
    is_active = "2026-06-22" in plan_id

    return {
        "id": plan_id,
        "label": label,
        "servingsDefault": servings_default,
        "note": note,
        "entries": entries,
        "kind": kind,
        "isActive": is_active,
        "createdAt": NOW,
        "updatedAt": NOW
    }

# ── Pantry loader ─────────────────────────────────────────────────────────────
def load_pantry(filepath: str) -> dict:
    items = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('- '):
                item = line[2:].strip()
                if item:
                    items.append(item)
    return {"items": items}

# ── Preferences loader ────────────────────────────────────────────────────────
def load_preferences(filepath: str) -> dict:
    # We build this from the known content of preferences.md
    return {
        "householdSize": 2,
        "dinnersPerWeek": 6,
        "calorieTargets": {
            "rutger": 800,
            "wife": 600,
            "pairPerDinner": 1400
        },
        "dislikes": {
            "cilantroOptional": True,
            "noSoupsStews": True,
            "noCutPork": True,
            "sausageOk": True,
            "asianOnlyThai": True
        },
        "allowedCuisines": ["Western", "Mexican", "Mediterranean", "Indian", "Thai"],
        "cookingStyle": "bulk-prep",
        "variety": "balanced",
        "equipment": {
            "have": ["air fryer", "slow cooker"],
            "lack": ["pressure cooker", "instant pot"]
        },
        "store": {
            "name": "Woodman's, Menomonee Falls",
            "aisleOrder": [
                "frozen",
                "dairy",
                "refrigerated",
                "spices",
                "international",
                "canned",
                "pasta-grains",
                "condiments",
                "meat",
                "produce"
            ]
        },
        "unitsSystem": "US",
        "calorieWarnBand": [1200, 1800]
    }

# ── Purchase units loader ─────────────────────────────────────────────────────
def parse_purchase_unit_line(line: str):
    """
    Parse lines like:
    - chicken thighs (boneless): loose by weight → round to nearest 0.5 lb
    - jasmine rice: 2 lb bag
    - coconut milk: 13.5 fl oz can
    - garlic: 1 head (~10 cloves)
    """
    line = line.strip()
    if not line.startswith('- '):
        return None
    line = line[2:].strip()
    # Split on first colon
    colon_idx = line.find(':')
    if colon_idx < 0:
        return None
    item = line[:colon_idx].strip()
    rest = line[colon_idx+1:].strip()

    # Normalize item via alias map
    item_norm = ALIAS_MAP.get(item.lower(), item.lower())

    # "loose by weight → round to nearest X unit"
    m_weight = re.search(r'round to nearest ([\d.]+)\s*(\w+)', rest)
    if m_weight:
        return {
            "item": item,
            "itemNorm": item_norm,
            "mode": "by-weight",
            "packageSize": None,
            "packageUnit": m_weight.group(2),
            "packageLabel": f"~{m_weight.group(1)} {m_weight.group(2)} increments",
            "roundIncrement": float(m_weight.group(1))
        }

    # "N unit label" or "N unit (note)"
    m_pkg = re.match(r'^([\d.]+)\s+([^(]+?)(?:\s*\(.*\))?\s*$', rest)
    if m_pkg:
        size = float(m_pkg.group(1))
        unit_label = m_pkg.group(2).strip()
        return {
            "item": item,
            "itemNorm": item_norm,
            "mode": "package",
            "packageSize": size,
            "packageUnit": unit_label.split()[-1] if unit_label else "each",
            "packageLabel": f"{m_pkg.group(1)} {unit_label}",
            "roundIncrement": None
        }

    return {
        "item": item,
        "itemNorm": item_norm,
        "mode": "package",
        "packageSize": 1,
        "packageUnit": "each",
        "packageLabel": rest,
        "roundIncrement": None
    }

def load_purchase_units(filepath: str) -> list:
    units = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            parsed = parse_purchase_unit_line(line)
            if parsed:
                units.append(parsed)
    return units

# ── Cookbook backlog ──────────────────────────────────────────────────────────
def load_cookbook_backlog(photos_dir: str) -> list:
    photos = []
    if os.path.isdir(photos_dir):
        for fname in sorted(os.listdir(photos_dir)):
            if fname.lower().endswith('.jpeg') or fname.lower().endswith('.jpg'):
                photos.append({
                    "filename": fname,
                    "captureStatus": "not-captured",
                    "recipeId": None,
                    "thumbnail": make_thumbnail(os.path.join(photos_dir, fname))
                })
    return photos

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=== Meal Planning Seed Builder ===\n")

    # Load recipes
    recipes = []
    recipe_ids = set()
    recipe_files = sorted([f for f in os.listdir(RECIPES_DIR) if f.endswith('.md')])
    print(f"Loading {len(recipe_files)} recipe files...")
    for fname in recipe_files:
        path = os.path.join(RECIPES_DIR, fname)
        try:
            r = load_recipe(path)
            recipes.append(r)
            recipe_ids.add(r["id"])
            print(f"  ✓ {r['id']} ({len(r['ingredients'])} ingredients, {len(r['steps'])} steps)")
        except Exception as e:
            print(f"  ✗ ERROR loading {fname}: {e}")
            import traceback; traceback.print_exc()

    # Load meal plans
    plans = []
    plan_files = sorted([f for f in os.listdir(PLANS_DIR) if f.endswith('.md')])
    print(f"\nLoading {len(plan_files)} meal plan files...")
    for fname in plan_files:
        path = os.path.join(PLANS_DIR, fname)
        try:
            p = load_plan(path)
            plans.append(p)
            print(f"  ✓ {p['id']} ({len(p['entries'])} entries, active={p['isActive']})")
        except Exception as e:
            print(f"  ✗ ERROR loading {fname}: {e}")
            import traceback; traceback.print_exc()

    # Load support data
    print("\nLoading pantry, preferences, purchase units...")
    pantry = load_pantry(PANTRY_FILE)
    preferences = load_preferences(PREFS_FILE)
    purchase_units = load_purchase_units(UNITS_FILE)
    cookbook_backlog = load_cookbook_backlog(PHOTOS_DIR)

    print(f"  Pantry: {len(pantry['items'])} staple items")
    print(f"  Purchase units: {len(purchase_units)} entries")
    print(f"  Cookbook backlog: {len(cookbook_backlog)} photos")

    # Validate plan entries reference valid recipe ids
    print("\nValidating plan entries...")
    for plan in plans:
        for entry in plan["entries"]:
            if entry["recipeId"] not in recipe_ids:
                warnings.append(f"  WARN: plan '{plan['id']}' references unknown recipe '{entry['recipeId']}'")

    # Count pantry aisle fixes
    pantry_fixes = sum(1 for w in warnings if "pantry" in w.lower() and "WARN" not in w.lower())

    # Build alias map for seed
    alias_map = {k: v for k, v in ALIAS_MAP.items()}

    # Assemble seed
    seed = {
        "meta": {
            "schemaVersion": 2,
            "generatedAt": NOW,
            "description": "Seed data parsed from Rutger's markdown meal-planning files"
        },
        "preferences": preferences,
        "pantry": pantry,
        "purchaseUnits": purchase_units,
        "aliasMap": alias_map,
        "recipes": recipes,
        "mealPlans": plans,
        "groceryLists": [],
        "cookLog": [],
        "cookbookBacklog": cookbook_backlog
    }

    # Write seed
    out_path = os.path.join(SCRIPT_DIR, "seed.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(seed, f, indent=2, ensure_ascii=False)
    save_thumb_cache()
    print(f"\n✓ Wrote seed.json ({os.path.getsize(out_path):,} bytes)")
    print(f"  Thumbnails: {_thumb_made} generated, {_thumb_hits} from cache")

    # Validation report
    total_ingredients = sum(len(r["ingredients"]) for r in recipes)
    total_plan_entries = sum(len(p["entries"]) for p in plans)
    pantry_aisle_remaining = sum(
        1 for r in recipes
        for ing in r["ingredients"]
        if ing["aisle"] == "pantry"
    )

    print("\n=== VALIDATION REPORT ===")
    print(f"Recipes:          {len(recipes)}")
    print(f"Total ingredients:{total_ingredients}")
    print(f"Meal plans:       {len(plans)}")
    print(f"Plan entries:     {total_plan_entries}")
    print(f"Purchase units:   {len(purchase_units)}")
    print(f"Pantry items:     {len(pantry['items'])}")
    print(f"Cookbook photos:  {len(cookbook_backlog)}")
    print(f"aisle:pantry remaining: {pantry_aisle_remaining}  (should be 0)")

    if warnings:
        print("\n=== WARNINGS ===")
        for w in warnings:
            print(w)
    else:
        print("\nNo warnings.")

    print("\nDone.")

if __name__ == "__main__":
    main()
