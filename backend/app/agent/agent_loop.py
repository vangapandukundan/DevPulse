"""
DevPulse Agent Loop
===================
The core autonomous agent that:
  Step 1: Collect activity data
  Step 2: Analyze with Gemini (detect invisible work, burnout, skills)
  Step 3: Plan actions
  Step 4: Execute actions via MCP tools (Calendar)
  Step 5: Store results in DB
  Step 6: Emit logs for transparency

This is a REAL agent loop  not a single prompt-response.
"""
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from app.models.schemas import (
    AgentRunLog, AgentAction, AgentInsight,
    ActionType, ActionStatus, PlannedAction,
)
from app.services.mock_data import generate_developer_activity, get_all_developers
from app.services.gemini_service import gemini_service
from app.services.db_service import db_service
from app.mcp.tool_interface import mcp_registry
from app.core.console import console

# Import to ensure calendar tool is registered
import app.mcp.calendar_tool  # noqa: F401



class DevPulseAgent:
    """Autonomous multi-step AI agent for developer intelligence."""

    def __init__(self):
        self.is_running = False
        self.run_history: list[AgentRunLog] = []

    async def run_for_developer(
        self,
        developer_id: str,
        days: int = 30,
        force: bool = False,
    ) -> AgentRunLog:
        """
        Full agent loop for a single developer.
        Returns the run log with all steps and decisions.
        """
        run_id = uuid.uuid4().hex[:8]
        log = AgentRunLog(
            run_id=run_id,
            developer_id=developer_id,
            started_at=datetime.utcnow(),
            steps=[],
        )

        console.rule(f" Agent Run {run_id}  {developer_id}")

        try:
            #  STEP 1: Collect Activity Data 
            self._log_step(log, "collect_activity", "started",
                           f"Fetching {days} days of activity for {developer_id}")

            activity = generate_developer_activity(developer_id=developer_id, days=days)

            self._log_step(log, "collect_activity", "completed", {
                "commits": len(activity.commits),
                "pr_reviews": len(activity.pr_reviews),
                "issue_comments": len(activity.issue_comments),
                "hours_logged": activity.raw_hours_logged,
            })
            print(f"   Collected: {len(activity.commits)} commits, {len(activity.pr_reviews)} PR reviews")

            #  STEP 2: Gemini Analysis 
            self._log_step(log, "gemini_analysis", "started",
                           "Sending activity to Gemini for analysis")

            insight = await gemini_service.analyze_activity(activity)
            insight.developer_id = developer_id

            self._log_step(log, "gemini_analysis", "completed", {
                "productivity_score": insight.productivity_score,
                "burnout_score": insight.burnout_score,
                "burnout_level": insight.burnout_level.value,
                "invisible_work_items": len(insight.invisible_work),
                "skills_detected": len(insight.skills_detected),
                "peak_hours": insight.peak_hours,
            })
            print(f"   Analysis: productivity={insight.productivity_score:.0f}, burnout={insight.burnout_score:.0f} ({insight.burnout_level})")

            #  STEP 3: Plan Actions 
            self._log_step(log, "action_planning", "started",
                           "Planning autonomous actions based on insights")

            planned_actions = await gemini_service.plan_actions(insight)

            self._log_step(log, "action_planning", "completed", {
                "actions_planned": len(planned_actions),
                "action_types": [a.type.value for a in planned_actions],
            })
            print(f"   Planned {len(planned_actions)} actions: {[a.type.value for a in planned_actions]}")

            #  STEP 4: Execute Actions via MCP Tools 
            self._log_step(log, "action_execution", "started",
                           "Executing planned actions via MCP tool interface")

            executed_actions = await self._execute_actions(
                planned_actions, insight, developer_id, log
            )

            log.actions_taken = len([a for a in executed_actions if a.status == ActionStatus.EXECUTED])
            self._log_step(log, "action_execution", "completed", {
                "executed": log.actions_taken,
                "total": len(executed_actions),
            })
            print(f"   Executed {log.actions_taken}/{len(executed_actions)} actions")

            #  STEP 5: Persist to Database 
            self._log_step(log, "persist", "started", "Storing insights and actions to database")

            await db_service.save_insight(insight)
            for action in executed_actions:
                await db_service.save_action(action)

            log.insights_generated = 1
            self._log_step(log, "persist", "completed", "Data stored successfully")
            print(f"   Persisted insight and {len(executed_actions)} actions")

            #  Complete 
            log.status = "completed"
            log.completed_at = datetime.utcnow()
            duration = (log.completed_at - log.started_at).total_seconds()
            print(f"\n Agent run {run_id} completed in {duration:.1f}s")

        except Exception as e:
            log.status = "failed"
            log.completed_at = datetime.utcnow()
            self._log_step(log, "error", "failed", str(e))
            print(f" Agent run {run_id} failed: {e}")
            import traceback
            traceback.print_exc()

        await db_service.save_agent_run(log)
        self.run_history.append(log)
        return log

    async def _execute_actions(
        self,
        planned: list[PlannedAction],
        insight: AgentInsight,
        developer_id: str,
        log: AgentRunLog,
    ) -> list[AgentAction]:
        """Execute each planned action via MCP tools."""
        results = []

        for plan in sorted(planned, key=lambda a: a.priority):
            action = AgentAction(
                developer_id=developer_id,
                action_type=plan.type,
                reason=plan.reason,
                status=ActionStatus.PLANNED,
                planned_at=datetime.utcnow(),
                explainability=self._explain_action(plan, insight),
            )

            if plan.type == ActionType.CALENDAR_BLOCK:
                action = await self._execute_calendar_block(action, plan, insight)
            else:
                action.status = ActionStatus.SKIPPED
                action.result = {"reason": "tool not implemented in MVP"}

            results.append(action)

        return results

    async def _execute_calendar_block(
        self,
        action: AgentAction,
        plan: PlannedAction,
        insight: AgentInsight,
    ) -> AgentAction:
        """Execute a calendar block via MCP tool."""
        tool = mcp_registry.get("create_calendar_event")
        if not tool:
            action.status = ActionStatus.FAILED
            action.result = {"error": "calendar_tool not registered"}
            return action

        # Determine event times
        start_dt, end_dt = self._parse_time_suggestion(plan.time_suggestion, insight)

        try:
            result = await tool.execute(
                title=plan.calendar_event_title or " Deep Work Block  DevPulse",
                start_datetime=start_dt.isoformat(),
                end_datetime=end_dt.isoformat(),
                description=(
                    f"Automatically created by DevPulse Agent.\n"
                    f"Reason: {plan.reason}\n"
                    f"Developer burnout score: {insight.burnout_score:.0f}/100\n"
                    f"Productivity score: {insight.productivity_score:.0f}/100"
                ),
            )

            if result.get("success"):
                action.status = ActionStatus.EXECUTED
                action.executed_at = datetime.utcnow()
                action.result = result
                action.calendar_event_id = result.get("event_id")
            else:
                action.status = ActionStatus.FAILED
                action.result = result

        except Exception as e:
            action.status = ActionStatus.FAILED
            action.result = {"error": str(e)}

        return action

    def _parse_time_suggestion(
        self, suggestion: Optional[str], insight: AgentInsight
    ) -> tuple[datetime, datetime]:
        """Parse time suggestion string into datetime objects."""
        import re

        # Use peak hour as default
        peak_hour = insight.peak_hours[0] if insight.peak_hours else 10

        # Try to extract hour from suggestion like "10:00 - 12:00" or "10 AM - 12 PM"
        if suggestion:
            match = re.search(r"(\d{1,2})(?::00)?\s*(?:AM|PM)?", suggestion, re.IGNORECASE)
            if match:
                hour = int(match.group(1))
                if "PM" in suggestion.upper() and hour < 12:
                    hour += 12
                peak_hour = hour

        # Schedule for next business day at peak hour
        tomorrow = datetime.utcnow().replace(
            hour=peak_hour, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)

        # Skip to Monday if weekend
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)

        start = tomorrow
        end = tomorrow + timedelta(hours=2)
        return start, end

    def _explain_action(self, plan: PlannedAction, insight: AgentInsight) -> str:
        """Generate a human-readable explanation for why this action was taken."""
        if plan.type == ActionType.CALENDAR_BLOCK:
            return (
                f"DevPulse detected peak productivity at {insight.peak_hours} with a "
                f"burnout score of {insight.burnout_score:.0f}/100. "
                f"Blocking calendar time protects this developer's best working hours "
                f"from interruptions. Reason: {plan.reason}"
            )
        return plan.reason

    def _log_step(self, log: AgentRunLog, step: str, status: str, data: any):
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


#  Global Agent Instance 
agent = DevPulseAgent()
