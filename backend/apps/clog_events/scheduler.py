from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from django_apscheduler.jobstores import DjangoJobStore
import logging

logger = logging.getLogger(__name__)


def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    from .tasks import auto_clear_stale_clog_events

    scheduler.add_job(
        auto_clear_stale_clog_events,
        trigger=IntervalTrigger(hours=1),
        id="auto_clear_stale_clog_events",
        max_instances=1,
        replace_existing=True,
    )

    logger.info("Starting clog_events scheduler...")
    scheduler.start()