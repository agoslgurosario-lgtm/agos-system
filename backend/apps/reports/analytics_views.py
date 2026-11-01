import calendar
from collections import Counter, defaultdict
from datetime import date

from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminOrMENRO, IsBarangay

from .models import CanalMonitoringReport, PeriodSubmission
from .periods import period_for, period_label, period_status, recent_periods
from .submission_views import compute_totals

from agos_backend.date_range import get_date_range


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _window(month, period, start=None, end=None):
    """(first day, last day) the filters cover, or None for everything. Raises ValueError if bad.
    A date range (start and/or end) wins over the period and the month."""
    if start or end:
        return start or date(2000, 1, 1), end or timezone.localdate()
    if period and period != 'All':
        s, e, _ = period_for(date.fromisoformat(period))
        return s, e
    if month and month != 'All':
        y, m = (int(x) for x in month.split('-'))
        return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])
    return None


def _in_window(window):
    """A report belongs to the period it was submitted FOR. Older reports with no submission
    fall back to the date they were submitted."""
    if not window:
        return Q()
    lo, hi = window
    return (
        Q(submission__period_start__gte=lo, submission__period_start__lte=hi)
        | Q(submission__isnull=True, submitted_at__date__gte=lo, submitted_at__date__lte=hi)
    )


def _reports(barangay, purok, node, window):
    qs = (
        CanalMonitoringReport.objects
        .filter(is_submitted=True)
        .exclude(status='Voided')
        .filter(_in_window(window))
    )
    if barangay:
        qs = qs.filter(barangay_id=barangay)
    if purok:
        qs = qs.filter(Q(purok=purok) | Q(report_scope='Barangay', purok_rows__purok=purok, purok_rows__included=True))
    if node:
        qs = qs.filter(node_summaries__node_id=node)
    return (
        qs.select_related('barangay', 'submission')
        .prefetch_related('node_summaries', 'purok_rows')
        .distinct()
    )


def _timeliness(barangay, window):
    """On-time vs late submissions per period. Returns (rows for the chart, on_time total, late total)."""
    qs = PeriodSubmission.objects.all()
    if barangay:
        qs = qs.filter(barangay_id=barangay)
    if window:
        qs = qs.filter(period_start__gte=window[0], period_start__lte=window[1])
    rows = defaultdict(lambda: {'on_time': 0, 'late': 0})
    ends = {}
    for s in qs:
        rows[s.period_start]['late' if s.is_late else 'on_time'] += 1
        ends[s.period_start] = s.period_end
    on_time = sum(r['on_time'] for r in rows.values())
    late = sum(r['late'] for r in rows.values())
    chart = [
        {'period_start': p, 'label': period_label(p, ends[p]), **rows[p]}
        for p in sorted(rows)[-12:]
    ]
    return chart, on_time, late


def _acc():
    return {'avgs': [], 'peak': None, 'reports': set()}


def _add(acc, report, s):
    acc['reports'].add(report.report_id)
    if s.avg_clog_pct is not None:
        acc['avgs'].append(float(s.avg_clog_pct))
    if s.peak_clog_pct is not None:
        acc['peak'] = max(acc['peak'] or 0, float(s.peak_clog_pct))


def _fmt(acc):
    return {
        'reports': len(acc['reports']),
        'report_ids': sorted(acc['reports']),
        'avg_clog_pct': round(sum(acc['avgs']) / len(acc['avgs']), 1) if acc['avgs'] else None,
        'peak_clog_pct': round(acc['peak'], 1) if acc['peak'] is not None else None,
    }


def _by_peak(rows):
    return sorted(rows, key=lambda r: (r['peak_clog_pct'] is None, -(r['peak_clog_pct'] or 0)))


def _trend(barangay, purok, node, window, count=6, ranged=False):
    """The last 6 periods up to the selected one, so periods can be compared with each other.
    With a date range it shows the periods inside the range instead (the latest 24 at most)."""
    anchor = min(window[1], timezone.localdate()) if window else timezone.localdate()
    periods = recent_periods(24 if ranged else count, anchor)
    if ranged:
        periods = [p for p in periods if p[1] >= window[0]]   # only periods that touch the range
    rows = []
    for s, e, _ in reversed(periods):
        totals = compute_totals(list(_reports(barangay, purok, node, (s, e))))
        rows.append({
            'period_start': s, 'label': period_label(s, e),
            'reports': totals['report_count'],
            'total_waste_kg': totals['total_waste_kg'],
            'avg_response_minutes': totals['avg_response_minutes'],
        })
    return rows


def _waste_comparison(reports, barangay, purok, node):
    """Detected (the AI's peak estimate per node, added up per report) vs collected (kg).
    Only reports whose nodes have an AI estimate are included, so both bars cover the same reports.
    With a barangay selected it groups by period, otherwise by barangay."""
    by_period = bool(barangay)
    rows = {}
    for r in reports:
        if (purok or node) and r.report_scope == 'Barangay':
            continue   # a weekly report's collected kg covers the whole barangay, not one node or purok
        peaks = [
            s.peak_waste_kg for s in r.node_summaries.all()
            if s.peak_waste_kg is not None
            and not (purok and s.purok != purok)
            and not (node and s.node_id != node)
        ]
        if not peaks:
            continue
        sub = r.submission
        if by_period:
            key = (sub.period_start.isoformat(), period_label(sub.period_start, sub.period_end)) if sub else ('', 'Earlier')
        else:
            key = (str(r.barangay_id), r.barangay.barangay_name)
        row = rows.setdefault(key, {'detected_kg': 0.0, 'collected_kg': 0.0, 'reports': 0})
        row['detected_kg'] += sum(peaks)
        row['collected_kg'] += compute_totals([r])['total_waste_kg']
        row['reports'] += 1
    out = [
        {'key': k[0], 'label': k[1], 'detected_kg': round(v['detected_kg'], 1),
         'collected_kg': round(v['collected_kg'], 1), 'reports': v['reports']}
        for k, v in rows.items()
    ]
    if by_period:
        out.sort(key=lambda x: x['key'])
        return {'group': 'period', 'rows': out[-12:]}
    out.sort(key=lambda x: -x['collected_kg'])
    return {'group': 'barangay', 'rows': out[:15]}


class ReportAnalyticsView(APIView):
    """GET /api/report-analytics/  (Admin / MENRO)
    Filters: ?month=YYYY-MM  ?period=YYYY-MM-DD (period start)  ?barangay=<id>  ?purok=<n>  ?node=<id>"""
    permission_classes = [IsAdminOrMENRO]

    def get(self, request):
        p = request.query_params
        start, end = get_date_range(request)
        ranged = start is not None or end is not None
        try:
            window = _window(p.get('month'), p.get('period'), start, end)
        except ValueError:
            return Response({'detail': 'Invalid month or period.'}, status=400)
        barangay, purok, node = _int(p.get('barangay')), _int(p.get('purok')), _int(p.get('node'))

        reports = list(_reports(barangay, purok, node, window))
        totals = compute_totals(reports)
        timeliness, on_time, late = _timeliness(barangay, window)

        # response time (detected -> responded) per barangay, clog reports only
        minutes, names = defaultdict(list), {}
        for r in reports:
            if r.clog_event_id and r.date_responded and r.date_observed:
                minutes[r.barangay_id].append((r.date_responded - r.date_observed).total_seconds() / 60)
                names[r.barangay_id] = r.barangay.barangay_name
        response = sorted(
            (
                {'barangay_id': b, 'barangay_name': names[b],
                 'avg_response_minutes': round(sum(v) / len(v), 1), 'report_count': len(v)}
                for b, v in minutes.items()
            ),
            key=lambda x: x['avg_response_minutes'],
        )

        # purok and node comparison, from the node summaries saved on each report
        purok_acc, node_acc = defaultdict(_acc), defaultdict(_acc)
        for r in reports:
            for s in r.node_summaries.all():
                if (purok and s.purok != purok) or (node and s.node_id != node):
                    continue
                if s.purok is not None:
                    _add(purok_acc[(r.barangay_id, r.barangay.barangay_name, s.purok)], r, s)
                if s.node_id is not None:
                    _add(node_acc[(s.node_id, s.node_name, r.barangay.barangay_name, s.purok)], r, s)
        purok_comparison = _by_peak([
            {'barangay_id': k[0], 'barangay_name': k[1], 'purok': k[2],
             'label': f"{k[1]} · Purok {k[2]}", **_fmt(a)}
            for k, a in purok_acc.items()
        ])[:15]
        top_nodes = _by_peak([
            {'node_id': k[0], 'node_name': k[1], 'barangay_name': k[2], 'purok': k[3], **_fmt(a)}
            for k, a in node_acc.items()
        ])[:10]

        sources = Counter(r.condition_source for r in reports)
        submissions = on_time + late
        return Response({
            'filters': {'month': p.get('month'), 'period': p.get('period'), 'from': start, 'to': end,
                        'barangay': barangay, 'purok': purok, 'node': node},
            'cards': {
                'report_count': totals['report_count'],
                'total_waste_kg': totals['total_waste_kg'],
                'avg_response_minutes': totals['avg_response_minutes'],
                'submissions': submissions,
                'on_time_rate': round(on_time * 100 / submissions, 1) if submissions else None,
            },
            'response_by_barangay': response,
            'timeliness': timeliness,
            'condition_source': {k: sources.get(k, 0) for k in ('Sensor', 'Manual', 'Mixed')},
            'waste_comparison': _waste_comparison(reports, barangay, purok, node),
            'purok_comparison': purok_comparison,
            'top_nodes': top_nodes,
            'trend': _trend(barangay, purok, node, window, min(max(_int(p.get('periods')) or 6, 1), 24), ranged),
        })


class ReportAnalyticsReportsView(APIView):
    """GET /api/report-analytics/reports/?ids=1,2,3  (Admin / MENRO)
    A short row for each report behind a chart bar, so the page can list and link them."""
    permission_classes = [IsAdminOrMENRO]

    def get(self, request):
        ids = [i for i in (_int(x) for x in (request.query_params.get('ids') or '').split(',')) if i][:50]
        reports = (
            CanalMonitoringReport.objects
            .filter(report_id__in=ids, is_submitted=True)
            .exclude(status='Voided')
            .select_related('barangay', 'submission')
            .order_by('-date_responded')
        )
        return Response([
            {
                'report_id': r.report_id,
                'barangay_name': r.barangay.barangay_name,
                'kind': 'Clog event' if r.clog_event_id else 'Weekly cleanup' if r.report_scope == 'Barangay' else 'Manual report',
                'purok_label': 'Whole barangay' if r.report_scope == 'Barangay' else (f'Purok {r.purok}' if r.purok else '—'),
                'severity': r.severity,
                'date': r.date_responded or r.submitted_at,
                'period_label': period_label(r.submission.period_start, r.submission.period_end) if r.submission else None,
            }
            for r in reports
        ])


def _own_reports(barangay, start, end):
    """A barangay's finished reports for one period: submitted for it, or verified and dated inside it
    (not submitted yet, so the current period shows progress). Drafts and voided reports don't count."""
    return (
        CanalMonitoringReport.objects
        .filter(barangay=barangay)
        .exclude(status='Voided')
        .filter(
            Q(submission__period_start=start)
            | Q(submission__isnull=True, is_submitted=True, submitted_at__date__gte=start, submitted_at__date__lte=end)
            | Q(submission__isnull=True, is_submitted=False, status='Verified',
                date_responded__date__gte=start, date_responded__date__lte=end)
        )
        .prefetch_related('purok_rows')
        .distinct()
    )


def _period_record(barangay, today):
    """On time / late / missed for the barangay's last 6 closed periods. A period nobody submitted
    for counts against it. Periods from before the barangay had any activity are left out."""
    subs = {s.period_start: s for s in PeriodSubmission.objects.filter(barangay=barangay)}
    firsts = []
    if subs:
        firsts.append(min(subs))
    first_report = (
        CanalMonitoringReport.objects.filter(barangay=barangay).exclude(status='Voided')
        .order_by('created_at').values_list('created_at', flat=True).first()
    )
    if first_report:
        firsts.append(period_for(timezone.localtime(first_report).date())[0])
    counts = {'on_time': 0, 'late': 0, 'missed': 0}
    if not firsts:
        return {**counts, 'total': 0}
    since = min(firsts)
    closed = [(s, e, d) for s, e, d in recent_periods(12, today) if d < today and s >= since]
    for s, e, d in closed[:6]:
        sub = subs.get(s)
        if sub:
            counts['late' if sub.is_late else 'on_time'] += 1
        elif period_status(e, d, today, False) == 'Missed':
            counts['missed'] += 1
        else:
            counts['late'] += 1   # past its deadline, still open for a late submission
    return {**counts, 'total': sum(counts.values())}


class BarangaySummaryView(APIView):
    """GET /api/canal-reports/summary/  (Barangay)
    The barangay's own numbers for the current period, the previous one, and the last 6 periods."""
    permission_classes = [IsBarangay]

    def get(self, request):
        barangay = request.user.barangay
        rows = []
        for s, e, _ in recent_periods(6, timezone.localdate()):   # newest first
            totals = compute_totals(list(_own_reports(barangay, s, e)))
            rows.append({
                'period_start': s, 'period_end': e, 'label': period_label(s, e),
                'reports': totals['report_count'],
                'total_waste_kg': totals['total_waste_kg'],
                'avg_response_minutes': totals['avg_response_minutes'],
            })
        return Response({
            'current': rows[0],
            'previous': rows[1],
            'trend': list(reversed(rows)),   # oldest first, for the chart
            'submissions': _period_record(barangay, timezone.localdate()),
        })