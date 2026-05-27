"""
Gemini AI Service — DevPulse Intelligence Engine
=================================================
Uses gemini-2.0-flash for all AI analysis.
Handles: Activity Analysis, Action Planning, Performance Review Generation.
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
    hour_dist = {str(h): commit_hours.count(h) for h in set(commit_hours)}

    late_commits = sum(1 for c in activity.commits if c.hour_of_day >= 22 or c.hour_of_day <= 5)
    weekend_commits = sum(1 for c in activity.commits if c.timestamp.weekday() >= 5)

    total_review_mins = sum(r.time_spent_minutes for r in activity.pr_reviews)
    helping_others = sum(1 for ic in activity.issue_comments if ic.is_helping_others)

    return {
        "developer": {
            "id":   activity.developer_id,
            "name": activity.developer_name,
        },
        "period": {
            "start": activity.period_start.isoformat(),
            "end":   activity.period_end.isoformat(),
            "days":  (activity.period_end - activity.period_start).days,
        },
        "commits": {
            "total":              len(activity.commits),
            "late_night_22_5am": late_commits,
            "weekend":           weekend_commits,
            "hour_distribution": hour_dist,
            "avg_additions":     round(
                sum(c.additions for c in activity.commits) / max(len(activity.commits), 1), 1
            ),
            "sample_messages":  [c.message for c in activity.commits[:10]],
        },
        "pr_reviews": {
            "total":        len(activity.pr_reviews),
            "total_minutes": total_review_mins,
            "avg_comments": round(
                sum(r.comments_count for r in activity.pr_reviews) / max(len(activity.pr_reviews), 1), 1
            ),
        },
        "mentoring": {
            "issue_comments":  len(activity.issue_comments),
            "helping_others": helping_others,
        },
        "hours_logged": activity.raw_hours_logged,
    }


class GeminiService:
    """Handles LLM calls to Gemini 2.0 Flash."""

    def __init__(self):
        self._model = None
        self._initialized = False
        self._model_name = "gemini-2.0-flash"

    async def _ensure_init(self):
        if self._initialized:
            return
        try:
            import google.generativeai as genai
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self._model = genai.GenerativeModel(self._model_name)
            self._initialized = True
            print(f"[Gemini] {self._model_name} initialized")
        except ImportError:
            try:
                # Try newer google-genai SDK
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self._model = client.models
                self._initialized = True
                self._use_new_sdk = True
                print(f"[Gemini] (new SDK) {self._model_name} initialized")
            except Exception as e:
                print(f"[Gemini] Gemini unavailable: {e}. Using fallback heuristics.")
                self._initialized = True
                self._model = None
        except Exception as e:
            print(f"[Gemini] Gemini init error: {e}. Using fallback heuristics.")
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
        # Try entire text as JSON
        try:
            return json.loads(text.strip())
        except Exception:
            return {}

    # ─── Step 1: Analyze Activity ─────────────────────────────────────────

    async def analyze_activity(self, activity: DeveloperActivity) -> AgentInsight:
        """Core analysis: detect invisible work, skills, burnout."""
        summary = _serialize_activity(activity)

        prompt = f"""You are DevPulse AI, an expert developer productivity analyst powered by Gemini 2.0 Flash.

Analyze this developer's activity data for the past {summary['period']['days']} days.
Developer: {summary['developer']['name']} ({summary['developer']['id']})

ACTIVITY DATA:
{json.dumps(summary, indent=2)}

Based on this data, perform a comprehensive analysis. Return ONLY valid JSON with this exact structure:
{{
  "invisible_work": [
    {{
      "category": "pr_review|mentoring|documentation|on_call|debugging|knowledge_sharing",
      "description": "specific, detailed description of this invisible contribution",
      "estimated_hours": 12.5,
      "impact_score": 8.5
    }}
  ],
  "skills_detected": [
    {{
      "skill": "exact skill name (e.g. React, Python, System Design)",
      "evidence": "specific evidence from commit messages or activity",
      "confidence": 0.85,
      "trajectory": "rising|stable|declining"
    }}
  ],
  "productivity_score": 78,
  "burnout_score": 65,
  "peak_hours": [10, 11, 14],
  "insights": [
    "Specific, actionable, data-driven insight about this developer"
  ]
}}

Analysis rules:
- burnout_score: 0-100 (higher = more burnout risk). Weight: late-night commits 35%, weekend work 25%, commit volume 20%, review overload 20%
- productivity_score: 0-100. Weight: commit consistency 30%, PR reviews 25%, mentoring 20%, code quality signals 25%
- Identify 2-5 invisible work items. Be specific about categories and hours
- Detect 3-6 skills from commit messages. Look for frameworks, languages, patterns
- peak_hours: 2-4 most productive hours (0-23 format)
- insights: 4-6 highly specific, non-generic insights referencing actual numbers
- If late_night_22_5am > 5 commits, flag burnout risk prominently
- If weekend commits > 10% of total, note work-life balance concern"""

        raw    = await self._call_gemini(prompt)
        parsed = self._extract_json(raw)

        if not parsed:
            print("[Gemini] Gemini returned empty response, using heuristic fallback")
            parsed = self._heuristic_analysis(summary, activity)

        return self._build_insight(activity, parsed, raw)

    def _heuristic_analysis(self, summary: dict, activity: DeveloperActivity) -> dict:
        """Rule-based fallback analysis when Gemini is unavailable."""
        commits  = summary["commits"]
        reviews  = summary["pr_reviews"]
        mentoring = summary["mentoring"]

        late_ratio    = commits["late_night_22_5am"] / max(commits["total"], 1)
        weekend_ratio = commits["weekend"] / max(commits["total"], 1)

        burnout = min(100, int(
            late_ratio * 40 + weekend_ratio * 30 +
            min(commits["total"] / 4, 30)
        ))

        productivity = min(100, max(20, int(
            min(commits["total"] * 2, 50) +
            min(reviews["total"] * 3, 30) +
            min(mentoring["helping_others"] * 2, 20)
        )))

        hour_dist = commits.get("hour_distribution", {})
        sorted_hours = sorted(hour_dist, key=lambda h: hour_dist[h], reverse=True)
        peak_hours = [int(h) for h in sorted_hours[:4]]

        invisible = []
        if reviews["total"] > 0:
            invisible.append({
                "category":        "pr_review",
                "description":     f"Reviewed {reviews['total']} pull requests, spending approximately {round(reviews['total_minutes']/60, 1)} hours on code quality assurance",
                "estimated_hours": round(reviews["total_minutes"] / 60, 1),
                "impact_score":    8.0,
            })
        if mentoring["helping_others"] > 0:
            invisible.append({
                "category":        "mentoring",
                "description":     f"Actively helped {mentoring['helping_others']} teammates on issues, boosting team velocity",
                "estimated_hours": round(mentoring["helping_others"] * 0.5, 1),
                "impact_score":    7.5,
            })

        skills = [
            {"skill": "Code Review", "evidence": f"{reviews['total']} PRs reviewed with detailed feedback", "confidence": 0.9, "trajectory": "rising"},
            {"skill": "Software Engineering", "evidence": f"{commits['total']} commits over the period", "confidence": 0.85, "trajectory": "stable"},
        ]

        insights = [
            f"Developer made {commits['late_night_22_5am']} late-night commits — potential burnout signal requiring attention.",
            f"Invisible work accounts for ~{round(reviews['total_minutes']/60 + mentoring['helping_others']*0.5, 1)} hours not reflected in official metrics.",
            f"Peak productivity detected between {peak_hours[0] if peak_hours else 10}:00—{(peak_hours[0] if peak_hours else 10)+2}:00.",
            f"PR review contributions ({reviews['total']} reviews) demonstrate strong team collaboration and code quality focus.",
        ]

        return {
            "invisible_work":    invisible,
            "skills_detected":   skills,
            "productivity_score": productivity,
            "burnout_score":     burnout,
            "peak_hours":        peak_hours,
            "insights":          insights,
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

        invisible = []
        for iw in parsed.get("invisible_work", []):
            try:
                invisible.append(InvisibleWorkItem(**iw))
            except Exception:
                continue

        skills = []
        for s in parsed.get("skills_detected", []):
            try:
                skills.append(SkillSignal(**s))
            except Exception:
                continue

        return AgentInsight(
            developer_id        = activity.developer_id,
            invisible_work      = invisible,
            skills_detected     = skills,
            productivity_score  = float(parsed.get("productivity_score", 50)),
            burnout_score       = burnout_score,
            burnout_level       = level,
            peak_hours          = [int(h) for h in parsed.get("peak_hours", [])],
            insights            = parsed.get("insights", []),
            raw_gemini_response = raw or "heuristic_fallback",
        )

    # ─── Step 2: Plan Actions ─────────────────────────────────────────────

    async def plan_actions(self, insight: AgentInsight) -> list[PlannedAction]:
        """Based on insights, plan concrete actions."""
        prompt = f"""You are DevPulse AI agent. Based on developer insights, decide what autonomous actions to take.

Developer Analysis:
- Burnout Score: {insight.burnout_score:.0f}/100 (level: {insight.burnout_level})
- Productivity Score: {insight.productivity_score:.0f}/100
- Peak Productive Hours: {insight.peak_hours}
- Key Insights: {json.dumps(insight.insights[:3])}

Plan specific calendar actions to protect this developer's wellbeing and productivity.
Return ONLY valid JSON:
{{
  "actions": [
    {{
      "type": "calendar_block",
      "reason": "specific reason referencing actual data",
      "time_suggestion": "10 AM - 12 PM",
      "calendar_event_title": "⚡ Deep Work Block — DevPulse",
      "priority": 1
    }}
  ]
}}

Rules:
- Always create at least 1 calendar_block for peak productivity hours
- If burnout_score > 60, add a "🔋 Recovery Time" or "🚫 No-Meeting Block"  
- If burnout_score > 80, add an urgent "⚠️ Burnout Prevention Block"
- Use peak_hours to determine the best time slots
- priority 1 = critical, 2 = high, 3 = medium
- Be specific in calendar_event_title (not generic)"""

        raw    = await self._call_gemini(prompt)
        parsed = self._extract_json(raw)

        if not parsed or "actions" not in parsed:
            return self._default_actions(insight)

        actions = []
        for a in parsed.get("actions", []):
            try:
                actions.append(PlannedAction(
                    type                 = ActionType(a.get("type", "calendar_block")),
                    reason               = a.get("reason", ""),
                    time_suggestion      = a.get("time_suggestion"),
                    calendar_event_title = a.get("calendar_event_title"),
                    priority             = int(a.get("priority", 1)),
                ))
            except Exception:
                continue

        return actions or self._default_actions(insight)

    def _default_actions(self, insight: AgentInsight) -> list[PlannedAction]:
        """Fallback actions based on heuristics."""
        actions = []
        peak = insight.peak_hours[0] if insight.peak_hours else 10
        actions.append(PlannedAction(
            type                 = ActionType.CALENDAR_BLOCK,
            reason               = f"Protect peak productivity window at {peak}:00 — {peak+2}:00 based on commit pattern analysis",
            time_suggestion      = f"{peak}:00 AM - {peak+2}:00 AM",
            calendar_event_title = f"⚡ Deep Work Block — DevPulse",
            priority             = 1,
        ))
        if insight.burnout_score > 60:
            actions.append(PlannedAction(
                type                 = ActionType.CALENDAR_BLOCK,
                reason               = f"Burnout risk at {insight.burnout_score:.0f}/100 — schedule recovery time",
                time_suggestion      = "5:00 PM - 6:00 PM",
                calendar_event_title = "🔋 No-Meeting Recovery Block — DevPulse",
                priority             = 1,
            ))
        if insight.burnout_score > 80:
            actions.append(PlannedAction(
                type                 = ActionType.CALENDAR_BLOCK,
                reason               = f"CRITICAL burnout score {insight.burnout_score:.0f}/100 — immediate intervention required",
                time_suggestion      = "12:00 PM - 1:00 PM",
                calendar_event_title = "⚠️ Burnout Prevention Block — DevPulse",
                priority             = 1,
            ))
        return actions

    # ─── Step 3: Performance Review ───────────────────────────────────────

    async def generate_performance_review(
        self,
        developer_name: str,
        insights_history: list[dict],
        period: str,
    ) -> PerformanceReview:
        """Generate a structured professional performance review."""
        avg_burnout = sum(i.get("burnout_score", 50) for i in insights_history) / max(len(insights_history), 1)
        avg_prod    = sum(i.get("productivity_score", 50) for i in insights_history) / max(len(insights_history), 1)

        # Collect all skills and invisible work across history
        all_skills       = []
        all_invisible    = []
        all_insights_txt = []
        for insight in insights_history:
            for s in insight.get("skills_detected", []):
                all_skills.append(s.get("skill", ""))
            for iw in insight.get("invisible_work", []):
                all_invisible.append(iw)
            all_insights_txt.extend(insight.get("insights", []))

        prompt = f"""You are a senior engineering manager writing a comprehensive, authentic performance review.

Developer: {developer_name}
Review Period: {period}
Data points collected: {len(insights_history)} agent analysis runs

Performance Metrics:
- Average Productivity Score: {avg_prod:.1f}/100
- Average Burnout Score: {avg_burnout:.1f}/100
- Top Skills Detected: {list(set(all_skills))[:8]}
- Invisible Work Summary: {json.dumps(all_invisible[:6], default=str)}
- Key AI Insights from Analysis: {json.dumps(all_insights_txt[:8])}

Write a professional, data-driven performance review. Return ONLY valid JSON:
{{
  "summary": "2-3 sentence executive summary referencing specific metrics",
  "achievements": [
    "Specific achievement with numbers/data",
    "Achievement 2",
    "Achievement 3",
    "Achievement 4"
  ],
  "invisible_work_summary": "2-3 sentence paragraph specifically about unrecognized contributions that weren't captured in standard metrics",
  "skill_growth": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
  "areas_for_growth": ["Specific area 1", "Specific area 2"],
  "burnout_assessment": "2-sentence assessment of work-life balance and sustainability based on the burnout score of {avg_burnout:.0f}/100",
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Recommendation 3"],
  "overall_rating": "Exceeds Expectations|Meets Expectations|Needs Improvement",
  "full_text": "Complete 4-5 paragraph review text in professional HR style"
}}

Important: Be specific, data-driven, and authentic. Reference actual metrics where possible."""

        raw    = await self._call_gemini(prompt)
        parsed = self._extract_json(raw)

        if not parsed:
            parsed = self._default_review(developer_name, insights_history, period)

        return PerformanceReview(
            developer_id             = "",
            developer_name           = developer_name,
            period                   = period,
            summary                  = parsed.get("summary", ""),
            achievements             = parsed.get("achievements", []),
            invisible_work_summary   = parsed.get("invisible_work_summary", ""),
            skill_growth             = parsed.get("skill_growth", []),
            areas_for_growth         = parsed.get("areas_for_growth", []),
            burnout_assessment       = parsed.get("burnout_assessment", ""),
            recommendations          = parsed.get("recommendations", []),
            overall_rating           = parsed.get("overall_rating", "Meets Expectations"),
            full_text                = parsed.get("full_text", ""),
        )

    def _default_review(self, name: str, insights: list, period: str) -> dict:
        avg_burnout = sum(i.get("burnout_score", 50) for i in insights) / max(len(insights), 1)
        avg_prod    = sum(i.get("productivity_score", 50) for i in insights) / max(len(insights), 1)
        rating      = "Exceeds Expectations" if avg_prod > 75 else "Needs Improvement" if avg_prod < 40 else "Meets Expectations"

        # Dynamic Skills Extraction
        skills = []
        for i in insights:
            for s in i.get("skills_detected", []):
                if isinstance(s, dict) and s.get("skill"):
                    skills.append(s["skill"])
                elif isinstance(s, str):
                    skills.append(s)
        skills = list(set(skills))
        if not skills:
            skills = ["Backend Engineering", "System Design", "Git", "Code Reviews"]

        # Dynamic Invisible Work Extraction
        invisible_items = []
        for i in insights:
            for iw in i.get("invisible_work", []):
                if isinstance(iw, dict) and iw.get("description"):
                    invisible_items.append(iw["description"])
                elif isinstance(iw, str):
                    invisible_items.append(iw)

        inv_note = ""
        if invisible_items:
            cleaned = [
                item.replace("Reviewed pull request: ", "")
                    .replace("Reviewed peer code additions across ", "reviewed code across ")
                for item in invisible_items[:2]
            ]
            inv_note = " Beyond writing code, " + name.split()[0] + " also " + " and ".join(cleaned) + "."

        first = name.split()[0]
        pace_note = (
            f"{first} has been working at a high intensity this cycle, with some late-night and weekend commits showing up in the data. "
            "That level of commitment is appreciated, but it's worth making sure the workload stays manageable going forward."
            if avg_burnout > 55 else
            f"{first} has kept a steady pace throughout the cycle with no signs of overwork in the data. "
            "The commit timing and frequency suggest a healthy, sustainable working rhythm."
        )

        return {
            "summary": (
                f"{name} had a solid {period}. Productivity came in at {avg_prod:.0f}/100, "
                f"with consistent output across commits, code reviews, and team collaboration. "
                f"{'Overall a strong cycle.' if avg_prod > 75 else 'There is room to build on this going forward.' if avg_prod < 50 else 'A dependable contributor throughout.'}"
            ),
            "achievements": [
                f"Productivity score of {avg_prod:.0f}/100 — {'above team average' if avg_prod > 70 else 'within expected range'}.",
                f"Maintained active commit history with regular, incremental contributions.",
                f"Participated in peer code reviews, helping keep team code quality high.",
                f"Navigated workload pressure with a burnout risk of {avg_burnout:.0f}/100 — {'manageable' if avg_burnout < 60 else 'worth monitoring'}.",
            ],
            "invisible_work_summary": (
                f"Not all of {name}'s contributions show up in commit counts.{inv_note} "
                f"Time spent reviewing teammates' code, answering questions, and helping unblock others adds real value "
                f"that traditional metrics tend to miss. This review takes that into account."
            ),
            "skill_growth": skills[:6],
            "areas_for_growth": [
                "Spreading work more evenly across the day to avoid late-night crunch sessions",
                "Expanding test coverage alongside new feature work",
            ],
            "burnout_assessment": pace_note,
            "recommendations": [
                f"Protect peak productivity hours with a recurring focus block on the calendar.",
                "Keep investing in peer reviews — it raises the entire team's code quality.",
                "Schedule a quick check-in at the start of each sprint to catch blockers early.",
            ],
            "overall_rating": rating,
            "full_text": (
                f"{name} — {period} Performance Review\n\n"
                f"{name} put in solid work this cycle. With a productivity score of {avg_prod:.0f}/100, "
                f"the output has been consistent and the code quality has held up well under the demands of the sprint. "
                f"{'This is a strong result and reflects real effort.' if avg_prod > 70 else 'There is a clear foundation to build on here.'}\n\n"
                f"{pace_note}\n\n"
                f"One thing worth calling out: {name} contributed more than the commit log shows.{inv_note} "
                f"That kind of work keeps the team moving and deserves recognition alongside the code itself.\n\n"
                f"Top skills this cycle: {', '.join(skills[:4])}.\n\n"
                f"Looking ahead, the main focus should be on protecting focused work time and keeping the "
                f"pace sustainable. Overall rating for this period: {rating}."
            ),
        }


# ─── Singleton ─────────────────────────────────────────────────────────────
gemini_service = GeminiService()
