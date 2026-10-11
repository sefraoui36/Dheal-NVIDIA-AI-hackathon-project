"""DHeal Bio-Trust — FastAPI entry point."""

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
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