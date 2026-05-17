"""
APScheduler-based scheduler that runs the DevPulse agent loop
every N minutes (configurable via AGENT_INTERVAL_MINUTES env var).
"""
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.core.config import settings

_scheduler = BackgroundScheduler()


def _run_agent_sync():
    """Sync wrapper to run async agent from APScheduler."""
    from app.agent.agent_loop import agent
    try:
        asyncio.run(agent.run_all_developers())
    except Exception as e:
        print(f"Scheduler error: {e}")


def start_scheduler():
    global _scheduler
    interval = settings.AGENT_INTERVAL_MINUTES

    _scheduler.add_job(
        _run_agent_sync,
        trigger=IntervalTrigger(minutes=interval),
        id="devpulse_agent",
        name="DevPulse Agent Loop",
        replace_existing=True,
    )
    _scheduler.start()
    print(f" Scheduler started  agent runs every {interval} min")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        print(" Scheduler stopped")


def trigger_now():
    """Manually trigger an immediate agent run (for testing)."""
    _scheduler.add_job(
        _run_agent_sync,
        id="devpulse_agent_manual",
        name="DevPulse Manual Trigger",
        replace_existing=True,
    )
    print(" Manual agent trigger queued")
