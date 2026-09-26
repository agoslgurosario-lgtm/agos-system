from django.db import migrations


def seed_history(apps, schema_editor):
    SensorNode = apps.get_model('sensor_nodes', 'SensorNode')
    History = apps.get_model('sensor_nodes', 'NodeAssignmentHistory')

    rows = []
    nodes = SensorNode.objects.filter(
        availability_status='Occupied',
        hotspot__isnull=False,
    ).select_related('hotspot', 'barangay')

    for node in nodes:
        rows.append(History(
            node_id=node.node_id,
            hotspot_id=node.hotspot_id,
            hotspot_name=node.hotspot.name,
            barangay_id=node.barangay_id,
            barangay_name=node.barangay.barangay_name if node.barangay else '',
            started_at=node.installed_at,
            ended_at=None,
            end_reason=None,
        ))

    History.objects.bulk_create(rows)


def unseed_history(apps, schema_editor):
    History = apps.get_model('sensor_nodes', 'NodeAssignmentHistory')
    History.objects.filter(ended_at__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('sensor_nodes', '0020_nodeassignmenthistory'),
    ]

    operations = [
        migrations.RunPython(seed_history, unseed_history),
    ]
