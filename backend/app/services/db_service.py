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
            return [doc async for doc in cursor]
        items = _store.insights
        if developer_id:
            items = [i for i in items if i.get("developer_id") == developer_id]
        return list(reversed(items))[-50:]

    async def get_latest_insight(self, developer_id: str) -> Optional[dict]:
        insights = await self.get_insights(developer_id)
        return insights[0] if insights else None

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
            return [doc async for doc in cursor]
        items = _store.actions
        if developer_id:
            items = [a for a in items if a.get("developer_id") == developer_id]
        return list(reversed(items))[-100:]

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
