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

    from .tasks import send_report_reminders

    scheduler.add_job(
        send_report_reminders,
        trigger=CronTrigger(hour=8, minute=0, timezone='Asia/Manila'),
        id="send_report_reminders",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=6 * 3600,   # still runs if the server was down at 8:00
        replace_existing=True,
    )

    logger.info("Starting reports scheduler...")
    scheduler.start()