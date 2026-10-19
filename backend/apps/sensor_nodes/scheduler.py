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

    from .tasks import create_node_offline_alerts

    scheduler.add_job(
        create_node_offline_alerts,
        trigger=IntervalTrigger(minutes=2),
        id="create_node_offline_alerts",
        max_instances=1,
        replace_existing=True,
    )

    logger.info("Starting sensor_nodes scheduler...")
    scheduler.start()