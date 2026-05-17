"""Google OAuth2 routes for Calendar integration."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.services.calendar_store import calendar_store

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]


@router.get("/google")
async def google_auth():
    """Redirect to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_CLIENT_ID not configured. Set it in .env to enable real Calendar integration.",
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
    auth_url, _ = flow.authorization_url(prompt="consent")
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str):
    """Handle OAuth callback and store credentials."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="OAuth not configured")

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
    calendar_store.set_credentials(flow.credentials)

    return {"status": "authenticated", "message": "Google Calendar connected!"}


@router.get("/status")
async def auth_status():
    has_creds = calendar_store.get_credentials() is not None
    return {
        "google_calendar": has_creds,
        "oauth_configured": bool(settings.GOOGLE_CLIENT_ID),
        "demo_mode": settings.DEMO_MODE,
    }
