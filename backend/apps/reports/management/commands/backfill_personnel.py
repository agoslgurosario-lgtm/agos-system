from django.core.management.base import BaseCommand

from apps.reports.models import CanalMonitoringReport, BarangayPersonnel
from apps.reports.personnel import parse_personnel, record_personnel


class Command(BaseCommand):
    help = ("One-time: split the old assigned_personnel text of each barangay's reports and "
            "fill that barangay's saved personnel list. Reports themselves are not changed.")

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show counts without saving.')

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        reports = (CanalMonitoringReport.objects.exclude(assigned_personnel__isnull=True)
                   .exclude(assigned_personnel='').exclude(status='Voided')
                   .select_related('barangay').order_by('report_id'))   # oldest first: newest ends up most recent
        added = skipped = 0
        for r in reports:
            names, errors = parse_personnel(r.assigned_personnel)
            skipped += len(errors)
            if dry:
                have = set(BarangayPersonnel.objects.filter(barangay=r.barangay).values_list('name_key', flat=True))
                added += sum(1 for n in names if n.lower() not in have)
                continue
            before = BarangayPersonnel.objects.filter(barangay=r.barangay).count()
            record_personnel(r.barangay, names)
            added += BarangayPersonnel.objects.filter(barangay=r.barangay).count() - before
        verb = 'Would add' if dry else 'Added'
        self.stdout.write(f'{verb} {added} names; skipped {skipped} unusable entries.')
