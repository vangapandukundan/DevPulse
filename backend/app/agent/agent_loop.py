"""
DevPulse Agent Loop
===================
The core autonomous agent that:
  Step 1: Collect REAL activity data from GitHub Service
  Step 2: Analyze with Gemini (detect invisible work, burnout, skills)
  Step 3: Auto-schedule Google Calendar blocks
  Step 4: Store results in MongoDB
"""
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from app.models.schemas import (
    AgentRunLog, AgentAction, AgentInsight,
    ActionType, ActionStatus, BurnoutLevel,
    InvisibleWorkItem, SkillSignal
)
from app.services.developer_service import get_developer_by_id, get_all_developers
from app.services.gemini_service import gemini_service
from app.services.db_service import db_service
from app.github_service import get_real_developer_data
from app.mcp.calendar_tool import create_calendar_event
from app.core.console import console


class DevPulseAgent:
    """Autonomous multi-step AI agent for developer intelligence using real-time data."""

    def __init__(self):
        self.is_running = False
        self.run_history: List[AgentRunLog] = []

    async def run_for_developer(
        self,
        developer_id: str,
        days: int = 30,
        force: bool = False,
    ) -> AgentRunLog:
        """
        Full agent loop for a single developer.
        Fetches real GitHub data, runs Gemini analysis, handles Google Calendar blocks, and saves logs.
        """
        run_id = uuid.uuid4().hex[:8]
        log = AgentRunLog(
            run_id=run_id,
            developer_id=developer_id,
            started_at=datetime.utcnow(),
            steps=[],
        )

        console.rule(f" Agent Run {run_id} — Developer: {developer_id}")

        try:
            # Look up developer profile to resolve GitHub username and email
            dev_profile = get_developer_by_id(developer_id)
            github_username = dev_profile.get("github") if dev_profile else developer_id
            if not github_username:
                github_username = developer_id

            # ─── STEP 1: Collect REAL Activity Data ────────────────────────
            self._log_step(log, "collect_activity", "started",
                           f"Fetching real GitHub data for '{github_username}' (last {days} days)")

            real_data = await get_real_developer_data(github_username)

            self._log_step(log, "collect_activity", "completed", {
                "total_commits": real_data["total_commits"],
                "late_night_commits": real_data["late_night_commits"],
                "weekend_commits": real_data["weekend_commits"],
                "skills": real_data["skills"],
                "repos_active": real_data["repos_active"],
                "invisible_work_hours": real_data["invisible_work_hours"],
                "invisible_work_items_count": len(real_data["invisible_work_items"]),
            })
            print(f"   Collected: {real_data['total_commits']} commits, {len(real_data['invisible_work_items'])} PR reviews")

            # ─── STEP 2: Gemini Analysis ──────────────────────────────────
            self._log_step(log, "gemini_analysis", "started",
                           f"Sending real developer activity for {github_username} to Gemini")

            # Formulate the prompt requested in TASK 3
            prompt = f"""You are DevPulse, an AI developer intelligence agent. Analyze this REAL developer activity data:

Developer: {github_username}
Total commits (last 30 days): {real_data['total_commits']}
Late-night commits (10pm-4am): {real_data['late_night_commits']}
Weekend commits: {real_data['weekend_commits']}
PR reviews given: {len(real_data['invisible_work_items'])}
Invisible work hours: {real_data['invisible_work_hours']}h
Top skills used: {', '.join(real_data['skills'])}
Peak productive hours: {real_data['peak_hours']}
Active repos: {real_data['repos_active']}
Burnout score: {real_data['burnout_score']}/100

Based on this REAL data:
1. Generate a 1-sentence burnout insight (mention specific numbers)
2. List 2-3 invisible work contributions with estimated hours
3. Identify 1 rising skill with evidence
4. Recommend peak focus hours and explain why (cite actual hour patterns)
5. Decide: should we block calendar time? If yes, which hours?

Respond in JSON format:
{{
  "burnout_insight": "...",
  "invisible_work": ["...", "..."],
  "rising_skill": "...",
  "focus_recommendation": "...",
  "should_block_calendar": true/false,
  "calendar_block_hours": [14, 16],
  "risk_level": "LOW/MEDIUM/HIGH/CRITICAL"
}}"""

            # Call Gemini
            raw_response = await gemini_service._call_gemini(prompt)
            parsed_json = gemini_service._extract_json(raw_response)

            # Rule-based fallback if Gemini fails or returns malformed response
            if not parsed_json:
                print("[WARN] Gemini response empty/malformed, using heuristic fallback")
                parsed_json = self._get_heuristic_json(real_data)

            # Map the parsed JSON response to database models
            risk_level_str = parsed_json.get("risk_level", "LOW").lower()
            if risk_level_str == "critical":
                burnout_level = BurnoutLevel.CRITICAL
            elif risk_level_str == "high":
                burnout_level = BurnoutLevel.HIGH
            elif risk_level_str == "medium":
                burnout_level = BurnoutLevel.MEDIUM
            else:
                burnout_level = BurnoutLevel.LOW

            # Create invisible work items
            invisible_items = []
            for idx, desc in enumerate(parsed_json.get("invisible_work", [])):
                invisible_items.append(InvisibleWorkItem(
                    category="code_review" if "review" in desc.lower() else "mentoring",
                    description=desc,
                    estimated_hours=1.5 if idx == 0 else 1.0,
                    impact_score=8.5 if idx == 0 else 7.5
                ))

            # Create skill signals
            skills_detected = []
            rising_skill_desc = parsed_json.get("rising_skill", "")
            if real_data["skills"]:
                skills_detected.append(SkillSignal(
                    skill=real_data["skills"][0],
                    evidence=rising_skill_desc or f"Demonstrated consistent contributions in {real_data['skills'][0]}.",
                    confidence=0.9,
                    trajectory="rising"
                ))

            # Assemble AgentInsight schema
            insight = AgentInsight(
                developer_id=developer_id,
                generated_at=datetime.utcnow(),
                invisible_work=invisible_items,
                skills_detected=skills_detected,
                productivity_score=real_data["productivity_score"],
                burnout_score=real_data["burnout_score"],
                burnout_level=burnout_level,
                peak_hours=real_data["peak_hours"],
                insights=[
                    parsed_json.get("burnout_insight", ""),
                    parsed_json.get("focus_recommendation", "")
                ],
                raw_gemini_response=raw_response or "heuristic_fallback"
            )

            self._log_step(log, "gemini_analysis", "completed", {
                "burnout_insight": parsed_json.get("burnout_insight"),
                "risk_level": parsed_json.get("risk_level"),
                "should_block_calendar": parsed_json.get("should_block_calendar"),
                "calendar_block_hours": parsed_json.get("calendar_block_hours"),
            })
            print(f"   Analysis: productivity={insight.productivity_score:.0f}, burnout={insight.burnout_score:.0f} ({insight.burnout_level})")

            # ─── STEP 3: Auto-Schedule Google Calendar blocks ──────────────
            self._log_step(log, "action_planning", "started", "Evaluating calendar block recommendations")

            # Focus-Block Autopiloting (Real Actionability)
            # Detect if a developer's peak productivity hours are between 2 PM and 5 PM (hours 14, 15, 16)
            # or if they commit mostly (>= 30% of total commits) during those hours.
            peak_hours = real_data.get("peak_hours", [])
            has_peak_hour_in_window = any(h in [14, 15, 16] for h in peak_hours)

            total_commits = real_data.get("total_commits", 0)
            commits = real_data.get("commits", [])
            commits_in_window = 0
            for c in commits:
                try:
                    ts_str = c["timestamp"].replace("Z", "+00:00")
                    dt = datetime.fromisoformat(ts_str)
                    if dt.hour in [14, 15, 16]:
                        commits_in_window += 1
                except Exception:
                    continue

            pct_in_window = (commits_in_window / total_commits) if total_commits > 0 else 0.0
            is_autopilot_matched = has_peak_hour_in_window or pct_in_window >= 0.30

            is_autopilot = False
            event_title = "⚡ Deep Work Block — DevPulse"

            if is_autopilot_matched:
                print(f"[AUTOPILOT] Autopilot detected peak 2-5 PM hours for {github_username} (has_peak={has_peak_hour_in_window}, pct={pct_in_window:.2f}). Protection activated!")
                parsed_json["should_block_calendar"] = True
                parsed_json["calendar_block_hours"] = [14, 17]  # 2 PM to 5 PM
                parsed_json["focus_recommendation"] = "Automatically scheduled recurring deep-work focus block during peak 2 PM - 5 PM hours. Autopilot auto-decline activated."
                is_autopilot = True
                event_title = "⚡ Autopilot: Daily Deep Work Focus Block"

            executed_actions_count = 0
            if parsed_json.get("should_block_calendar"):
                block_hours = parsed_json.get("calendar_block_hours", [14, 16])
                start_hour = block_hours[0] if block_hours else 10
                end_hour = block_hours[1] if len(block_hours) > 1 else start_hour + 2

                # Resolve start and end datetimes for next business day
                tomorrow = datetime.utcnow().replace(
                    hour=start_hour, minute=0, second=0, microsecond=0
                ) + timedelta(days=1)
                while tomorrow.weekday() >= 5:
                    tomorrow += timedelta(days=1)

                start_dt = tomorrow
                end_dt = tomorrow.replace(hour=end_hour)

                dev_email = dev_profile.get("email") if dev_profile else f"{github_username}@devpulse.ai"
                focus_rec = parsed_json.get("focus_recommendation", "Protect focus slot")

                self._log_step(log, "action_execution", "started", {
                    "action_type": "calendar_block",
                    "reason": focus_rec,
                    "hours": block_hours,
                    "is_autopilot": is_autopilot,
                })

                # Invoke Google Calendar tool
                result = await create_calendar_event(
                    developer_email=dev_email,
                    title=event_title,
                    start_datetime=start_dt.isoformat(),
                    end_datetime=end_dt.isoformat(),
                    description=(
                        f"Automatically scheduled by DevPulse Agent.\n"
                        f"Reason: {focus_rec}\n"
                        f"Burnout Level: {burnout_level.value.upper()}\n"
                        f"Burnout Score: {real_data['burnout_score']:.0f}/100"
                    ),
                    is_autopilot=is_autopilot,
                )

                action = AgentAction(
                    developer_id=developer_id,
                    action_type=ActionType.CALENDAR_BLOCK,
                    reason=focus_rec,
                    status=ActionStatus.EXECUTED if result.get("success") else ActionStatus.FAILED,
                    planned_at=datetime.utcnow(),
                    executed_at=datetime.utcnow() if result.get("success") else None,
                    result=result,
                    calendar_event_id=result.get("event_id"),
                    explainability=f"Automatically blocked slots {start_hour}:00 to {end_hour}:00 on Google Calendar. Status: {result.get('mode', 'simulated')}."
                )

                await db_service.save_action(action)
                executed_actions_count = 1
                self._log_step(log, "action_execution", "completed", result)
                print(f"   Calendar Block created: {result.get('mode')} - Event ID: {result.get('event_id')}")
            else:
                self._log_step(log, "action_execution", "skipped", "Gemini recommended no calendar action")

            # ─── STEP 4: Store Results in Database ────────────────────────
            self._log_step(log, "persist", "started", "Persisting insights history")
            await db_service.save_insight(insight)

            log.actions_taken = executed_actions_count
            log.insights_generated = 1
            log.status = "completed"
            log.completed_at = datetime.utcnow()
            duration = (log.completed_at - log.started_at).total_seconds()
            self._log_step(log, "persist", "completed", "Run data fully saved")
            print(f" Agent run completed in {duration:.1f}s")

        except Exception as e:
            log.status = "failed"
            log.completed_at = datetime.utcnow()
            self._log_step(log, "error", "failed", str(e))
            print(f"[ERROR] Agent run {run_id} failed: {e}")
            import traceback
            traceback.print_exc()

        await db_service.save_agent_run(log)
        self.run_history.append(log)
        return log

    def _get_heuristic_json(self, real_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provides a rule-based fallback response if the Gemini call fails."""
        bs = real_data["burnout_score"]
        risk = "LOW"
        if bs >= 80:
            risk = "CRITICAL"
        elif bs >= 60:
            risk = "HIGH"
        elif bs >= 40:
            risk = "MEDIUM"

        return {
            "burnout_insight": f"Developer made {real_data['late_night_commits']} late-night commits and {real_data['weekend_commits']} weekend commits, indicating {risk.lower()} burnout risk.",
            "invisible_work": [
                f"Completed {len(real_data['invisible_work_items'])} code reviews, spending approximately {real_data['invisible_work_hours']} hours on quality control.",
                "Mentored colleagues and supported cross-functional development tasks."
            ],
            "rising_skill": f"Demonstrated high growth in {real_data['skills'][0] if real_data['skills'] else 'System Design'} via active repository commits.",
            "focus_recommendation": f"Recommend blocking focal hours {real_data['peak_hours'][:2]} to boost productivity and defend deep work.",
            "should_block_calendar": bs > 50,
            "calendar_block_hours": real_data["peak_hours"][:2] if len(real_data["peak_hours"]) >= 2 else [14, 16],
            "risk_level": risk
        }

    def _log_step(self, log: AgentRunLog, step: str, status: str, data: Any):
        log.steps.append({
            "step": step,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        })

    async def run_all_developers(self):
        """Run the agent loop for all known developers."""
        developers = get_all_developers()
        print(f"\n Scheduled agent run for {len(developers)} developers")
        for dev in developers:
            await self.run_for_developer(dev["id"])
            await asyncio.sleep(0.5)  # Rate limit between runs


# Global Agent Instance
agent = DevPulseAgent()
