"""
Google Calendar MCP Tool
Creates calendar events via Google Calendar API.
Falls back to simulation if OAuth tokens not configured.
"""
import json
from datetime import datetime, timedelta
from typing import Optional

from app.mcp.tool_interface import MCPTool, mcp_registry
from app.core.config import settings
from app.services.calendar_store import calendar_store



class CalendarBlockTool(MCPTool):
    """MCP Tool: Create a calendar event to block focus time."""

    name = "create_calendar_event"
    description = (
        "Creates a Google Calendar event to block focus/recovery time for a developer. "
        "Used to protect peak productivity hours or schedule recovery time."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Event title, e.g. 'Deep Work Block  DevPulse'",
            },
            "start_datetime": {
                "type": "string",
                "description": "ISO 8601 datetime for event start",
            },
            "end_datetime": {
                "type": "string",
                "description": "ISO 8601 datetime for event end",
            },
            "description": {
                "type": "string",
                "description": "Event description explaining why the block was created",
            },
            "developer_email": {
                "type": "string",
                "description": "Email of the developer's calendar",
            },
        },
        "required": ["title", "start_datetime", "end_datetime", "description"],
    }

    async def execute(self, **kwargs) -> dict:
        title = kwargs.get("title", "Deep Work Block")
        start_dt = kwargs.get("start_datetime")
        end_dt = kwargs.get("end_datetime")
        description = kwargs.get("description", "Created by DevPulse Agent")
        developer_email = kwargs.get("developer_email", "")

        # Parse datetimes
        if isinstance(start_dt, str):
            start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))
        if isinstance(end_dt, str):
            end_dt = datetime.fromisoformat(end_dt.replace("Z", "+00:00"))

        # Try real Google Calendar API first
        if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
            result = await self._create_real_event(
                title, start_dt, end_dt, description, developer_email
            )
            if result.get("success"):
                return result

        # Simulation fallback
        return await self._simulate_event(title, start_dt, end_dt, description)

    async def _create_real_event(
        self,
        title: str,
        start: datetime,
        end: datetime,
        description: str,
        email: str,
    ) -> dict:
        """Attempt real Google Calendar API call."""
        try:
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials

            creds = calendar_store.get_credentials()
            if not creds:
                return {"success": False, "reason": "No OAuth credentials"}

            service = build("calendar", "v3", credentials=creds)
            event_body = {
                "summary": title,
                "description": description,
                "start": {
                    "dateTime": start.isoformat(),
                    "timeZone": "UTC",
                },
                "end": {
                    "dateTime": end.isoformat(),
                    "timeZone": "UTC",
                },
                "colorId": "9",  # Blueberry
                "reminders": {
                    "useDefault": False,
                    "overrides": [{"method": "popup", "minutes": 10}],
                },
            }
            event = service.events().insert(
                calendarId="primary", body=event_body
            ).execute()

            print(f" Real Calendar event created: {event.get('id')}")
            return {
                "success": True,
                "event_id": event.get("id"),
                "html_link": event.get("htmlLink"),
                "mode": "google_calendar_api",
                "title": title,
                "start": start.isoformat(),
                "end": end.isoformat(),
            }
        except Exception as e:
            print(f"Calendar API error: {e}")
            return {"success": False, "reason": str(e)}

    async def _simulate_event(
        self,
        title: str,
        start: datetime,
        end: datetime,
        description: str,
    ) -> dict:
        """Simulate calendar event creation for demo mode."""
        import uuid
        event_id = f"devpulse_sim_{uuid.uuid4().hex[:8]}"

        simulated_event = {
            "success": True,
            "event_id": event_id,
            "html_link": f"https://calendar.google.com/calendar/r/eventedit?eid={event_id}",
            "mode": "simulated",
            "title": title,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "description": description,
            "note": "Demo mode: event simulated (configure OAuth for real calendar)",
        }

        # Persist to in-memory store
        calendar_store.add_event(simulated_event)
        print(f" Simulated calendar event: {title} @ {start.strftime('%H:%M')}")
        return simulated_event


#  Register tools 
calendar_tool = CalendarBlockTool()
mcp_registry.register(calendar_tool)
