"""Performance review generation routes."""
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.db_service import db_service
from app.services.gemini_service import gemini_service
from app.services.mock_data import get_all_developers

router = APIRouter()


class ReviewRequest(BaseModel):
    developer_id: str
    period: str = "Last 30 Days"


@router.post("/generate")
async def generate_review(req: ReviewRequest):
    """Trigger AI performance review generation."""
    devs = get_all_developers()
    dev_info = next((d for d in devs if d["id"] == req.developer_id), None)
    dev_name = dev_info["name"] if dev_info else req.developer_id

    # Gather historical insights
    insights = await db_service.get_insights(req.developer_id)
    for i in insights:
        i.pop("_id", None)

    review = await gemini_service.generate_performance_review(
        developer_name=dev_name,
        insights_history=insights[:6],  # last 6 snapshots
        period=req.period,
    )
    review.developer_id = req.developer_id
    review.developer_name = dev_name

    await db_service.save_review(review)
    return review.model_dump(mode="json")


@router.get("/")
async def get_reviews(developer_id: str | None = None):
    reviews = await db_service.get_reviews(developer_id)
    for r in reviews:
        r.pop("_id", None)
    return {"reviews": reviews, "count": len(reviews)}
