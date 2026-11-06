import re
import difflib

from django.db import IntegrityError, transaction
from django.utils import timezone

MAX_STRING = 500   # CanalMonitoringReport.assigned_personnel max_length

# Anything here separates two names. "and" / "at" only count as standalone words,
# so "Andres Santos" or "Atty. Cruz" stay whole.
_PUNCT = re.compile(r"[,;&/+\n\r|]+")
_WORDS = re.compile(r"(?:(?<=\s)|^)(?:and|at)(?=\s|$)", re.IGNORECASE)
_NAME_PATTERN = re.compile(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'’\-]{1,59}$")


def split_names(raw):
    """Split free text into trimmed, de-duplicated candidate names (order kept)."""
    seen, out = set(), []
    pieces = [w for p in _PUNCT.split(raw or '') for w in _WORDS.split(p)]
    for piece in pieces:
        name = ' '.join(piece.split()).strip(' -')
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(name[0].upper() + name[1:])
    return out


def validate_name(name):
    """Return an error message for a bad name, else None."""
    if not _NAME_PATTERN.match(name):
        return (f'"{name}": use 2 to 60 letters only (spaces, hyphens, apostrophes and '
                f'periods are fine, no numbers or symbols).')
    if re.search(r'(.)\1{3,}', name.lower()):
        return f'"{name}" does not look like a name.'
    return None


def parse_personnel(raw):
    """-> (names, errors). names are the valid ones; errors are messages for the bad ones."""
    names, errors = [], []
    for name in split_names(raw):
        err = validate_name(name)
        if err:
            errors.append(err)
        else:
            names.append(name)
    return names, errors


def find_similar(name, known_names):
    """A near-duplicate of `name` among known names (not an exact match), else None."""
    key = name.lower()
    pool = {n.lower(): n for n in known_names}
    if key in pool:
        return None
    match = difflib.get_close_matches(key, list(pool.keys()), n=1, cutoff=0.85)
    return pool[match[0]] if match else None


def join_names(names):
    return ', '.join(names)


def record_personnel(barangay, names, user=None):
    """Save names into the barangay's list (creating new ones, bumping last_used_at).
    Returns the canonical display names, in the order given."""
    from .models import BarangayPersonnel
    now = timezone.now()
    existing = {p.name_key: p for p in BarangayPersonnel.objects.filter(barangay=barangay)}
    result = []
    for name in names:
        key = name.lower()
        obj = existing.get(key)
        if obj is None:
            try:
                with transaction.atomic():
                    obj = BarangayPersonnel.objects.create(
                        barangay=barangay, name=name, name_key=key, created_by=user, last_used_at=now
                    )
            except IntegrityError:   # added at the same moment by someone else
                obj = BarangayPersonnel.objects.get(barangay=barangay, name_key=key)
            existing[key] = obj
        else:
            obj.last_used_at = now
            obj.save(update_fields=['last_used_at'])
        result.append(obj.name)
    return result


def normalize_for_save(barangay, raw, user=None):
    """For a report being saved: split, validate, record, and rebuild the text string.
    Returns (text, error). Blank input gives ('', None)."""
    names, errors = parse_personnel(raw)
    if errors:
        return None, errors[0]
    if not names:
        return '', None
    text = join_names(names)
    if len(text) > MAX_STRING:
        return None, f'Personnel list is too long (max {MAX_STRING} characters).'
    canonical = record_personnel(barangay, names, user)
    return join_names(canonical), None
