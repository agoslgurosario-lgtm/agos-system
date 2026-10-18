from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django_apscheduler.jobstores import DjangoJobStore
import logging
import os

logger = logging.getLogger(__name__)


def start():
    if os.getenv('ENABLE_SCHEDULERS', 'true').lower() != 'true':
        logger.info("Scheduler disabled by ENABLE_SCHEDULERS")
        return
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    from .tasks import run_scheduled_backup_check

    scheduler.add_job(
        run_scheduled_backup_check,
        trigger=CronTrigger(hour=1, minute=16),  # runs daily at 2:00 AM
        id="run_scheduled_backup_check",
        max_instances=1,
        replace_existing=True,
    )

    logger.info("Starting backup scheduler...")
    scheduler.start()