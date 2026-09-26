from django.db import migrations

# 'None' (no rain detected, below the Yellow band) is the only
# condition where it's safe to let a node sleep for a long stretch —
# 900s (15 min) gives solar-powered nodes real deep-sleep headroom.
# Yellow/Orange/Red stay short since those are exactly the situations
# where you want frequent readings and don't want a node napping
# through a rising flood.
NEW_INTERVAL_SECONDS = {
    'None': 1800,
}


def bump_none_interval(apps, schema_editor):
    AlertThreshold = apps.get_model('rainfall', 'AlertThreshold')
    for condition, seconds in NEW_INTERVAL_SECONDS.items():
        AlertThreshold.objects.filter(condition=condition).update(
            reading_interval_seconds=seconds
        )


def revert_none_interval(apps, schema_editor):
    AlertThreshold = apps.get_model('rainfall', 'AlertThreshold')
    AlertThreshold.objects.filter(condition='None').update(
        reading_interval_seconds=360
    )


class Migration(migrations.Migration):

    dependencies = [
        ('rainfall', '0007_seed_clear_streak_counts'),
    ]

    operations = [
        migrations.RunPython(bump_none_interval, reverse_code=revert_none_interval),
    ]
