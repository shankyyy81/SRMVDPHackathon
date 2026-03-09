from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path

router = APIRouter()

# =========================================================
# LOAD MODEL
# =========================================================

try:
    BASE_DIR = Path(__file__).resolve().parent.parent
    MODEL_PATH = str(BASE_DIR / "ml_model")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=True)

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_PATH,
        local_files_only=True
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.eval()

except Exception as e:
    raise RuntimeError(f"❌ Failed to load SDG model: {e}")


# =========================================================
# SCHEMAS
# =========================================================

class AnalysisRequest(BaseModel):
    problem_statement: str


class SdgSuggestion(BaseModel):
    sdg: str
    confidence: float


class AnalysisResponse(BaseModel):
    applied_sdgs: List[SdgSuggestion]
    most_suitable_sdgs: List[SdgSuggestion]
    model_name: str = "SDG-BERT"


# =========================================================
# LABELS
# =========================================================

SDG_NAMES = [
    "SDG 1: No Poverty",
    "SDG 2: Zero Hunger",
    "SDG 3: Good Health and Well-being",
    "SDG 4: Quality Education",
    "SDG 5: Gender Equality",
    "SDG 6: Clean Water and Sanitation",
    "SDG 7: Affordable and Clean Energy",
    "SDG 8: Decent Work and Economic Growth",
    "SDG 9: Industry, Innovation and Infrastructure",
    "SDG 10: Reduced Inequalities",
    "SDG 11: Sustainable Cities and Communities",
    "SDG 12: Responsible Consumption and Production",
    "SDG 13: Climate Action",
    "SDG 14: Life Below Water",
    "SDG 15: Life on Land",
    "SDG 16: Peace, Justice and Strong Institutions",
    "SDG 17: Partnerships for the Goals"
]


# =========================================================
# PREDICTION FUNCTION (YOUR LOGIC INTEGRATED)
# =========================================================

MIN_CONF = 0.3
HIGH_CONF = 0.7

def predict_sdgs(text: str):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256
    ).to(device)

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.sigmoid(logits)[0]

    # ---------- Applied SDGs ----------
    applied = []
    for i, p in enumerate(probs):
        conf = p.item()
        if conf >= MIN_CONF:
            applied.append((i, conf))

    applied.sort(key=lambda x: x[1], reverse=True)

    # ---------- Most Suitable SDGs ----------
    strong = [(i, conf) for i, conf in applied if conf >= HIGH_CONF]

    # fallback if none strong
    if not strong and applied:
        strong = applied[:2]

    # format results
    applied_sdgs = [
        SdgSuggestion(
            sdg=SDG_NAMES[i],
            confidence=round(conf * 100, 1)
        )
        for i, conf in applied
    ]

    strong_sdgs = [
        SdgSuggestion(
            sdg=SDG_NAMES[i],
            confidence=round(conf * 100, 1)
        )
        for i, conf in strong
    ]

    return applied_sdgs, strong_sdgs


# =========================================================
# API ENDPOINT
# =========================================================

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_problem_statement(request: AnalysisRequest):

    if not request.problem_statement.strip():
        raise HTTPException(status_code=400, detail="Problem statement cannot be empty")

    try:
        applied, strong = predict_sdgs(request.problem_statement)

        return AnalysisResponse(
            applied_sdgs=applied,
            most_suitable_sdgs=strong
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
