"""
Google Calendar credentials and event store with MongoDB persistence.
Supports token saving/loading and simulated/real event tracking.
"""
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from google.oauth2.credentials import Credentials

from app.core.database import get_db


class CalendarStore:
    """Stores calendar events and serializes/deserializes Google OAuth credentials to MongoDB."""

    def __init__(self):
        self._events: List[Dict[str, Any]] = []
        self._credentials: Optional[Credentials] = None

    def add_event(self, event: Dict[str, Any]):
        event["stored_at"] = datetime.utcnow().isoformat()
        self._events.append(event)

    def get_events(self) -> List[Dict[str, Any]]:
        return list(reversed(self._events))

    def clear_events(self):
        self._events.clear()

    def set_credentials(self, creds: Credentials):
        """Set credentials in memory and trigger async database persistence."""
        self._credentials = creds
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.save_credentials_to_db(creds))
            else:
                asyncio.run(self.save_credentials_to_db(creds))
        except Exception as e:
            print(f"[WARN] Error launching async credentials save: {e}")

    async def save_credentials_to_db(self, creds: Credentials):
        """Asynchronously save serializable Google credentials to MongoDB."""
        db = get_db()
        if db is not None:
            creds_data = {
                "token": creds.token,
                "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri,
                "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "scopes": creds.scopes,
                "updated_at": datetime.utcnow().isoformat(),
            }
            try:
                await db.google_credentials.update_one(
                    {"_id": "global_credentials"},
                    {"$set": creds_data},
                    upsert=True
                )
                print("[INFO] Google OAuth credentials stored in MongoDB")
            except Exception as e:
                print(f"[ERROR] Failed to store credentials in MongoDB: {e}")

    async def get_credentials_async(self) -> Optional[Credentials]:
        """Loads and returns Google OAuth credentials from memory or MongoDB (with auto-refresh)."""
        if self._credentials:
            return self._credentials

        db = get_db()
        if db is not None:
            try:
                doc = await db.google_credentials.find_one({"_id": "global_credentials"})
                if doc:
                    self._credentials = Credentials(
                        token=doc.get("token"),
                        refresh_token=doc.get("refresh_token"),
                        token_uri=doc.get("token_uri"),
                        client_id=doc.get("client_id"),
                        client_secret=doc.get("client_secret"),
                        scopes=doc.get("scopes")
                    )
                    print("[INFO] Google OAuth credentials loaded from MongoDB")
                    return self._credentials
            except Exception as e:
                print(f"[ERROR] Failed to load credentials from MongoDB: {e}")

        return self._credentials


calendar_store = CalendarStore()
