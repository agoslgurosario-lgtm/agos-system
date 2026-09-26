from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sensor_nodes', '0018_systemhealthlog_firmware_version'),
    ]

    operations = [
        migrations.AddField(
            model_name='sensornode',
            name='forced_sleep_until',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='If set to a future time, the node is told to deep-sleep until then, overriding the rainfall-based reading interval.',
            ),
        ),
    ]
