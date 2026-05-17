"""
In-memory + MongoDB calendar event store.
Stores simulated and real calendar events for dashboard display.
"""
from datetime import datetime
from typing import Optional
from google.oauth2.credentials import Credentials


class CalendarStore:
    """Stores calendar events and OAuth credentials."""

    def __init__(self):
        self._events: list[dict] = []
        self._credentials: Optional[Credentials] = None

    def add_event(self, event: dict):
        event["stored_at"] = datetime.utcnow().isoformat()
        self._events.append(event)

    def get_events(self) -> list[dict]:
        return list(reversed(self._events))

    def set_credentials(self, creds: Credentials):
        self._credentials = creds

    def get_credentials(self) -> Optional[Credentials]:
        return self._credentials


calendar_store = CalendarStore()
