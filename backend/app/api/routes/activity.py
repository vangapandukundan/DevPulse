"""Activity data routes."""
from datetime import timedelta
from fastapi import APIRouter
from app.services.mock_data import generate_developer_activity
from app.services.developer_service import get_all_developers, get_developer_by_id

router = APIRouter()


@router.get("/")
async def get_activity(developer_id: str = "dev_001", days: int = 30):
    """Get developer activity (mock or real)."""
    dev_info = get_developer_by_id(developer_id)
    if dev_info and dev_info.get("github"):
        from app.github_service import get_real_developer_data
        from datetime import datetime
        
        github_username = dev_info["github"]
        real_data = await get_real_developer_data(github_username)
        
        # Sort commits chronologically
        def parse_ts(c):
            try:
                ts_str = c["timestamp"].replace("Z", "+00:00")
                return datetime.fromisoformat(ts_str)
            except Exception:
                return datetime.utcnow()
                
        sorted_commits = sorted(real_data["commits"], key=parse_ts)
        
        formatted_commits = []
        for c in sorted_commits:
            try:
                ts_str = c["timestamp"].replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts_str)
                hour = dt.hour
            except Exception:
                hour = 12
                
            formatted_commits.append({
                "sha":           c.get("sha", ""),
                "message":       c.get("message", ""),
                "timestamp":     c.get("timestamp"),
                "additions":     c.get("additions", 0),
                "deletions":     c.get("deletions", 0),
                "files_changed": c.get("files_changed", 0),
                "hour_of_day":   hour,
            })
            
        pr_reviews = []
        for r in real_data.get("invisible_work_items", []):
            pr_reviews.append({
                "pr_id":              r.get("pr_id"),
                "pr_title":           r.get("pr_title"),
                "review_type":        r.get("review_type"),
                "timestamp":          r.get("timestamp"),
                "comments_count":     r.get("comments_count", 0),
                "time_spent_minutes": r.get("time_spent_minutes", 0),
            })
            
        return {
            "developer_id":          dev_info["id"],
            "developer_name":        dev_info["name"],
            "period_start":          (datetime.utcnow() - timedelta(days=days)).isoformat(),
            "period_end":            datetime.utcnow().isoformat(),
            "commits_count":         len(formatted_commits),
            "pr_reviews_count":      len(pr_reviews),
            "issue_comments_count":  0,
            "hours_logged":          real_data.get("invisible_work_hours", 0.0),
            "commits":               formatted_commits,
            "pr_reviews":            pr_reviews,
        }

    # Fallback to mock generation if dev_info is not found or has no github username
    activity = generate_developer_activity(developer_id=developer_id, days=days)

    # Sort commits chronologically
    sorted_commits = sorted(activity.commits, key=lambda c: c.timestamp)

    return {
        "developer_id":          activity.developer_id,
        "developer_name":        activity.developer_name,
        "period_start":          activity.period_start.isoformat(),
        "period_end":            activity.period_end.isoformat(),
        "commits_count":         len(activity.commits),
        "pr_reviews_count":      len(activity.pr_reviews),
        "issue_comments_count":  len(activity.issue_comments),
        "hours_logged":          activity.raw_hours_logged,
        # Return ALL commits for heatmap (as ISO strings for easy parsing)
        "commits": [
            {
                "sha":           c.sha,
                "message":       c.message,
                "timestamp":     c.timestamp.isoformat(),
                "additions":     c.additions,
                "deletions":     c.deletions,
                "files_changed": c.files_changed,
                "hour_of_day":   c.hour_of_day,
            }
            for c in sorted_commits
        ],
        "pr_reviews": [
            {
                "pr_id":              r.pr_id,
                "pr_title":           r.pr_title,
                "review_type":        r.review_type,
                "timestamp":          r.timestamp.isoformat(),
                "comments_count":     r.comments_count,
                "time_spent_minutes": r.time_spent_minutes,
            }
            for r in activity.pr_reviews
        ],
    }


@router.get("/developers")
async def list_developers():
    return {"developers": get_all_developers()}
