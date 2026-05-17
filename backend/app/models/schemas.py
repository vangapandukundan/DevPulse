"""Pydantic models for DevPulse entities."""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


#  Enums 

class ActionType(str, Enum):
    CALENDAR_BLOCK = "calendar_block"
    SLACK_NUDGE = "slack_nudge"
    REVIEW_ALERT = "review_alert"
    BURNOUT_FLAG = "burnout_flag"


class ActionStatus(str, Enum):
    PLANNED = "planned"
    EXECUTED = "executed"
    FAILED = "failed"
    SKIPPED = "skipped"


class BurnoutLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


#  Activity Models 

class Commit(BaseModel):
    sha: str
    message: str
    timestamp: datetime
    additions: int
    deletions: int
    files_changed: int
    hour_of_day: int


class PRReview(BaseModel):
    pr_id: str
    pr_title: str
    review_type: str  # approved / changes_requested / commented
    timestamp: datetime
    comments_count: int
    time_spent_minutes: int


class IssueComment(BaseModel):
    issue_id: str
    issue_title: str
    timestamp: datetime
    is_helping_others: bool


class DeveloperActivity(BaseModel):
    developer_id: str
    developer_name: str
    period_start: datetime
    period_end: datetime
    commits: List[Commit] = []
    pr_reviews: List[PRReview] = []
    issue_comments: List[IssueComment] = []
    raw_hours_logged: float = 0.0


#  Insight Models 

class InvisibleWorkItem(BaseModel):
    category: str  # pr_review / mentoring / documentation / code_review
    description: str
    estimated_hours: float
    impact_score: float


class SkillSignal(BaseModel):
    skill: str
    evidence: str
    confidence: float
    trajectory: str  # rising / stable / declining


class AgentInsight(BaseModel):
    id: Optional[str] = None
    developer_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    invisible_work: List[InvisibleWorkItem] = []
    skills_detected: List[SkillSignal] = []
    productivity_score: float = 0.0
    burnout_score: float = 0.0
    burnout_level: BurnoutLevel = BurnoutLevel.LOW
    peak_hours: List[int] = []
    insights: List[str] = []
    raw_gemini_response: Optional[str] = None


#  Action Models 

class PlannedAction(BaseModel):
    type: ActionType
    reason: str
    time_suggestion: Optional[str] = None
    calendar_event_title: Optional[str] = None
    calendar_event_start: Optional[datetime] = None
    calendar_event_end: Optional[datetime] = None
    priority: int = 1  # 1 = high, 3 = low


class AgentAction(BaseModel):
    id: Optional[str] = None
    developer_id: str
    action_type: ActionType
    reason: str
    status: ActionStatus = ActionStatus.PLANNED
    planned_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None
    result: Optional[dict] = None
    calendar_event_id: Optional[str] = None
    explainability: Optional[str] = None


#  Review Models 

class PerformanceReview(BaseModel):
    id: Optional[str] = None
    developer_id: str
    developer_name: str
    period: str  # "Q1 2025" or "Jan-Jun 2025"
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    summary: str = ""
    achievements: List[str] = []
    invisible_work_summary: str = ""
    skill_growth: List[str] = []
    areas_for_growth: List[str] = []
    burnout_assessment: str = ""
    recommendations: List[str] = []
    overall_rating: str = ""
    full_text: str = ""


#  Agent Loop Log 

class AgentRunLog(BaseModel):
    id: Optional[str] = None
    run_id: str
    developer_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    steps: List[dict] = []
    status: str = "running"  # running / completed / failed
    actions_taken: int = 0
    insights_generated: int = 0
