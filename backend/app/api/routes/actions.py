"""Actions routes  view agent-executed actions."""
from fastapi import APIRouter
from app.services.db_service import db_service
from app.services.calendar_store import calendar_store

router = APIRouter()


@router.get("/")
async def get_actions(developer_id: str | None = None):
    actions = await db_service.get_actions(developer_id)
    for a in actions:
        a.pop("_id", None)
    return {"actions": actions, "count": len(actions)}


@router.get("/calendar-events")
async def get_calendar_events():
    """Get all calendar events created by the agent."""
    return {"events": calendar_store.get_events()}
