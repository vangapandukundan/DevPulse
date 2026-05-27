"""
Google Calendar MCP Tool
Creates calendar events via Google Calendar API.
Falls back to simulation if OAuth tokens not configured.
"""
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from app.mcp.tool_interface import MCPTool, mcp_registry
from app.core.config import settings
from app.services.calendar_store import calendar_store


async def create_calendar_event(
    developer_email: str,
    title: str,
    start_datetime: Any,
    end_datetime: Any,
    description: str,
    is_recurring: bool = False,
    auto_decline: bool = False,
    is_autopilot: bool = False,
) -> Dict[str, Any]:
    """
    Creates a Google Calendar event using stored OAuth tokens from MongoDB.
    Falls back to simulated mode if OAuth is not set up.
    """
    # Parse datetimes
    try:
        if isinstance(start_datetime, str):
            start = datetime.fromisoformat(start_datetime.replace("Z", "+00:00"))
        else:
            start = start_datetime

        if isinstance(end_datetime, str):
            end = datetime.fromisoformat(end_datetime.replace("Z", "+00:00"))
        else:
            end = end_datetime
    except Exception as e:
        print(f"[WARN] Error parsing event datetimes: {e}. Defaulting to tomorrow.")
        start = datetime.utcnow() + timedelta(days=1, hours=10)
        end = start + timedelta(hours=2)

    # If autopilot, auto-enable recurring and auto-decline
    if is_autopilot:
        is_recurring = True
        auto_decline = True

    # 1. Try Real Google Calendar API
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
        try:
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request

            # Dynamically fetch credentials from database
            creds = await calendar_store.get_credentials_async()
            if creds:
                # Automatic token refresh if expired
                if creds.expired and creds.refresh_token:
                    print("[INFO] Refreshing expired Google OAuth token...")
                    creds.refresh(Request())
                    await calendar_store.save_credentials_to_db(creds)

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

                # Support for recurring blocks
                if is_recurring:
                    if is_autopilot:
                        event_body["recurrence"] = ["RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;COUNT=5"]
                    else:
                        event_body["recurrence"] = ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]

                # Support for Out of Office / Auto-Decline
                if auto_decline:
                    event_body["eventType"] = "outOfOffice"
                    event_body["outOfOfficeProperties"] = {
                        "declineMessage": "Declined automatically by DevPulse Autopilot to protect deep-work focus time." if is_autopilot else "Declined automatically: Peak deep work block protected by DevPulse Agent.",
                        "autoDeclineMode": "declineAll"
                    }

                try:
                    event = service.events().insert(
                        calendarId="primary", body=event_body
                    ).execute()
                except Exception as api_err:
                    print(f"[WARN] Google API OutOfOffice failed: {api_err}. Trying standard event type.")
                    # Fallback if outOfOffice is not supported
                    event_body.pop("eventType", None)
                    event_body.pop("outOfOfficeProperties", None)
                    event = service.events().insert(
                        calendarId="primary", body=event_body
                    ).execute()

                print(f"[INFO] Google Calendar event created successfully: {event.get('id')}")
                return {
                    "success": True,
                    "event_id": event.get("id"),
                    "html_link": event.get("htmlLink"),
                    "mode": "google_calendar_api",
                    "title": title,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "description": description,
                    "is_recurring": is_recurring,
                    "auto_decline": auto_decline,
                    "is_autopilot": is_autopilot,
                    "developer_email": developer_email,
                }
        except Exception as e:
            print(f"[WARN] Real Google Calendar API failed: {e}. Falling back to simulation.")

    # 2. Simulated Fallback Mode
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
        "is_recurring": is_recurring,
        "auto_decline": auto_decline,
        "is_autopilot": is_autopilot,
        "developer_email": developer_email,
        "recurrence_rule": "Daily Workweek (Monday-Friday)" if is_autopilot else ("Weekly (Mon-Fri)" if is_recurring else None),
        "decline_message": "Declined automatically by DevPulse Autopilot to protect deep-work focus time." if is_autopilot else ("Declined automatically: Peak deep work block protected by DevPulse Agent." if auto_decline else None),
        "note": "Demo mode: event simulated (configure OAuth for real calendar)",
    }

    # Track in calendar store for UI listing
    calendar_store.add_event(simulated_event)
    print(f"[AGENT] Simulated focus block calendar event: '{title}' (recurring={is_recurring}, auto_decline={auto_decline}, autopilot={is_autopilot})")
    return simulated_event


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
                "description": "Event title, e.g. 'Deep Work Block — DevPulse'",
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
            "is_recurring": {
                "type": "boolean",
                "description": "Set to true to make the calendar block repeat weekly",
            },
            "auto_decline": {
                "type": "boolean",
                "description": "Set to true to automatically decline overlapping meeting invitations",
            },
            "is_autopilot": {
                "type": "boolean",
                "description": "Set to true to sync focus block autopilot recurring decline mode",
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
        is_recurring = kwargs.get("is_recurring", False)
        auto_decline = kwargs.get("auto_decline", False)
        is_autopilot = kwargs.get("is_autopilot", False)

        return await create_calendar_event(
            developer_email=developer_email,
            title=title,
            start_datetime=start_dt,
            end_datetime=end_dt,
            description=description,
            is_recurring=is_recurring,
            auto_decline=auto_decline,
            is_autopilot=is_autopilot,
        )


# Register tool
calendar_tool = CalendarBlockTool()
mcp_registry.register(calendar_tool)
