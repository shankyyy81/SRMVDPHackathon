from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
from groq import Groq
from app.core.config import settings
import json
import asyncio

router = APIRouter()

# =========================================================
# LOAD MODEL
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = str(BASE_DIR / "ml_model")

tokenizer = None
model = None
device = None
_model_load_error: str | None = None


def _load_model():
    """Lazy-load the SDG model on first use."""
    global tokenizer, model, device, _model_load_error

    if model is not None:
        return  # already loaded

    if _model_load_error is not None:
        return  # already failed — don't retry

    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
        model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_PATH,
            local_files_only=True
        )
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()
    except Exception as e:
        _model_load_error = (
            f"SDG model not found at '{MODEL_PATH}'. "
            f"Please place the model files there and restart. Details: {e}"
        )


# =========================================================
# SCHEMAS
# =========================================================

class AnalysisRequest(BaseModel):
    problem_statement: str


class TargetSuggestion(BaseModel):
    target_id: str
    description: str
    confidence: float


class SdgSuggestion(BaseModel):
    sdg: str
    confidence: float
    targets: List[TargetSuggestion] = []


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

    _load_model()

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

async def get_targets_for_sdgs(problem_statement: str, sdg_list: List[SdgSuggestion]) -> List[SdgSuggestion]:
    if not sdg_list or not getattr(settings, "GROQ_API_KEY", None):
        return sdg_list

    sdg_names = [s.sdg for s in sdg_list]
    client = Groq(api_key=settings.GROQ_API_KEY)
    
    system_prompt = (
        "You are an expert on the UN Sustainable Development Goals. "
        "Your task is to predict the specific numbered UN targets (e.g., '7.2', '13.1') that best fit the problem statement, "
        "restricted ONLY to the provided high-level SDGs. "
        "Output a JSON object with a single key 'targets' containing a list of objects. "
        "Each object must have: 'sdg_name' (string, matching the input exactly), "
        "'target_id' (string), 'description' (string), 'confidence' (float between 0.0 and 1.0)."
    )
    user_prompt = (
        f"Problem statement: '{problem_statement}'\n"
        f"Restricted SDGs: {sdg_names}\n"
        "CRITICAL INSTRUCTION: You MUST evaluate and return at least 1 or 2 specific, relevant targets for EVERY SINGLE SDG listed in the 'Restricted SDGs' list. "
        "Do not skip any SDG. Output JSON."
    )

    try:
        def fetch():
            return client.chat.completions.create(
                model=getattr(settings, "GROQ_MODEL", "llama-3-8b-8192"),
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        
        loop = asyncio.get_running_loop()
        completion = await loop.run_in_executor(None, fetch)
        
        content = completion.choices[0].message.content
        data = json.loads(content)
        
        result = []
        for s in sdg_list:
            s_dict = s.dict()
            s_dict["targets"] = []
            
            for t in data.get("targets", []):
                if t.get("sdg_name") == s.sdg or s.sdg.startswith(str(t.get("sdg_name", ""))[:6]):
                    conf_val = float(t.get("confidence", 0.0))
                    if conf_val >= 0.80:
                        s_dict["targets"].append(
                            TargetSuggestion(
                                target_id=str(t.get("target_id", "")),
                                description=str(t.get("description", "")),
                                confidence=conf_val
                            )
                        )
            
            s_dict["targets"].sort(key=lambda x: x.confidence, reverse=True)
            result.append(SdgSuggestion(**s_dict))
            
        return result
        
    except Exception as e:
        print(f"Error fetching targets: {e}")
        return sdg_list


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_problem_statement(request: AnalysisRequest):

    if not request.problem_statement.strip():
        raise HTTPException(status_code=400, detail="Problem statement cannot be empty")

    _load_model()
    if _model_load_error:
        raise HTTPException(status_code=503, detail=_model_load_error)

    try:
        applied, strong = predict_sdgs(request.problem_statement)

        applied_with_targets = await get_targets_for_sdgs(request.problem_statement, applied)
        strong_with_targets = await get_targets_for_sdgs(request.problem_statement, strong)

        return AnalysisResponse(
            applied_sdgs=applied_with_targets,
            most_suitable_sdgs=strong_with_targets
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))