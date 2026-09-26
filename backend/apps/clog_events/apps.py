from django.apps import AppConfig


class ClogEventsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clog_events'

    def ready(self):
        import apps.clog_events.signals

        import os
        import sys

        argv0 = os.path.basename(sys.argv[0]) if sys.argv else ''
        is_dev_server = 'runserver' in sys.argv
        is_daphne = 'daphne' in argv0

        if is_dev_server or is_daphne:
            from .scheduler import start
            start()