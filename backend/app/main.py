"""DHeal Bio-Trust — FastAPI entry point."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    ai_routes,
    attack_routes,
    baseline_routes,
    challenges_routes,
    data_routes,
    family_routes,
    mood_routes,
    mood_support_routes,
    profile_routes,
    recommendations_routes,
    replay_routes,
    security_routes,
    telemetry_routes,
    timeline_routes,
    tracking_routes,
)

app = FastAPI(
    title="DHeal Bio-Trust",
    description="Trust-verified health-data analysis with Nemotron.",
    version="0.3.0",
)

# ---- CORS origins ----
# In production, set ALLOWED_ORIGINS env var (comma-separated).
# Example: ALLOWED_ORIGINS=https://dheal.vercel.app,http://localhost:5173
_allowed_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if _allowed_env:
    allowed_origins = [o.strip() for o in _allowed_env.split(",") if o.strip()]
else:
    # Dev defaults
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_routes.router)
app.include_router(timeline_routes.router)
app.include_router(baseline_routes.router)
app.include_router(security_routes.router)
app.include_router(replay_routes.router)
app.include_router(ai_routes.router)
app.include_router(attack_routes.router)
app.include_router(mood_routes.router)
app.include_router(mood_support_routes.router)
app.include_router(telemetry_routes.router)
app.include_router(profile_routes.router)
app.include_router(tracking_routes.router)
app.include_router(family_routes.router)
app.include_router(challenges_routes.router)
app.include_router(recommendations_routes.router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "project": "DHeal Bio-Trust",
        "tagline": "Trust the data before trusting the AI",
        "version": "0.3.0",
    }