"""
DevPulse Unified API Router
Provides endpoints for developers, agent execution, and Google OAuth integration.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from typing import Dict, Any, Optional

from app.core.config import settings
from app.github_service import get_real_developer_data
from app.agent.agent_loop import agent
from app.services.db_service import db_service
from app.services.calendar_store import calendar_store

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]


@router.get("/developer/me", tags=["Developer"])
async def get_developer_me() -> Dict[str, Any]:
    """Retrieve real GitHub data for the authenticated .env user."""
    if not settings.GITHUB_USERNAME:
        raise HTTPException(
            status_code=400,
            detail="GITHUB_USERNAME not configured in .env. Please set GITHUB_USERNAME to read profile."
        )
    return await get_real_developer_data(settings.GITHUB_USERNAME)


@router.get("/developer/{username}", tags=["Developer"])
async def get_developer_data(username: str, days: int = 30):
    """Retrieve real GitHub data for any specified username."""
    if not username.strip():
        raise HTTPException(status_code=400, detail="Username parameter cannot be empty.")
    from app.github_service import get_real_developer_data
    try:
        data = await get_real_developer_data(username=username.strip())
        if not data or data.get("total_commits", 0) == 0:
            raise HTTPException(status_code=404, detail="GitHub user not found or no activity")
        return data
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/agent/run/{username}", tags=["Agent"])
async def run_agent_for_username(username: str, days: int = 30) -> Dict[str, Any]:
    """Runs the full agent pipeline for a GitHub username (live GitHub metrics + Gemini + Google Calendar)."""
    if not username.strip():
        raise HTTPException(status_code=400, detail="Username parameter is required to run the agent.")

    log = await agent.run_for_developer(username.strip(), days=days)
    return {
        "run_id": log.run_id,
        "status": log.status,
        "steps": log.steps
    }


@router.get("/agent/runs", tags=["Agent"])
async def get_all_runs(developer_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve the historical agent execution runs from MongoDB."""
    runs = await db_service.get_agent_runs(developer_id)
    for r in runs:
        r.pop("_id", None)
    return {"runs": runs}


@router.get("/auth/google", tags=["Auth"])
async def start_google_oauth():
    """Redirect to Google OAuth consent page to enable Calendar operations."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_CLIENT_ID/SECRET not configured. Please set them in .env"
        )

    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
    return RedirectResponse(url=auth_url)


@router.get("/auth/google/callback", tags=["Auth"])
async def handle_google_oauth_callback(code: str):
    """Handle the Google OAuth callback, exchange authorization code, and persist tokens to MongoDB."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_CLIENT_ID/SECRET not configured."
        )

    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)

    # Persist flow.credentials to database automatically
    calendar_store.set_credentials(flow.credentials)

    return {"status": "authenticated", "message": "Google Calendar connected and tokens stored in MongoDB!"}
