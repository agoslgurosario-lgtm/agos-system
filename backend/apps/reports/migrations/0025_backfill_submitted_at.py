from django.db import migrations


def backfill(apps, schema_editor):
    Report = apps.get_model('reports', 'CanalMonitoringReport')
    Alert = apps.get_model('alerts', 'Alert')

    for report in Report.objects.filter(is_submitted=True, submitted_at__isnull=True):
        alert = (
            Alert.objects
            .filter(report=report, alert_type='Report_Submitted')
            .order_by('timestamp')
            .first()
        )
        report.submitted_at = alert.timestamp if alert else report.created_at
        report.save(update_fields=['submitted_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0024_report_submitted_at'),
        ('alerts', '0013_alert_report_alter_alert_alert_type'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]