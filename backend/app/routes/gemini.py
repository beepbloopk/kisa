"""
Gemini AI routes for Kisa.

Thin FastAPI routes that delegate all AI logic to GeminiService.
Request/response models are defined locally to this file.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/gemini", tags=["gemini"])

gemini_service = GeminiService()


# ----------------------------------------------------------------------
# Request / Response models
# ----------------------------------------------------------------------

class CatSummaryRequest(BaseModel):
    cat: dict


class CatSummaryResponse(BaseModel):
    summary: str


class ImageAnalysisRequest(BaseModel):
    image_url: str


class ImageAnalysisResponse(BaseModel):
    analysis: dict


class MatchRequest(BaseModel):
    cat: dict
    nearby_cats: list[dict]


class MatchResponse(BaseModel):
    matches: list


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------

@router.post("/summary", response_model=CatSummaryResponse)
def generate_summary(payload: CatSummaryRequest) -> CatSummaryResponse:
    """Generate a short AI summary for a cat."""
    try:
        summary = gemini_service.generate_cat_summary(payload.cat)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return CatSummaryResponse(summary=summary)


@router.post("/analyze-image", response_model=ImageAnalysisResponse)
def analyze_image(payload: ImageAnalysisRequest) -> ImageAnalysisResponse:
    """Analyze a cat image and return structured identifying features."""
    try:
        analysis = gemini_service.analyze_cat_image(payload.image_url)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ImageAnalysisResponse(analysis=analysis)


@router.post("/match", response_model=MatchResponse)
def suggest_matches(payload: MatchRequest) -> MatchResponse:
    """Suggest possible matches between a cat and nearby cats."""
    try:
        matches = gemini_service.suggest_possible_matches(
            payload.cat, payload.nearby_cats
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return MatchResponse(matches=matches)