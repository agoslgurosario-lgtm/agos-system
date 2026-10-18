import re
import difflib

# The 12 built-in categories (plus common spellings) so nobody re-creates them
FIXED_WASTE_NAMES = {
    'plastic': 'Plastic', 'food wrapper': 'Food Wrapper', 'paper': 'Paper',
    'cardboard': 'Cardboard', 'glass': 'Glass', 'organic': 'Organic', 'metal': 'Metal',
    'foam': 'Foam', 'clothes': 'Clothes', 'textile': 'Textile', 'textiles': 'Textiles',
    'e-waste': 'E-waste', 'ewaste': 'E-waste', 'sanitary': 'Sanitary', 'hygiene': 'Hygiene',
    'footwear': 'Footwear', 'rubber': 'Rubber', 'medical': 'Medical',
}

NAME_PATTERN = re.compile(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ \-]{1,39}$")


def clean_name(raw):
    """Trim, collapse spaces, validate. Raises ValueError with a user-facing message."""
    name = ' '.join((raw or '').split())
    if not NAME_PATTERN.match(name):
        raise ValueError('Use 2 to 40 letters only (spaces and hyphens are fine, no numbers or symbols).')
    if re.search(r'(.)\1{2,}', name.lower()):
        raise ValueError("That doesn't look like a waste type.")
    return name[0].upper() + name[1:]


def name_key(name):
    return name.lower()


def find_similar(key, custom_by_key):
    """Return the display name of a near-duplicate (typo / plural), else None."""
    pool = {**FIXED_WASTE_NAMES, **custom_by_key}
    match = difflib.get_close_matches(key, list(pool.keys()), n=1, cutoff=0.85)
    return pool[match[0]] if match else None


def find_fixed_match(key):
    """Display name of the built-in category this key duplicates (exact or typo), else None."""
    if key in FIXED_WASTE_NAMES:
        return FIXED_WASTE_NAMES[key]
    match = difflib.get_close_matches(key, list(FIXED_WASTE_NAMES.keys()), n=1, cutoff=0.85)
    return FIXED_WASTE_NAMES[match[0]] if match else None