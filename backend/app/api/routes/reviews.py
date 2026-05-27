"""Performance review generation routes."""
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.db_service import db_service
from app.services.gemini_service import gemini_service
from app.services.developer_service import get_all_developers, get_developer_by_id

router = APIRouter()


class ReviewRequest(BaseModel):
    developer_id: str
    period: str = "Last 30 Days"


@router.post("/generate")
async def generate_review(req: ReviewRequest):
    """Trigger AI performance review generation."""
    dev_info = get_developer_by_id(req.developer_id)
    if not dev_info:
        # Fallback: find by any available
        all_devs  = get_all_developers()
        dev_info  = next((d for d in all_devs if d["id"] == req.developer_id), all_devs[0] if all_devs else {})
    
    resolved_id = dev_info.get("id", req.developer_id)
    dev_name = dev_info.get("name", req.developer_id)

    # Gather historical insights
    insights = await db_service.get_insights(resolved_id)
    for i in insights:
        i.pop("_id", None)

    if not insights:
        # Dynamically build a high-fidelity mock insight snapshot based on their live/simulated GitHub activity!
        from app.github_service import get_real_developer_data
        from datetime import datetime
        from app.models.schemas import AgentInsight, SkillSignal, InvisibleWorkItem, BurnoutLevel
        
        # Look up github username from dev_info, falling back to req.developer_id
        github_username = dev_info.get("github", req.developer_id)
        git_data = await get_real_developer_data(github_username)
        
        mock_insight = {
            "developer_id": resolved_id,
            "productivity_score": git_data.get("productivity_score", 75.0),
            "burnout_score": git_data.get("burnout_score", 45.0),
            "burnout_level": "medium" if git_data.get("burnout_score", 45.0) > 40 else "low",
            "peak_hours": git_data.get("peak_hours", [10, 11, 14]),
            "skills_detected": [
                {"skill": s, "evidence": f"Proficiency in {s} detected in codebase contributions.", "confidence": 0.9, "trajectory": "rising"}
                for s in git_data.get("skills", ["Python", "JavaScript"])
            ],
            "invisible_work": [
                {
                    "category": "pr_review",
                    "description": f"Reviewed peer code additions across {git_data.get('repos_active', 2)} active repositories.",
                    "estimated_hours": git_data.get("invisible_work_hours", 6.0),
                    "impact_score": 8.0
                }
            ],
            "insights": [
                f"Peak collaboration efficiency detected during hours: {', '.join(str(h) for h in git_data.get('peak_hours', [10, 11]))}.",
                f"Contributed active development with {git_data.get('total_commits', 12)} commits in the last 30 days."
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
        
        skills = [SkillSignal(**s) for s in mock_insight["skills_detected"]]
        invisible = [InvisibleWorkItem(**iw) for iw in mock_insight["invisible_work"]]
        
        insight_obj = AgentInsight(
            developer_id=resolved_id,
            productivity_score=mock_insight["productivity_score"],
            burnout_score=mock_insight["burnout_score"],
            burnout_level=BurnoutLevel(mock_insight["burnout_level"]),
            peak_hours=mock_insight["peak_hours"],
            skills_detected=skills,
            invisible_work=invisible,
            insights=mock_insight["insights"],
            raw_gemini_response="dynamic_github_mock_insight"
        )
        
        await db_service.save_insight(insight_obj)
        insights = [mock_insight]

    review = await gemini_service.generate_performance_review(
        developer_name=dev_name,
        insights_history=insights[:6],  # last 6 snapshots
        period=req.period,
    )
    review.developer_id = resolved_id
    review.developer_name = dev_name

    await db_service.save_review(review)
    return review.model_dump(mode="json")


@router.get("/")
async def get_reviews(developer_id: str | None = None):
    reviews = await db_service.get_reviews(developer_id)
    for r in reviews:
        r.pop("_id", None)
    return {"reviews": reviews, "count": len(reviews)}
