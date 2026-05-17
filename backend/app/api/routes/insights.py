"""Insights routes."""
from fastapi import APIRouter
from app.services.db_service import db_service

router = APIRouter()


@router.get("/")
async def get_insights(developer_id: str | None = None):
    insights = await db_service.get_insights(developer_id)
    for i in insights:
        i.pop("_id", None)
    return {"insights": insights, "count": len(insights)}


@router.get("/latest/{developer_id}")
async def get_latest_insight(developer_id: str):
    insight = await db_service.get_latest_insight(developer_id)
    if insight:
        insight.pop("_id", None)
    return {"insight": insight}


@router.get("/summary")
async def get_summary():
    """Aggregate summary across all developers."""
    from app.services.mock_data import get_all_developers
    devs = get_all_developers()
    summaries = []
    for dev in devs:
        insight = await db_service.get_latest_insight(dev["id"])
        if insight:
            insight.pop("_id", None)
            summaries.append({
                "developer_id": dev["id"],
                "developer_name": dev["name"],
                "productivity_score": insight.get("productivity_score", 0),
                "burnout_score": insight.get("burnout_score", 0),
                "burnout_level": insight.get("burnout_level", "low"),
                "invisible_work_count": len(insight.get("invisible_work", [])),
                "generated_at": insight.get("generated_at"),
            })
    return {"summary": summaries}
