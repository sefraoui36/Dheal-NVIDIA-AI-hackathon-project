"""Pydantic request/response models for the API."""

from pydantic import BaseModel


class ReplayRequest(BaseModel):
    user_id: str = "user_001"
    hours: int = 24


class SimulateAttackRequest(BaseModel):
    user_id: str = "user_001"
    attack_hour_offset: int = 24
    injected_hr: int = 198


class AttackResult(BaseModel):
    status: str
    user_id: str
    attack_timestamp: str
    original_hr: int
    injected_hr: int
    attacked_file: str
class AskRequest(BaseModel):
    user_id: str = "user_001"
    hours: int = 72
    question: str


class MoodEntry(BaseModel):
    user_id: str = "user_001"
    score: int  # 1..5
    note: str | None = None

class MoodResponse(BaseModel):
    user_id: str
    entries: list[dict]
    today: int | None = None

class TrackingEntry(BaseModel):
    user_id: str
    type: str  # "glucose" | "bp" | "pain" | "wound" | "hot_flash" | "kick" | "weight"
    data: dict  # arbitrary per-type payload, validated on the frontend


class TrackingResponse(BaseModel):
    user_id: str
    entries: list[dict]