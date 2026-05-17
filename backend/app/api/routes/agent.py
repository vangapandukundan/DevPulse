"""Agent control routes  trigger runs, view logs."""
from fastapi import APIRouter
from app.agent.agent_loop import agent
from app.services.db_service import db_service
from app.services.mock_data import get_all_developers

router = APIRouter()


@router.post("/run/{developer_id}")
async def run_agent(developer_id: str, days: int = 30):
    """Manually trigger agent loop for a developer."""
    log = await agent.run_for_developer(developer_id, days=days)
    return {"run_id": log.run_id, "status": log.status, "steps": log.steps}


@router.post("/run-all")
async def run_all():
    """Trigger agent for all developers."""
    await agent.run_all_developers()
    return {"status": "triggered"}


@router.get("/runs")
async def get_runs(developer_id: str | None = None):
    runs = await db_service.get_agent_runs(developer_id)
    # Remove MongoDB _id
    for r in runs:
        r.pop("_id", None)
    return {"runs": runs}


@router.get("/tools")
async def list_mcp_tools():
    """List all registered MCP tools."""
    from app.mcp.tool_interface import mcp_registry
    return {"tools": mcp_registry.list_tools()}


@router.get("/developers")
async def list_developers():
    return {"developers": get_all_developers()}
