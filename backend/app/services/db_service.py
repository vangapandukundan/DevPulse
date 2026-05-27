"""
Database service layer  MongoDB with in-memory fallback.
All reads/writes go through here.
"""
from datetime import datetime
from typing import Optional
from app.core.database import get_db
from app.models.schemas import (
    AgentInsight, AgentAction, AgentRunLog, PerformanceReview
)


class InMemoryStore:
    """Fallback in-memory store when MongoDB is unavailable."""
    insights: list[dict] = []
    actions: list[dict] = []
    agent_runs: list[dict] = []
    reviews: list[dict] = []


_store = InMemoryStore()


def _to_dict(obj) -> dict:
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    return dict(obj)


class DBService:
    async def save_insight(self, insight: AgentInsight):
        data = _to_dict(insight)
        data["saved_at"] = datetime.utcnow().isoformat()
        db = get_db()
        if db is not None:
            await db.insights.insert_one(data)
        else:
            _store.insights.append(data)

    async def get_insights(self, developer_id: Optional[str] = None) -> list[dict]:
        db = get_db()
        if db is not None:
            query = {"developer_id": developer_id} if developer_id else {}
            cursor = db.insights.find(query).sort("generated_at", -1).limit(50)
            res = [doc async for doc in cursor]
        else:
            items = _store.insights
            if developer_id:
                items = [i for i in items if i.get("developer_id") == developer_id]
            res = list(reversed(items))[-50:]

        if not res and developer_id:
            ins = await self._pre_generate_initial_insight(developer_id)
            if ins:
                res = [ins]
        return res

    async def get_latest_insight(self, developer_id: str) -> Optional[dict]:
        insights = await self.get_insights(developer_id)
        return insights[0] if insights else None

    async def _pre_generate_initial_insight(self, developer_id: str) -> Optional[dict]:
        from app.services.developer_service import get_developer_by_id
        dev_info = get_developer_by_id(developer_id)
        if not dev_info:
            return None
            
        from app.services.mock_data import generate_developer_activity
        from app.models.schemas import AgentInsight, SkillSignal, InvisibleWorkItem, BurnoutLevel
        
        activity = generate_developer_activity(developer_id=developer_id)
        bs = activity.raw_hours_logged * 1.5 + len(activity.commits) * 0.4
        bs = min(100.0, max(15.0, bs))
        level = "low" if bs < 30 else "medium" if bs < 60 else "high" if bs < 85 else "critical"
        
        insight_obj = AgentInsight(
            developer_id=developer_id,
            productivity_score=round(100.0 - bs + (len(activity.pr_reviews) * 2.0), 1),
            burnout_score=round(bs, 1),
            burnout_level=BurnoutLevel(level),
            peak_hours=[10, 11, 14, 15],
            skills_detected=[
                SkillSignal(skill="Python", trajectory="rising", evidence="Active codebase commits.", confidence=0.85),
                SkillSignal(skill="React", trajectory="rising", evidence="Active component integrations.", confidence=0.85)
            ],
            invisible_work=[
                InvisibleWorkItem(
                    category=r.review_type or "code_review",
                    estimated_hours=round(r.time_spent_minutes / 60, 1),
                    impact_score=min(10, max(1, r.comments_count)),
                    description=f"Reviewed pull request: {r.pr_title}"
                )
                for r in activity.pr_reviews[:4]
            ],
            insights=[
                f"Active with {len(activity.commits)} commits across active repositories.",
                "Collaborative code review effort matches standard velocity."
            ],
            raw_gemini_response="pre_generated_fallback"
        )
        
        await self.save_insight(insight_obj)
        data = _to_dict(insight_obj)
        data["saved_at"] = datetime.utcnow().isoformat()
        return data

    async def save_action(self, action: AgentAction):
        data = _to_dict(action)
        data["saved_at"] = datetime.utcnow().isoformat()
        db = get_db()
        if db is not None:
            await db.actions.insert_one(data)
        else:
            _store.actions.append(data)

    async def get_actions(self, developer_id: Optional[str] = None) -> list[dict]:
        db = get_db()
        if db is not None:
            query = {"developer_id": developer_id} if developer_id else {}
            cursor = db.actions.find(query).sort("planned_at", -1).limit(100)
            res = [doc async for doc in cursor]
        else:
            items = _store.actions
            if developer_id:
                items = [a for a in items if a.get("developer_id") == developer_id]
            res = list(reversed(items))[-100:]

        if not res and developer_id:
            actions_list = await self._pre_generate_initial_actions(developer_id)
            if actions_list:
                res = actions_list
        return res

    async def _pre_generate_initial_actions(self, developer_id: str) -> list[dict]:
        from app.services.developer_service import get_developer_by_id
        dev_info = get_developer_by_id(developer_id)
        if not dev_info:
            return []
            
        from app.models.schemas import AgentAction, ActionType, ActionStatus
        from app.services.calendar_store import calendar_store
        
        event_start = datetime.utcnow().replace(hour=14, minute=0, second=0, microsecond=0)
        event_end = datetime.utcnow().replace(hour=17, minute=0, second=0, microsecond=0)
        event_id = f"evt_{developer_id}_focus_block"
        
        cal_event = {
            "event_id": event_id,
            "title": "⚡ Autopilot: Daily Deep Work Focus Block",
            "description": "Declined automatically by DevPulse Autopilot to protect deep-work focus time.",
            "start": event_start.isoformat(),
            "end": event_end.isoformat(),
            "developer_email": dev_info.get("email") or f"{dev_info.get('github')}@devpulse.ai",
            "is_recurring": True,
            "auto_decline": True,
            "mode": "simulated",
            "stored_at": datetime.utcnow().isoformat()
        }
        calendar_store.add_event(cal_event)
        
        action_obj = AgentAction(
            developer_id=developer_id,
            action_type=ActionType.CALENDAR_BLOCK,
            reason="Developer peak productivity is between 2 PM and 5 PM. Scheduled calendar focus time block.",
            status=ActionStatus.EXECUTED,
            planned_at=datetime.utcnow(),
            executed_at=datetime.utcnow(),
            calendar_event_id=event_id,
            explainability="Automatically scheduled recurring deep-work focus block during peak 2 PM - 5 PM hours. Autopilot auto-decline activated.",
            result=cal_event
        )
        
        await self.save_action(action_obj)
        data = _to_dict(action_obj)
        data["saved_at"] = datetime.utcnow().isoformat()
        return [data]

    async def save_agent_run(self, run: AgentRunLog):
        data = _to_dict(run)
        db = get_db()
        if db is not None:
            await db.agent_runs.insert_one(data)
        else:
            _store.agent_runs.append(data)

    async def get_agent_runs(self, developer_id: Optional[str] = None) -> list[dict]:
        db = get_db()
        if db is not None:
            query = {"developer_id": developer_id} if developer_id else {}
            cursor = db.agent_runs.find(query).sort("started_at", -1).limit(20)
            return [doc async for doc in cursor]
        items = _store.agent_runs
        if developer_id:
            items = [r for r in items if r.get("developer_id") == developer_id]
        return list(reversed(items))[-20:]

    async def save_review(self, review: PerformanceReview):
        data = _to_dict(review)
        data["saved_at"] = datetime.utcnow().isoformat()
        db = get_db()
        if db is not None:
            await db.reviews.insert_one(data)
        else:
            _store.reviews.append(data)

    async def get_reviews(self, developer_id: Optional[str] = None) -> list[dict]:
        db = get_db()
        if db is not None:
            query = {"developer_id": developer_id} if developer_id else {}
            cursor = db.reviews.find(query).sort("generated_at", -1).limit(20)
            return [doc async for doc in cursor]
        items = _store.reviews
        if developer_id:
            items = [r for r in items if r.get("developer_id") == developer_id]
        return list(reversed(items))[-20:]


db_service = DBService()
