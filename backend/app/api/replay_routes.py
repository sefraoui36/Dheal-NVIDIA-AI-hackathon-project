"""Full health replay + PDF export."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.ai.nemotron_client import analyze_replay
from app.models.schemas import ReplayRequest
from app.services.pdf_service import build_report_pdf
from app.services.replay_service import build_replay

router = APIRouter(prefix="/health", tags=["health"])


@router.post("/replay")
def health_replay(req: ReplayRequest):
    try:
        return build_replay(req.user_id, hours=req.hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/report/pdf")
def report_pdf(req: ReplayRequest):
    """
    Generate a clinician-friendly PDF for the current window.
    Includes the Nemotron analysis and trust score.
    """
    try:
        replay = build_replay(req.user_id, hours=req.hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Attach AI analysis if Nemotron is reachable
    try:
        analysis = analyze_replay(replay)
        replay["ai_analysis"] = analysis if isinstance(analysis, dict) else {}
    except Exception:
        # PDF is still useful without the AI section
        replay["ai_analysis"] = {}

    try:
        pdf_bytes = build_report_pdf(replay)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    filename = f"dheal_report_{req.user_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )