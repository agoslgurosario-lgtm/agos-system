from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
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

    from .tasks import fetch_all_barangays

    scheduler.add_job(
        fetch_all_barangays,
        trigger=IntervalTrigger(minutes=15),
        id="fetch_rainfall_conditions",
        max_instances=1,
        replace_existing=True,
    )

    logger.info("Starting rainfall scheduler...")
    scheduler.start()