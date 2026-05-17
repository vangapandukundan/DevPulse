"""
DevPulse Backend  FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_db, disconnect_db
from app.api.routes import activity, insights, actions, reviews, auth, agent
from app.agent.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    print("[DevPulse] Starting up...")
    await connect_db()
    start_scheduler()
    print("[DevPulse] Agent scheduler started")
    yield
    stop_scheduler()
    await disconnect_db()
    print("[DevPulse] Shut down.")


app = FastAPI(
    title="DevPulse  Developer Intelligence Agent",
    description="Autonomous AI agent for developer activity analysis and action execution.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Register Routers 
app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(activity.router, prefix="/api/activity", tags=["Activity"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(actions.router,  prefix="/api/actions",  tags=["Actions"])
app.include_router(reviews.router,  prefix="/api/reviews",  tags=["Reviews"])
app.include_router(agent.router,    prefix="/api/agent",    tags=["Agent"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "app": "DevPulse",
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
    
