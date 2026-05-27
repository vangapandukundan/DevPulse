"""
Developer management routes.
Any client can register, be analyzed, and manage their profile.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.developer_service import (
    get_all_developers, get_developer_by_id,
    create_developer, delete_developer,
)

router = APIRouter()


# ─── Request Models ──────────────────────────────────────────────────────

class CreateDeveloperRequest(BaseModel):
    name:         str
    email:        str = ""
    role:         str = "Software Engineer"
    team:         str = "Engineering"
    github:       str = ""
    work_style:   str = "balanced"   # night_owl / early_bird / balanced / sporadic
    burnout_risk: str = "medium"     # low / medium / high


# ─── Routes ──────────────────────────────────────────────────────────────

@router.get("/")
async def list_developers():
    """List all registered developers."""
    return {"developers": get_all_developers()}


@router.post("/")
async def register_developer(req: CreateDeveloperRequest):
    """Register a new developer (any client can join)."""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Developer name is required")

    dev = create_developer(
        name         = req.name.strip(),
        email        = req.email.strip(),
        role         = req.role.strip() or "Software Engineer",
        team         = req.team.strip() or "Engineering",
        github       = req.github.strip(),
        work_style   = req.work_style,
        burnout_risk = req.burnout_risk,
    )
    return {"developer": dev, "message": f"Developer '{dev['name']}' registered successfully"}


@router.get("/{developer_id}")
async def get_developer(developer_id: str):
    """Get a specific developer's profile."""
    dev = get_developer_by_id(developer_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Developer not found")
    return {"developer": dev}


@router.delete("/{developer_id}")
async def remove_developer(developer_id: str):
    """Remove a developer (non-seed only)."""
    success = delete_developer(developer_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this developer (either not found or is a protected seed developer)"
        )
    return {"message": "Developer removed successfully"}
