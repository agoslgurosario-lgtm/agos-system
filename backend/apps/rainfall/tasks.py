import logging
from datetime import datetime
from django.utils import timezone

import requests

from apps.barangay.models import Barangay
from .models import RainfallCondition
from .services import mm_per_hour_to_condition

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _extract_current_hour_index(times, current_hour_str):
    """
    Given a list of hourly ISO timestamps and the current hour string,
    returns the index of the current hour, or the most recent past
    hour if the exact current-hour slot isn't in the response yet.
    """
    if current_hour_str in times:
        return times.index(current_hour_str)

    idx = len(times) - 1
    for i, t in enumerate(times):
        if t <= current_hour_str:
            idx = i
    return idx


def _save_rainfall_from_data(barangay, data, current_hour_str):
    """
    Parses one Open-Meteo hourly response block for a single barangay
    and writes it to RainfallCondition. Raises on malformed data —
    callers are responsible for catching and logging per-barangay so
    one bad entry doesn't stop the rest of a batch from saving.
    """
    times = data['hourly']['time']
    values = data['hourly']['precipitation']

    idx = _extract_current_hour_index(times, current_hour_str)
    mm_per_hour = values[idx]
    condition = mm_per_hour_to_condition(mm_per_hour)

    RainfallCondition.objects.update_or_create(
        barangay=barangay,
        defaults={
            'rainfall_mm_hr': mm_per_hour,
            'condition': condition,
        }
    )
    logger.info(f"Rainfall updated: {barangay.barangay_name} = {mm_per_hour}mm/hr -> {condition}")


def fetch_rainfall_for_barangay(barangay):
    """
    Fetches the current hour's precipitation (mm/hr) for one barangay
    from Open-Meteo and updates its RainfallCondition row.
    Returns True on success, False on any failure (logged, not raised).
    Kept as a standalone single-barangay fetcher for manual/debug use —
    the scheduled job uses the batched fetch_all_barangays() below instead.
    """
    params = {
        'latitude': barangay.latitude,
        'longitude': barangay.longitude,
        'hourly': 'precipitation',
        'forecast_days': 1,
        'timezone': 'Asia/Manila',
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        current_hour_str = timezone.localtime().strftime('%Y-%m-%dT%H:00')
        _save_rainfall_from_data(barangay, data, current_hour_str)
        return True

    except Exception as e:
        logger.error(f"Rainfall fetch failed for {barangay.barangay_name}: {e}")
        return False


def fetch_all_barangays():
    """
    Fetches rainfall for every barangay in a single Open-Meteo request
    using its multi-location support (comma-separated lat/lon lists),
    instead of one request per barangay. This avoids the 429s entirely
    since it's 1 HTTP call per run instead of 33.

    Each barangay's result is saved inside its own try/except so a
    malformed or missing entry for one barangay doesn't stop the rest
    from updating.
    """
    barangays = list(Barangay.objects.all())
    if not barangays:
        return

    lat_str = ",".join(str(b.latitude) for b in barangays)
    lon_str = ",".join(str(b.longitude) for b in barangays)

    params = {
        'latitude': lat_str,
        'longitude': lon_str,
        'hourly': 'precipitation',
        'forecast_days': 1,
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=15)
        response.raise_for_status()
        results = response.json()  # list, one entry per location, same order as input
    except Exception as e:
        logger.error(f"Rainfall batch fetch failed: {e}")
        return

    if len(results) != len(barangays):
        logger.error(
            f"Rainfall batch response size mismatch: sent {len(barangays)} "
            f"locations, got {len(results)} results back."
        )

    current_hour_str = timezone.localtime().strftime('%Y-%m-%dT%H:00')

    for barangay, data in zip(barangays, results):
        try:
            _save_rainfall_from_data(barangay, data, current_hour_str)
        except Exception as e:
            # One barangay's malformed/missing entry shouldn't stop
            # the rest of the batch from saving.
            logger.error(f"Rainfall fetch failed for {barangay.barangay_name}: {e}")