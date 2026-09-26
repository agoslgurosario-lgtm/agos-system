from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clog_events', '0009_clogevent_responded_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='clogevent',
            name='auto_cleared',
            field=models.BooleanField(default=False),
        ),
    ]