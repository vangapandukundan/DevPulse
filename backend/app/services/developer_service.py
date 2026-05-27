"""
Developer Registry Service
===========================
Dynamic developer management — any client can register and be analyzed.
Falls back to in-memory store when MongoDB is unavailable.
"""
import uuid
import random
from datetime import datetime
from typing import Optional, List


# ─── In-memory store (MongoDB fallback) ──────────────────────────────────
_developers: list[dict] = []

# Work styles + risk patterns for activity generation
STYLES    = ["night_owl", "early_bird", "balanced", "sporadic"]
RISK_LEVELS = ["low", "medium", "high"]

# Default seed developers so the app is never empty
SEED_DEVELOPERS = [
    {
        "id":           "dev_001",
        "name":         "Anika Sharma",
        "email":        "anika@devpulse.ai",
        "role":         "Senior Backend Engineer",
        "team":         "Platform",
        "github":       "anikasharma",
        "style":        "night_owl",
        "burnout_risk": "high",
        "avatar_color": "#6366f1",
        "joined_at":    "2026-01-01T00:00:00",
        "is_seed":      True,
    },
    {
        "id":           "dev_002",
        "name":         "Jordan Williams",
        "email":        "jordan@devpulse.ai",
        "role":         "DevOps Engineer",
        "team":         "Infrastructure",
        "github":       "jordanwilliams",
        "style":        "sporadic",
        "burnout_risk": "high",
        "avatar_color": "#f59e0b",
        "joined_at":    "2026-01-01T00:00:00",
        "is_seed":      True,
    },
]

# Avatar colors for new developers (cycle through these)
AVATAR_COLORS = [
    "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
    "#8b5cf6", "#f43f5e", "#f97316", "#3b82f6",
    "#ec4899", "#14b8a6", "#a855f7", "#22c55e",
]


def _init_seed():
    """Initialize with seed developers if empty."""
    if not _developers:
        _developers.extend(SEED_DEVELOPERS)


_init_seed()


# ─── CRUD ────────────────────────────────────────────────────────────────

def get_all_developers() -> list[dict]:
    """Return all developers (public fields only)."""
    return [
        {
            "id":           d["id"],
            "name":         d["name"],
            "email":        d.get("email", ""),
            "role":         d.get("role", "Developer"),
            "team":         d.get("team", "Engineering"),
            "github":       d.get("github", ""),
            "avatar_color": d.get("avatar_color", "#6366f1"),
            "style":        d.get("style", "balanced"),
            "burnout_risk": d.get("burnout_risk", "medium"),
            "joined_at":    d.get("joined_at", ""),
            "is_seed":      d.get("is_seed", False),
        }
        for d in _developers
    ]


def get_developer_by_id(dev_id: str) -> Optional[dict]:
    if not dev_id:
        return None
    # 1. First search by exact database ID matching
    dev = next((d for d in _developers if d["id"] == dev_id), None)
    if dev:
        return dev
    # 2. Next search by case-insensitive GitHub username
    dev = next((d for d in _developers if d.get("github", "").lower() == dev_id.lower()), None)
    if dev:
        return dev
    # 3. If still not found and does not look like a system ID prefix (e.g. dev_), auto-register them
    if not dev_id.startswith("dev_"):
        return create_developer(name=dev_id, github=dev_id)
    return None


def create_developer(
    name: str,
    email: str = "",
    role: str = "Software Engineer",
    team: str = "Engineering",
    github: str = "",
    work_style: str = "balanced",
    burnout_risk: str = "medium",
) -> dict:
    """Register a new developer and return their profile."""
    # Check for duplicate email
    if email and any(d.get("email") == email for d in _developers):
        existing = next(d for d in _developers if d.get("email") == email)
        return existing

    # Check for duplicate github
    if github and any(d.get("github", "").lower() == github.lower() for d in _developers):
        existing = next(d for d in _developers if d.get("github", "").lower() == github.lower())
        return existing

    dev_id = f"dev_{uuid.uuid4().hex[:6]}"
    color  = AVATAR_COLORS[len(_developers) % len(AVATAR_COLORS)]

    dev = {
        "id":           dev_id,
        "name":         name,
        "email":        email,
        "role":         role,
        "team":         team,
        "github":       github,
        "style":        work_style,
        "burnout_risk": burnout_risk,
        "avatar_color": color,
        "joined_at":    datetime.utcnow().isoformat(),
        "is_seed":      False,
    }
    _developers.append(dev)
    return dev


def delete_developer(dev_id: str) -> bool:
    """Delete a developer (non-seed only)."""
    global _developers
    dev = get_developer_by_id(dev_id)
    if not dev or dev.get("is_seed"):
        return False
    _developers = [d for d in _developers if d["id"] != dev_id]
    return True


def update_developer_burnout_style(dev_id: str, style: str, burnout_risk: str):
    """Update work style/risk after analysis."""
    dev = get_developer_by_id(dev_id)
    if dev:
        dev["style"]        = style
        dev["burnout_risk"] = burnout_risk
