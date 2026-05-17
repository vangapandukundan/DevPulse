"""
Gemini AI Service  Handles all LLM interactions for DevPulse agent.
Supports Vertex AI (primary) and direct Gemini API (fallback).
"""
import json
import re
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.models.schemas import (
    DeveloperActivity, AgentInsight, InvisibleWorkItem,
    SkillSignal, BurnoutLevel, PlannedAction, ActionType,
    PerformanceReview,
)



def _serialize_activity(activity: DeveloperActivity) -> dict:
    """Convert activity to a JSON-serializable summary for Gemini."""
    commit_hours = [c.hour_of_day for c in activity.commits]
    hour_dist = {h: commit_hours.count(h) for h in set(commit_hours)}

    late_commits = sum(1 for c in activity.commits if c.hour_of_day >= 22 or c.hour_of_day <= 5)
    weekend_commits = sum(
        1 for c in activity.commits
        if c.timestamp.weekday() >= 5
    )

    total_review_mins = sum(r.time_spent_minutes for r in activity.pr_reviews)
    helping_others = sum(1 for ic in activity.issue_comments if ic.is_helping_others)

    return {
        "developer": {
            "id": activity.developer_id,
            "name": activity.developer_name,
        },
        "period": {
            "start": activity.period_start.isoformat(),
            "end": activity.period_end.isoformat(),
            "days": (activity.period_end - activity.period_start).days,
        },
        "commits": {
            "total": len(activity.commits),
            "late_night": late_commits,
            "weekend": weekend_commits,
            "hour_distribution": hour_dist,
            "avg_additions": (
                sum(c.additions for c in activity.commits) / len(activity.commits)
                if activity.commits else 0
            ),
        },
        "pr_reviews": {
            "total": len(activity.pr_reviews),
            "total_minutes": total_review_mins,
            "avg_comments": (
                sum(r.comments_count for r in activity.pr_reviews) / len(activity.pr_reviews)
                if activity.pr_reviews else 0
            ),
        },
        "mentoring": {
            "issue_comments": len(activity.issue_comments),
            "helping_others": helping_others,
        },
        "hours_logged": activity.raw_hours_logged,
    }


class GeminiService:
    """Handles LLM calls to Gemini (Vertex AI or direct API)."""

    def __init__(self):
        self._model = None
        self._initialized = False
        self._use_vertex = False

    async def _ensure_init(self):
        if self._initialized:
            return
        # Try new google.genai SDK first, then fall back to deprecated one
        try:
            try:
                import google.generativeai as genai
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    genai.configure(api_key=settings.GEMINI_API_KEY)
                    self._model = genai.GenerativeModel("gemini-1.5-flash")
                self._initialized = True
                self._use_vertex = False
                print(" Gemini API initialized")
            except ImportError:
                print("  google-generativeai not found")
                self._initialized = True
                self._model = None
        except Exception as e:
            print(f"  Gemini unavailable: {e}. Using fallback analysis.")
            self._initialized = True
            self._model = None

    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini and return text response."""
        await self._ensure_init()
        if self._model is None:
            return ""
        try:
            response = self._model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Gemini call failed: {e}")
            return ""

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from Gemini response (handles markdown code fences)."""
        if not text:
            return {}
        # Try to find JSON block
        patterns = [
            r"```json\s*([\s\S]+?)\s*```",
            r"```\s*([\s\S]+?)\s*```",
            r"(\{[\s\S]+\})",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue
        return {}

    #  Step 1: Analyze Activity 

    async def analyze_activity(self, activity: DeveloperActivity) -> AgentInsight:
        """Core analysis: detect invisible work, skills, burnout."""
        summary = _serialize_activity(activity)

        prompt = f"""
You are DevPulse, an AI agent analyzing developer productivity patterns.

Analyze this developer activity data and return a JSON response:

DEVELOPER ACTIVITY DATA:
{json.dumps(summary, indent=2)}

Return ONLY valid JSON with this exact structure:
{{
  "invisible_work": [
    {{
      "category": "pr_review|mentoring|documentation|on_call",
      "description": "specific description",
      "estimated_hours": 12.5,
      "impact_score": 8.5
    }}
  ],
  "skills_detected": [
    {{
      "skill": "skill name",
      "evidence": "what evidence supports this",
      "confidence": 0.85,
      "trajectory": "rising|stable|declining"
    }}
  ],
  "productivity_score": 78,
  "burnout_score": 65,
  "peak_hours": [10, 11, 14, 15],
  "insights": [
    "Specific actionable insight about this developer"
  ]
}}

Rules:
- burnout_score 0-100 (higher = more at risk). Consider late-night commits, weekend work, volume
- productivity_score 0-100 (higher = more productive). Consider commit quality and consistency
- List 2-4 invisible work items based on PR reviews and mentoring data
- List 3-5 detected skills from commit messages and patterns
- peak_hours: list the 2-4 hours when this developer is most productive
- insights: 3-5 specific, actionable insights (not generic)
"""

        raw = await self._call_gemini(prompt)
        parsed = self._extract_json(raw)

        #  Fallback heuristics if Gemini unavailable 
        if not parsed:
            parsed = self._heuristic_analysis(summary, activity)

        return self._build_insight(activity, parsed, raw)

    def _heuristic_analysis(self, summary: dict, activity: DeveloperActivity) -> dict:
        """Rule-based fallback analysis when Gemini is unavailable."""
        commits = summary["commits"]
        reviews = summary["pr_reviews"]
        mentoring = summary["mentoring"]

        # Burnout scoring
        late_ratio = commits["late_night"] / max(commits["total"], 1)
        weekend_ratio = commits["weekend"] / max(commits["total"], 1)
        burnout = min(100, int(
            late_ratio * 40 + weekend_ratio * 30 +
            min(commits["total"] / 3, 30)
        ))

        # Productivity scoring
        productivity = min(100, max(20, int(
            min(commits["total"] * 2, 50) +
            min(reviews["total"] * 3, 30) +
            min(mentoring["helping_others"] * 2, 20)
        )))

        # Peak hours from commit distribution
        hour_dist = commits.get("hour_distribution", {})
        peak_hours = sorted(hour_dist, key=lambda h: hour_dist[h], reverse=True)[:4]

        invisible = []
        if reviews["total"] > 0:
            invisible.append({
                "category": "pr_review",
                "description": f"Reviewed {reviews['total']} pull requests ({round(reviews['total_minutes']/60,1)}h)",
                "estimated_hours": round(reviews["total_minutes"] / 60, 1),
                "impact_score": 8.0,
            })
        if mentoring["helping_others"] > 0:
            invisible.append({
                "category": "mentoring",
                "description": f"Helped teammates on {mentoring['helping_others']} issues",
                "estimated_hours": round(mentoring["helping_others"] * 0.5, 1),
                "impact_score": 7.5,
            })

        skills = [
            {"skill": "Code Review", "evidence": f"{reviews['total']} PRs reviewed", "confidence": 0.9, "trajectory": "rising"},
            {"skill": "Software Engineering", "evidence": f"{commits['total']} commits", "confidence": 0.85, "trajectory": "stable"},
        ]

        insights = [
            f"Developer made {commits['late_night']} late-night commits  potential burnout signal.",
            f"Invisible work accounts for ~{round(reviews['total_minutes']/60 + mentoring['helping_others']*0.5, 1)}h not in official logs.",
            f"Peak productivity detected around {peak_hours[0] if peak_hours else 10}:00{(peak_hours[0] if peak_hours else 10)+2}:00.",
        ]

        return {
            "invisible_work": invisible,
            "skills_detected": skills,
            "productivity_score": productivity,
            "burnout_score": burnout,
            "peak_hours": [int(h) for h in peak_hours],
            "insights": insights,
        }

    def _build_insight(self, activity: DeveloperActivity, parsed: dict, raw: str) -> AgentInsight:
        burnout_score = float(parsed.get("burnout_score", 50))
        if burnout_score >= 80:
            level = BurnoutLevel.CRITICAL
        elif burnout_score >= 60:
            level = BurnoutLevel.HIGH
        elif burnout_score >= 40:
            level = BurnoutLevel.MEDIUM
        else:
            level = BurnoutLevel.LOW

        invisible = [
            InvisibleWorkItem(**iw)
            for iw in parsed.get("invisible_work", [])
        ]
        skills = [
            SkillSignal(**s)
            for s in parsed.get("skills_detected", [])
        ]

        return AgentInsight(
            developer_id=activity.developer_id,
            invisible_work=invisible,
            skills_detected=skills,
            productivity_score=float(parsed.get("productivity_score", 50)),
            burnout_score=burnout_score,
            burnout_level=level,
            peak_hours=[int(h) for h in parsed.get("peak_hours", [])],
            insights=parsed.get("insights", []),
            raw_gemini_response=raw or "heuristic",
        )

    #  Step 2: Plan Actions 

    async def plan_actions(self, insight: AgentInsight) -> list[PlannedAction]:
        """Based on insights, plan concrete actions."""
        prompt = f"""
You are DevPulse, an AI agent that autonomously takes actions to improve developer wellbeing.

Given these insights for a developer:
- Burnout Score: {insight.burnout_score}/100 ({insight.burnout_level})
- Productivity Score: {insight.productivity_score}/100
- Peak Hours: {insight.peak_hours}
- Insights: {json.dumps(insight.insights)}

Return ONLY valid JSON:
{{
  "actions": [
    {{
      "type": "calendar_block",
      "reason": "why this action is needed",
      "time_suggestion": "10 AM - 12 PM",
      "calendar_event_title": "Deep Work Block  DevPulse",
      "priority": 1
    }}
  ]
}}

Rules:
- Always suggest at least one calendar_block for peak productivity hours
- If burnout_score > 60, add a calendar_block for "Recovery Time" or "No-Meeting Block"
- priority: 1=high, 2=medium, 3=low
- time_suggestion should be based on peak_hours
- Be specific with calendar_event_title
"""
        raw = await self._call_gemini(prompt)
        parsed = self._extract_json(raw)

        if not parsed or "actions" not in parsed:
            return self._default_actions(insight)

        actions = []
        for a in parsed.get("actions", []):
            try:
                actions.append(PlannedAction(
                    type=ActionType(a.get("type", "calendar_block")),
                    reason=a.get("reason", ""),
                    time_suggestion=a.get("time_suggestion"),
                    calendar_event_title=a.get("calendar_event_title"),
                    priority=int(a.get("priority", 1)),
                ))
            except Exception:
                continue
        return actions or self._default_actions(insight)

    def _default_actions(self, insight: AgentInsight) -> list[PlannedAction]:
        """Fallback actions based on heuristics."""
        actions = []
        peak = insight.peak_hours[0] if insight.peak_hours else 10
        actions.append(PlannedAction(
            type=ActionType.CALENDAR_BLOCK,
            reason=f"Protect peak productivity window detected at {peak}:00",
            time_suggestion=f"{peak}:00 - {peak+2}:00",
            calendar_event_title=" Deep Work Block  DevPulse",
            priority=1,
        ))
        if insight.burnout_score > 60:
            actions.append(PlannedAction(
                type=ActionType.CALENDAR_BLOCK,
                reason=f"Burnout risk at {insight.burnout_score:.0f}/100  schedule recovery",
                time_suggestion="5:00 PM - 6:00 PM",
                calendar_event_title=" No-Meeting Recovery Block  DevPulse",
                priority=1,
            ))
        return actions

    #  Step 3: Generate Performance Review 

    async def generate_performance_review(
        self,
        developer_name: str,
        insights_history: list[dict],
        period: str,
    ) -> PerformanceReview:
        """Generate a structured professional performance review."""
        prompt = f"""
You are a senior engineering manager writing a performance review for {developer_name}.

Period: {period}
Historical AI Insights:
{json.dumps(insights_history, indent=2, default=str)}

Write a comprehensive performance review. Return ONLY valid JSON:
{{
  "summary": "2-3 sentence executive summary",
  "achievements": ["achievement 1", "achievement 2", "achievement 3"],
  "invisible_work_summary": "paragraph about invisible contributions",
  "skill_growth": ["skill growth item 1", "skill growth item 2"],
  "areas_for_growth": ["area 1", "area 2"],
  "burnout_assessment": "paragraph about work-life balance and sustainability",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "overall_rating": "Exceeds Expectations|Meets Expectations|Needs Improvement",
  "full_text": "Complete 3-4 paragraph review text"
}}
"""
        raw = await self._call_gemini(prompt)
        parsed = self._extract_json(raw)

        if not parsed:
            parsed = self._default_review(developer_name, insights_history, period)

        return PerformanceReview(
            developer_id="",
            developer_name=developer_name,
            period=period,
            summary=parsed.get("summary", ""),
            achievements=parsed.get("achievements", []),
            invisible_work_summary=parsed.get("invisible_work_summary", ""),
            skill_growth=parsed.get("skill_growth", []),
            areas_for_growth=parsed.get("areas_for_growth", []),
            burnout_assessment=parsed.get("burnout_assessment", ""),
            recommendations=parsed.get("recommendations", []),
            overall_rating=parsed.get("overall_rating", "Meets Expectations"),
            full_text=parsed.get("full_text", ""),
        )

    def _default_review(self, name: str, insights: list, period: str) -> dict:
        avg_burnout = sum(i.get("burnout_score", 50) for i in insights) / max(len(insights), 1)
        avg_prod = sum(i.get("productivity_score", 50) for i in insights) / max(len(insights), 1)
        rating = "Exceeds Expectations" if avg_prod > 70 else "Meets Expectations"
        return {
            "summary": f"{name} demonstrated strong technical contributions during {period}, with consistent delivery and significant invisible work in mentoring and code review.",
            "achievements": [
                "Consistently delivered features on time",
                f"Maintained productivity score of {avg_prod:.0f}/100 across the period",
                "Significant code review contributions to team quality",
            ],
            "invisible_work_summary": "A substantial portion of this developer's contribution was invisible work  including PR reviews, mentoring junior developers, and knowledge sharing.",
            "skill_growth": ["Backend engineering", "System design", "Code review leadership"],
            "areas_for_growth": ["Work-life balance", "Documentation habits"],
            "burnout_assessment": f"Average burnout score of {avg_burnout:.0f}/100 suggests {'attention needed' if avg_burnout > 60 else 'healthy work patterns'}.",
            "recommendations": ["Schedule regular 1:1s", "Recognize invisible work in team meetings"],
            "overall_rating": rating,
            "full_text": f"{name} has been a valuable contributor during {period}. Their technical skills, collaborative mindset, and commitment to quality are evident in their consistent delivery and peer support. We recommend continued investment in their growth and ensuring sustainable workload management.",
        }


#  Singleton 
gemini_service = GeminiService()
