from django.core.management.base import BaseCommand
from django.db import transaction

from apps.sensor_nodes.models import NodeAssignmentHistory, SensorNode


class Command(BaseCommand):
    help = "Finds overlapping node assignment history rows. Dry run unless --apply is given."

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Write the fixes.')

    @transaction.atomic
    def handle(self, *args, **options):
        apply = options['apply']
        fixable = 0
        review = 0

        for node in SensorNode.objects.all():
            rows = list(
                NodeAssignmentHistory.objects.filter(node=node).order_by('started_at', 'history_id')
            )
            for prev, nxt in zip(rows, rows[1:]):
                overlaps = prev.ended_at is None or prev.ended_at > nxt.started_at
                if not overlaps:
                    continue

                label = (
                    f"node {node.node_id}: [{prev.history_id}] {prev.barangay_name} "
                    f"{prev.started_at:%Y-%m-%d %H:%M} -> {prev.ended_at or 'open'} overlaps "
                    f"[{nxt.history_id}] {nxt.barangay_name} from {nxt.started_at:%Y-%m-%d %H:%M}"
                )

                # An open row that starts earlier than a closed one can't be trimmed safely.
                if prev.ended_at is None and nxt.ended_at is not None:
                    review += 1
                    self.stdout.write(self.style.WARNING(f"REVIEW  {label}"))
                    continue

                fixable += 1
                self.stdout.write(f"FIX     {label}")
                if apply:
                    prev.ended_at = nxt.started_at
                    if not prev.end_reason:
                        prev.end_reason = 'Reassigned'
                    prev.save(update_fields=['ended_at', 'end_reason'])

        mode = 'fixed' if apply else 'fixable (dry run, nothing written)'
        self.stdout.write(self.style.SUCCESS(f"{fixable} {mode}, {review} need manual review."))