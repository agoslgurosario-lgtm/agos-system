from collections import Counter
from datetime import date

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.alerts.models import Alert
from apps.audit_logs.utils import log_action
from apps.barangay.models import Barangay
from apps.users.permissions import IsBarangay, IsAdminOrMENRO

from .models import CanalMonitoringReport, PeriodSubmission
from .periods import (
    period_for, previous_period, recent_periods, report_date,
    period_status, grace_end, period_label,
)
from .views import _snapshot_signatories, _missing_signatory_positions

UNIT_TO_KG = {'kg': 1.0, 'g': 0.001}


def eligible_reports(barangay, period_end):
    """Verified, not yet submitted, dated on or before the end of the period."""
    qs = (CanalMonitoringReport.objects
          .filter(barangay=barangay, status='Verified', submission__isnull=True, is_submitted=False)
          .prefetch_related('node_summaries', 'purok_rows'))
    rows = [r for r in qs if report_date(r) <= period_end]
    rows.sort(key=lambda r: r.date_responded or r.created_at)
    return rows


def unverified_count(barangay, period_end):
    qs = (CanalMonitoringReport.objects.filter(barangay=barangay, is_submitted=False)
          .exclude(status__in=['Verified', 'Submitted', 'Voided']))
    return sum(1 for r in qs if report_date(r) <= period_end)


def compute_totals(reports):
    kg = sum(float(r.waste_collected_amount or 0) * UNIT_TO_KG.get(r.waste_collected_unit, 1.0) for r in reports)
    minutes = [(r.date_responded - r.date_observed).total_seconds() / 60
               for r in reports if r.clog_event_id and r.date_responded and r.date_observed]
    puroks = Counter()
    for r in reports:
        if r.report_scope == 'Barangay':
            puroks.update(str(x.purok) for x in r.purok_rows.all() if x.included)
        elif r.purok:
            puroks[str(r.purok)] += 1
    return {
        'report_count': len(reports),
        'total_waste_kg': round(kg, 2),
        'avg_response_minutes': round(sum(minutes) / len(minutes), 1) if minutes else None,
        'severity_counts': dict(Counter(r.severity for r in reports if r.severity)),
        'purok_counts': dict(puroks),
    }


def purok_label(r):
    if r.report_scope == 'Barangay':
        ps = [str(x.purok) for x in r.purok_rows.all() if x.included]
        return ('Puroks ' + ', '.join(ps)) if ps else 'All puroks'
    return f'Purok {r.purok}' if r.purok else ''


def _report_row(r, start):
    ns = next(iter(r.node_summaries.all()), None)
    return {
        'report_id': r.report_id,
        'purok': r.purok,
        'severity': r.severity,
        'date_observed': r.date_observed,
        'date_responded': r.date_responded,
        'waste_collected_amount': r.waste_collected_amount,
        'waste_collected_unit': r.waste_collected_unit,
        'node_name': ns.node_name if ns else '',
        'from_clog_event': r.clog_event_id is not None,
        'carried_over': report_date(r) < start,
        'purok_label': purok_label(r)
    }


def _parse_period(value):
    try:
        d = date.fromisoformat(str(value))
    except ValueError:
        return None
    start, end, due = period_for(d)
    return (start, end, due) if start == d else None


def _older_pending(barangay, start, today):
    """Older periods that can still be submitted and have verified reports waiting (newest first)."""
    pending = []
    cur = start
    for _ in range(3):
        p_start, p_end, p_due = previous_period(cur)
        cur = p_start
        if PeriodSubmission.objects.filter(barangay=barangay, period_start=p_start).exists():
            continue
        if period_status(p_end, p_due, today, False) == 'Missed':
            break
        if any(report_date(r) >= p_start for r in eligible_reports(barangay, p_end)):
            pending.append(period_label(p_start, p_end))
    return pending


def _build_preview(barangay, start, end, due, today):
    reports = eligible_reports(barangay, end)
    already = PeriodSubmission.objects.filter(barangay=barangay, period_start=start).exists()
    state = period_status(end, due, today, already)
    missing = _missing_signatory_positions(barangay)
    older = [] if (already or state == 'Missed') else _older_pending(barangay, start, today)
    blockers, warnings = [], []
    if already:
        blockers.append('This period was already submitted.')
    if state == 'Missed':
        blockers.append(
            'This period is closed because the deadline of the next period has passed. '
            'Its verified reports will go into your next submission.'
        )
    if not barangay.is_active:
        blockers.append('Your barangay is no longer active.')
    if start > today:
        blockers.append('This period has not started yet.')
    if older:
        blockers.append(f"Submit {older[-1]} first.")     # oldest period first
    if not reports:
        blockers.append('There are no verified reports to submit for this period.')
    if missing:
        blockers.append('Missing signatories: ' + ', '.join(missing) + '. Please contact your administrator.')
    if today < end and not already and state != 'Missed':
        warnings.append("This period hasn't ended yet. Reports dated after today will go into your next submission.")
    late = today > due
    data = {
        'period_start': start, 'period_end': end, 'due_date': due, 'today': today,
        'status': state,
        'grace_end': grace_end(end),
        'would_be_late': late,
        'days_late': (today - due).days if late else 0,
        'already_submitted': already,
        'reports': [_report_row(r, start) for r in reports],
        'totals': compute_totals(reports),
        'signatories': _snapshot_signatories(barangay),
        'unverified_count': unverified_count(barangay, end),
        'blockers': blockers,
        'warnings': warnings,
        'can_submit': not blockers,
    }
    return data, reports


class PeriodSubmissionSerializer(serializers.ModelSerializer):
    barangay_name = serializers.CharField(source='barangay.barangay_name', read_only=True)

    class Meta:
        model = PeriodSubmission
        fields = '__all__'


class PeriodListView(APIView):
    """The current period and the three before it, with where each one stands."""
    permission_classes = [IsBarangay]

    def get(self, request):
        b = request.user.barangay
        today = timezone.localdate()
        subs = {s.period_start: s for s in PeriodSubmission.objects.filter(barangay=b)}
        periods = []
        for start, end, due in recent_periods(4, today):
            sub = subs.get(start)
            state = period_status(end, due, today, sub is not None)
            ready = [] if (sub or state == 'Missed') else [
                r for r in eligible_reports(b, end) if report_date(r) >= start
            ]
            periods.append({
                'period_start': start, 'period_end': end, 'due_date': due,
                'status': state,
                'grace_end': grace_end(end),
                'verified_count': len(ready),
                'submission_id': sub.submission_id if sub else None,
                'is_late': sub.is_late if sub else None,
                'submitted_at': sub.submitted_at if sub else None,
                'can_submit': state in ('Open', 'Overdue') and start <= today,
            })
        return Response({'today': today, 'periods': periods})


class SubmissionPreviewView(APIView):
    """GET ?period=YYYY-MM-DD (the period's first day): what would be submitted. Saves nothing."""
    permission_classes = [IsBarangay]

    def get(self, request):
        parsed = _parse_period(request.query_params.get('period'))
        if not parsed:
            return Response({'detail': 'Choose a valid period.'}, status=400)
        start, end, due = parsed
        data, _ = _build_preview(request.user.barangay, start, end, due, timezone.localdate())
        return Response(data)


class SubmissionsView(APIView):
    permission_classes = [IsBarangay]

    def get(self, request):
        qs = PeriodSubmission.objects.filter(barangay=request.user.barangay).select_related('barangay')
        return Response(PeriodSubmissionSerializer(qs, many=True).data)

    def post(self, request):
        parsed = _parse_period(request.data.get('period_start'))
        if not parsed:
            return Response({'detail': 'Choose a valid period.'}, status=400)
        start, end, due = parsed
        b = request.user.barangay
        today = timezone.localdate()

        with transaction.atomic():
            Barangay.objects.select_for_update().get(pk=b.pk)
            data, reports = _build_preview(b, start, end, due, today)
            if data['blockers']:
                code = 409 if data['already_submitted'] else 400
                return Response({'detail': data['blockers'][0], 'blockers': data['blockers']}, status=code)

            now = timezone.now()
            snapshot = _snapshot_signatories(b)
            sub = PeriodSubmission.objects.create(
                barangay=b, period_start=start, period_end=end, due_date=due,
                submitted_by=request.user, submitted_at=now,
                is_late=today > due, days_late=data['days_late'],
                report_count=len(reports), totals=data['totals'], signatory_snapshot=snapshot,
            )
            for r in reports:
                r.carried_over = report_date(r) < start
                r.is_submitted = True
                r.submitted_at = now
                r.status = 'Submitted'
                r.signatory_snapshot = snapshot
                r.submission = sub
                r.save()
                Alert.objects.create(report=r, alert_type='Report_Submitted')

        log_action(
            user=request.user, action='Submitted Period Report', affected_table='tbl_period_submissions',
            new_value=f"{b.barangay_name}: {start} to {end}, {len(reports)} report(s){' (late)' if sub.is_late else ''}",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(PeriodSubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


class StaffSubmissionSerializer(PeriodSubmissionSerializer):
    submitted_by_name = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()

    def get_submitted_by_name(self, obj):
        u = obj.submitted_by
        return f"{u.first_name} {u.last_name}".strip() if u else ''

    def get_label(self, obj):
        return period_label(obj.period_start, obj.period_end)


class StaffSubmissionListView(APIView):
    """GET /api/canal-reports/period-submissions/  (Admin / MENRO)
    Optional filters: ?barangay=<id>  ?period_start=YYYY-MM-DD  ?late=true|false"""
    permission_classes = [IsAdminOrMENRO]

    def get(self, request):
        qs = PeriodSubmission.objects.select_related('barangay', 'submitted_by')
        p = request.query_params
        if p.get('barangay'):
            qs = qs.filter(barangay_id=p['barangay'])
        if p.get('period_start'):
            try:
                qs = qs.filter(period_start=date.fromisoformat(p['period_start']))
            except ValueError:
                return Response({'detail': 'Invalid period_start.'}, status=400)
        if p.get('late') in ('true', 'false'):
            qs = qs.filter(is_late=(p['late'] == 'true'))
        return Response(StaffSubmissionSerializer(qs, many=True).data)


class StaffSubmissionDetailView(APIView):
    """GET /api/canal-reports/period-submissions/<id>/  (Admin / MENRO)
    The cover page: the submission, its totals, the signatories at the time, and its reports."""
    permission_classes = [IsAdminOrMENRO]

    def get(self, request, submission_id):
        sub = get_object_or_404(
            PeriodSubmission.objects.select_related('barangay', 'submitted_by'),
            submission_id=submission_id,
        )
        reports = CanalMonitoringReport.objects.filter(submission=sub).prefetch_related('node_summaries', 'purok_rows')
        rows = sorted(reports, key=lambda r: r.date_responded or r.created_at)
        data = StaffSubmissionSerializer(sub).data
        data['reports'] = [_report_row(r, sub.period_start) for r in rows]
        return Response(data)