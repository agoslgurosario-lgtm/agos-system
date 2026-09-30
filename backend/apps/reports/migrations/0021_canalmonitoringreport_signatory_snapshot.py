from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0020_remove_reportmedia_clog_event_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='canalmonitoringreport',
            name='signatory_snapshot',
            field=models.JSONField(blank=True, null=True),
        ),
    ]