import json
from django.core.management.base import BaseCommand, CommandError
from apps.barangay.models import Barangay


class Command(BaseCommand):
    help = "Load barangay outlines from rosario-barangays.json into Barangay.boundary"

    def add_arguments(self, parser):
        parser.add_argument('path', help='Path to rosario-barangays.json')
        parser.add_argument('--force', action='store_true',
                            help='Overwrite boundaries that already exist')

    def handle(self, *args, **opts):
        try:
            with open(opts['path'], encoding='utf-8') as f:
                data = json.load(f)
        except (OSError, ValueError) as e:
            raise CommandError(f'Could not read file: {e}')

        updated = skipped = 0
        missing = []
        for feature in data.get('features', []):
            name = (feature.get('properties') or {}).get('adm4_en')
            b = Barangay.objects.filter(barangay_name=name).first()
            if not b:
                missing.append(name)
                continue
            if b.boundary and not opts['force']:
                skipped += 1
                continue
            b.boundary = feature
            b.save(update_fields=['boundary'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f'{updated} updated, {skipped} skipped'))
        if missing:
            self.stdout.write(self.style.WARNING(f'No DB match for: {missing}'))