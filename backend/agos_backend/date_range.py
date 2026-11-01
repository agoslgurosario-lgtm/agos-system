from django.db.models import Q
from django.utils.dateparse import parse_date


def _safe_date(value):
    """'YYYY-MM-DD' -> date, or None when it is missing or not a real date."""
    if not value:
        return None
    try:
        return parse_date(value)
    except ValueError:
        return None


def get_date_range(request):
    """
    Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD. Either side can be left out.
    If the dates are the wrong way round they are swapped.
    """
    start = _safe_date(request.query_params.get('from'))
    end = _safe_date(request.query_params.get('to'))
    if start and end and start > end:
        start, end = end, start
    return start, end


def has_date_range(request):
    start, end = get_date_range(request)
    return start is not None or end is not None


def filter_by_date_range(qs, field, request):
    """Keeps rows whose `field` is on or between the two dates (local time, both ends included)."""
    start, end = get_date_range(request)
    if start:
        qs = qs.filter(**{f'{field}__date__gte': start})
    if end:
        qs = qs.filter(**{f'{field}__date__lte': end})
    return qs


def filter_overlapping_date_range(qs, start_field, end_field, request):
    """
    For rows that cover a period (start_field .. end_field). Keeps the rows whose period
    touches the range. A row with no end yet is treated as still running.
    """
    start, end = get_date_range(request)
    if end:
        qs = qs.filter(**{f'{start_field}__date__lte': end})
    if start:
        qs = qs.filter(Q(**{f'{end_field}__isnull': True}) | Q(**{f'{end_field}__date__gte': start}))
    return qs