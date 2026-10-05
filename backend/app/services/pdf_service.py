"""
Generate clinician-friendly, brand-consistent PDF reports.

Two modes:
  - build_report_pdf(replay)       → full multi-page technical report
  - build_prep_pdf(replay, prep)   → one-page doctor-visit prep brief
"""

import io
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---- brand palette ----
CORAL = colors.HexColor("#FF6B6B")
DEEP_CORAL = colors.HexColor("#AE2F34")
MINT = colors.HexColor("#4ECDC4")
DEEP_MINT = colors.HexColor("#006A65")
AMBER = colors.HexColor("#FFB347")
DEEP_AMBER = colors.HexColor("#D9822B")
NAVY = colors.HexColor("#1A1A2E")
SLATE = colors.HexColor("#584140")
OUTLINE = colors.HexColor("#8C706F")
LIGHT = colors.HexColor("#F5F2FF")
SOFT_RED = colors.HexColor("#FFDAD6")
SOFT_AMBER = colors.HexColor("#FFDDB6")
SOFT_MINT = colors.HexColor("#A8F5EE")
CREAM = colors.HexColor("#FFF8F0")

VERDICT_COLORS = {
    "TRUSTED": SOFT_MINT,
    "SUSPICIOUS": SOFT_AMBER,
    "FLAGGED": SOFT_RED,
}

ASSETS_DIR = Path(__file__).resolve().parent.parent.parent / "assets"


def _styles():
    styles = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle(
            "h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
            fontSize=20, textColor=NAVY, spaceAfter=0,
        ),
        "h2": ParagraphStyle(
            "h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
            fontSize=12, textColor=NAVY, spaceBefore=10, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body", parent=styles["BodyText"], fontName="Helvetica",
            fontSize=9.5, leading=13, textColor=SLATE,
        ),
        "small": ParagraphStyle(
            "small", parent=styles["BodyText"], fontName="Helvetica",
            fontSize=8, textColor=OUTLINE,
        ),
        "mono": ParagraphStyle(
            "mono", parent=styles["BodyText"], fontName="Courier", fontSize=8.5,
        ),
        "brand": ParagraphStyle(
            "brand", parent=styles["BodyText"], fontName="Helvetica-Bold",
            fontSize=16, textColor=NAVY, spaceAfter=0,
        ),
        "brand_sub": ParagraphStyle(
            "brand_sub", parent=styles["BodyText"], fontName="Helvetica",
            fontSize=9, textColor=OUTLINE, spaceAfter=0,
        ),
        "question": ParagraphStyle(
            "question", parent=styles["BodyText"], fontName="Helvetica",
            fontSize=10, leading=14, textColor=NAVY, leftIndent=8,
        ),
    }


def _header_table(styles):
    left = [
        Paragraph("DHeal <font color='#4ECDC4'>Bio-Trust</font>", styles["brand"]),
        Paragraph(
            "Clinician Summary · AI reasoning grounded in verified evidence",
            styles["brand_sub"],
        ),
    ]
    right = []
    logo = ASSETS_DIR / "dheal-mascot.png"
    if logo.exists():
        right.append(Image(str(logo), width=20 * mm, height=20 * mm))

    header = Table(
        [[left, right[0] if right else Paragraph("", styles["body"])]],
        colWidths=[130 * mm, 40 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return header


# ============================================================
# Charts
# ============================================================


def _trust_donut(score: int, tier: str) -> bytes:
    tier_colors = {
        "EXCELLENT": "#4ECDC4",
        "GOOD": "#5DD9D0",
        "DEGRADED": "#FFB347",
        "UNTRUSTWORTHY": "#FF6B6B",
    }
    fill = tier_colors.get(tier, "#8C706F")

    fig, ax = plt.subplots(figsize=(2.4, 2.4), dpi=180)
    ax.pie(
        [score, max(0, 100 - score)],
        colors=[fill, "#EFECFF"],
        startangle=90,
        counterclock=False,
        wedgeprops=dict(width=0.28, edgecolor="white", linewidth=2),
    )
    ax.text(0, 0.08, str(score), ha="center", va="center",
            fontsize=30, fontweight="bold", color="#1A1A2E")
    ax.text(0, -0.24, "/100", ha="center", va="center",
            fontsize=11, color="#8C706F")
    ax.text(0, -0.48, tier, ha="center", va="center",
            fontsize=10, fontweight="bold", color=fill)
    ax.set_aspect("equal")
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", transparent=True)
    plt.close(fig)
    return buf.getvalue()


def _verdict_bars(summary: dict) -> bytes:
    labels = ["Trusted", "Suspicious", "Flagged"]
    values = [
        summary.get("trusted", 0),
        summary.get("suspicious", 0),
        summary.get("flagged", 0),
    ]
    colors_bar = ["#4ECDC4", "#FFB347", "#FF6B6B"]

    fig, ax = plt.subplots(figsize=(4.2, 1.9), dpi=180)
    bars = ax.barh(labels, values, color=colors_bar, height=0.55)
    for b, v in zip(bars, values):
        ax.text(
            v + max(values) * 0.02 + 0.5,
            b.get_y() + b.get_height() / 2,
            str(v),
            va="center",
            fontsize=10,
            color="#1A1A2E",
            fontweight="bold",
        )
    ax.set_xlim(0, max(values + [1]) * 1.25)
    ax.spines[["top", "right", "bottom"]].set_visible(False)
    ax.tick_params(axis="x", length=0, labelsize=8, colors="#8C706F")
    ax.tick_params(axis="y", length=0, labelsize=10, colors="#1A1A2E")
    ax.set_xticks([])

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", transparent=True)
    plt.close(fig)
    return buf.getvalue()


def _hr_timeline(timeline: list) -> bytes:
    xs = list(range(len(timeline)))
    hr = [r["metrics"]["heart_rate"] for r in timeline]

    fig, ax = plt.subplots(figsize=(7.5, 2.4), dpi=180)
    ax.plot(xs, hr, color="#006A65", linewidth=1.6, zorder=2)

    for i, r in enumerate(timeline):
        v = r["verdict"]
        if v == "TRUSTED":
            continue
        color = "#D9822B" if v == "SUSPICIOUS" else "#AE2F34"
        ax.scatter([i], [r["metrics"]["heart_rate"]], color=color, s=70,
                   zorder=3, edgecolor="white", linewidth=1.2)
        ax.annotate(
            f"{r['metrics']['heart_rate']} bpm",
            (i, r["metrics"]["heart_rate"]),
            textcoords="offset points",
            xytext=(0, 10),
            ha="center",
            fontsize=7.5,
            color=color,
            fontweight="bold",
        )

    ax.set_xticks([])
    ax.set_xlim(-1, len(xs))
    ax.set_ylim(40, max(hr + [100]) + 25)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines["left"].set_color("#E0BFBD")
    ax.spines["bottom"].set_color("#E0BFBD")
    ax.tick_params(axis="y", labelsize=8, colors="#8C706F")
    ax.grid(axis="y", linestyle="--", linewidth=0.5, color="#EFECFF", zorder=0)
    ax.set_ylabel("Heart rate (bpm)", fontsize=8.5, color="#8C706F")

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", transparent=True)
    plt.close(fig)
    return buf.getvalue()


# ============================================================
# Full technical report
# ============================================================


def build_report_pdf(replay: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=12 * mm,
        bottomMargin=16 * mm,
        title="DHeal Bio-Trust Report",
        author="DHeal",
    )
    styles = _styles()
    story = []

    # header
    story.append(_header_table(styles))
    story.append(HRFlowable(width="100%", thickness=1.2, color=CORAL, spaceBefore=6))

    ts = replay.get("trust_score", {})
    score = ts.get("score", 0)
    tier = ts.get("tier", "UNKNOWN")
    integrity = replay.get("integrity", {})
    summary = replay.get("summary", {})
    window = replay.get("window", {})

    # metadata + donut
    meta_rows = [
        ["User", replay.get("user_id", "—")],
        ["Window", f"{window.get('start', '—')}  →  {window.get('end', '—')}"],
        ["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Trust Score", f"{score}/100  ({tier})"],
        ["SHA-256 chain", "VALID" if integrity.get("valid") else "BROKEN"],
        [
            "Records",
            f"{summary.get('total_records', 0)} total · "
            f"{summary.get('trusted', 0)} trusted · "
            f"{summary.get('suspicious', 0)} suspicious · "
            f"{summary.get('flagged', 0)} flagged",
        ],
    ]
    meta_table = Table(meta_rows, colWidths=[26 * mm, 88 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8.5),
                ("FONT", (1, 0), (1, -1), "Helvetica", 8.5),
                ("TEXTCOLOR", (0, 0), (-1, -1), SLATE),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("LINEBELOW", (0, 0), (-1, -2), 0.2, colors.HexColor("#E0BFBD")),
            ]
        )
    )

    donut_bytes = _trust_donut(score, tier)
    donut_img = Image(io.BytesIO(donut_bytes), width=34 * mm, height=34 * mm)

    top_row = Table([[meta_table, donut_img]], colWidths=[118 * mm, 50 * mm])
    top_row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(top_row)
    story.append(Spacer(1, 6))

    # verdict bars
    story.append(Paragraph("Record Distribution", styles["h2"]))
    bars_bytes = _verdict_bars(summary)
    story.append(Image(io.BytesIO(bars_bytes), width=110 * mm, height=50 * mm))

    # HR timeline
    story.append(Paragraph("72-Hour Heart Rate Replay", styles["h2"]))
    hr_bytes = _hr_timeline(replay.get("timeline", []))
    story.append(Image(io.BytesIO(hr_bytes), width=178 * mm, height=57 * mm))
    story.append(
        Paragraph(
            "Green = trusted. Amber = suspicious. Red = flagged.",
            styles["small"],
        )
    )

    # baseline vs episode
    baseline = replay.get("baseline", {})
    if baseline:
        story.append(Paragraph("Baseline vs Episode", styles["h2"]))
        bl_rows = [["Metric", "Baseline mean", "Baseline range", "Episode peak"]]
        tl = replay.get("timeline", [])
        for metric, s in baseline.items():
            peak = 0.0
            if tl and metric in tl[0]["metrics"]:
                peak = max(r["metrics"][metric] for r in tl)
            bl_rows.append(
                [
                    metric.replace("_", " ").title(),
                    f"{s['mean']:.2f}",
                    f"{s['lower_bound']:.1f} – {s['upper_bound']:.1f}",
                    f"{peak:.2f}",
                ]
            )
        bl_table = Table(bl_rows, colWidths=[50 * mm, 40 * mm, 50 * mm, 38 * mm])
        bl_table.setStyle(
            TableStyle(
                [
                    ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5),
                    ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                    ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
                    ("FONT", (0, 1), (-1, -1), "Helvetica", 8.5),
                    ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.4, colors.HexColor("#E0BFBD")),
                    ("LINEBELOW", (0, 1), (-1, -2), 0.15, colors.HexColor("#EFECFF")),
                ]
            )
        )
        story.append(bl_table)

    # AI analysis
    analysis = replay.get("ai_analysis", {})
    if analysis and analysis.get("headline"):
        story.append(Paragraph("AI Investigation — Nemotron", styles["h2"]))
        story.append(Paragraph(f"<b>{analysis.get('headline', '')}</b>", styles["body"]))
        story.append(Spacer(1, 3))

        confidence = analysis.get("confidence", "—")
        conf_color = {"HIGH": "#006A65", "MODERATE": "#D9822B", "LIMITED": "#AE2F34"}.get(
            confidence, "#584140"
        )
        story.append(
            Paragraph(
                f"<b>Confidence:</b> <font color='{conf_color}'>{confidence}</font> — "
                f"{analysis.get('confidence_reason', '')}",
                styles["body"],
            )
        )

        for item in analysis.get("what_changed", [])[:5]:
            story.append(Paragraph(f"• {item}", styles["body"]))

        for item in analysis.get("next_steps", [])[:4]:
            story.append(Paragraph(f"→ {item}", styles["body"]))

    # timeline table
    story.append(Paragraph("Verified Timeline", styles["h2"]))
    header_row = ["Timestamp", "HR", "Sleep", "Steps", "Act", "Stress", "Verdict"]
    rows = [header_row]
    for r in replay.get("timeline", []):
        m = r["metrics"]
        rows.append(
            [
                r["timestamp"][:16],
                str(m["heart_rate"]),
                f"{m['sleep_hours']:.1f}",
                str(m["steps"]),
                str(m["activity_minutes"]),
                str(m["stress_level"]),
                r["verdict"],
            ]
        )
    timeline_table = Table(
        rows,
        colWidths=[38 * mm, 14 * mm, 16 * mm, 18 * mm, 14 * mm, 16 * mm, 28 * mm],
        repeatRows=1,
    )
    table_style = [
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
        ("FONT", (0, 1), (-1, -1), "Courier", 7.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), SLATE),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LINEBELOW", (0, 0), (-1, 0), 0.4, colors.HexColor("#E0BFBD")),
        ("LINEBELOW", (0, 1), (-1, -2), 0.15, colors.HexColor("#EFECFF")),
    ]
    for i, r in enumerate(replay.get("timeline", []), start=1):
        bg = VERDICT_COLORS.get(r["verdict"])
        if bg:
            table_style.append(("BACKGROUND", (-1, i), (-1, i), bg))
            table_style.append(("FONT", (-1, i), (-1, i), "Helvetica-Bold", 7.5))
    timeline_table.setStyle(TableStyle(table_style))
    story.append(timeline_table)

    # signature block
    story.append(Spacer(1, 14))
    seal_left = [
        Paragraph(
            "<b>Verified by DHeal Bio-Trust</b><br/>"
            "<font size='8' color='#8C706F'>"
            "SHA-256 hash chain integrity confirmed · Trust Score: "
            "40 pts integrity + 40 pts trusted ratio + 20 pts AI confidence."
            "</font>",
            styles["small"],
        )
    ]
    logo_center = []
    logo_path = ASSETS_DIR / "dheal-logo.png"
    if logo_path.exists():
        logo_center.append(Image(str(logo_path), width=42 * mm, height=14 * mm))

    signature_right = [
        Paragraph(
            "<br/><br/>"
            "<font size='8' color='#8C706F'>"
            "_________________________<br/>"
            "Reviewed by clinician (optional)"
            "</font>",
            styles["small"],
        )
    ]

    sig_table = Table(
        [[seal_left, logo_center or [Paragraph("", styles["small"])], signature_right]],
        colWidths=[80 * mm, 45 * mm, 53 * mm],
    )
    sig_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("ALIGN", (2, 0), (2, 0), "RIGHT"),
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E0BFBD")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(KeepTogether([sig_table]))

    # footer
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.4, color=colors.HexColor("#E0BFBD")))
    story.append(
        Paragraph(
            "<b>Not a diagnosis.</b> This report contains AI reasoning over "
            "cryptographically verified health data. It is not medical advice.",
            styles["small"],
        )
    )
    story.append(
        Paragraph(
            "Generated by DHeal Bio-Trust · Trust the data before trusting the AI",
            styles["small"],
        )
    )

    doc.build(story)
    return buffer.getvalue()


# ============================================================
# Doctor visit prep brief
# ============================================================


def build_prep_pdf(replay: dict, prep: dict) -> bytes:
    """One-page doctor-visit prep brief."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title="DHeal Doctor Prep",
        author="DHeal Bio-Trust",
    )
    styles = _styles()
    story = []

    story.append(_header_table(styles))
    story.append(HRFlowable(width="100%", thickness=1.2, color=CORAL, spaceBefore=6))
    story.append(Spacer(1, 6))

    ts = replay.get("trust_score", {})
    window = replay.get("window", {})

    story.append(
        Paragraph(
            f"<b>Doctor Visit Prep</b> · {replay.get('user_id', '—')} · "
            f"{window.get('start', '')[:10]} → {window.get('end', '')[:10]}",
            styles["h2"],
        )
    )
    story.append(
        Paragraph(
            f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} · "
            f"Trust score {ts.get('score', '—')}/100 ({ts.get('tier', '—')}) · "
            f"SHA-256 chain {'VALID' if replay.get('integrity', {}).get('valid') else 'BROKEN'}",
            styles["small"],
        )
    )
    story.append(Spacer(1, 8))

    if prep.get("summary"):
        story.append(Paragraph("<b>In one sentence</b>", styles["h2"]))
        story.append(Paragraph(prep["summary"], styles["body"]))
        story.append(Spacer(1, 6))

    if prep.get("reassurance"):
        box = Table(
            [[Paragraph(f"<b>{prep['reassurance']}</b>", styles["body"])]],
            colWidths=[174 * mm],
        )
        box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), SOFT_MINT),
                    ("BOX", (0, 0), (-1, -1), 0.5, DEEP_MINT),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(box)
        story.append(Spacer(1, 8))

    changes = prep.get("changes_since_baseline", [])
    if changes:
        story.append(Paragraph("<b>Changes since your baseline</b>", styles["h2"]))
        for c in changes:
            story.append(Paragraph(f"• {c}", styles["body"]))
        story.append(Spacer(1, 6))

    verified = prep.get("verified_days", 0)
    unverified = prep.get("unverified_days", 0)
    story.append(Paragraph("<b>Data verification</b>", styles["h2"]))
    story.append(
        Paragraph(
            f"Of the days in this window, <b>{verified}</b> were fully verified "
            f"and <b>{unverified}</b> contained readings that couldn't be "
            f"trusted and were excluded from AI conclusions.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 6))

    concerns = prep.get("concerns", [])
    if concerns:
        story.append(Paragraph("<b>Readings worth discussing</b>", styles["h2"]))
        for c in concerns:
            story.append(Paragraph(f"• {c}", styles["body"]))
        story.append(Spacer(1, 6))

    questions = prep.get("questions_for_doctor", [])
    if questions:
        story.append(Paragraph("<b>Questions to ask your doctor</b>", styles["h2"]))
        for q in questions:
            story.append(Paragraph(f"• {q}", styles["question"]))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E0BFBD")))
    story.append(
        Paragraph(
            "<b>Not a diagnosis.</b> This brief summarizes AI reasoning over "
            "cryptographically verified health data. It is not medical advice.",
            styles["small"],
        )
    )
    story.append(
        Paragraph(
            "Generated by DHeal Bio-Trust · Trust the data before trusting the AI",
            styles["small"],
        )
    )

    doc.build(story)
    return buffer.getvalue()