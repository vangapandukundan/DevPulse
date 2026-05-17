"""Activity data routes."""
from fastapi import APIRouter
from app.services.mock_data import generate_developer_activity, get_all_developers

router = APIRouter()


@router.get("/")
async def get_activity(developer_id: str = "dev_001", days: int = 30):
    """Get developer activity (mock or real)."""
    activity = generate_developer_activity(developer_id=developer_id, days=days)
    return {
        "developer_id": activity.developer_id,
        "developer_name": activity.developer_name,
        "period_start": activity.period_start.isoformat(),
        "period_end": activity.period_end.isoformat(),
        "commits_count": len(activity.commits),
        "pr_reviews_count": len(activity.pr_reviews),
        "issue_comments_count": len(activity.issue_comments),
        "hours_logged": activity.raw_hours_logged,
        "commits": [c.model_dump(mode="json") for c in activity.commits[:20]],
        "pr_reviews": [r.model_dump(mode="json") for r in activity.pr_reviews[:10]],
    }


@router.get("/developers")
async def list_developers():
    return {"developers": get_all_developers()}
