# app/routes/feed.py

"""
Feed routes.

Exposes read-only endpoints for browsing, searching, and locating
cats. Business logic lives in FeedService.
"""

from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.models.cat import CatResponse
from app.services.feed_service import (
    FeedService,
    FeedQueryError,
    InvalidLocationError,
    InvalidSearchQueryError,
)

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("/recent", response_model=List[CatResponse])
def get_recent_cats(
    limit: int = Query(20, gt=0, le=100),
) -> List[CatResponse]:
    """Return the most recently added cats."""
    try:
        return FeedService.get_recent_cats(limit)
    except FeedQueryError:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch recent cats.",
        )


@router.get("/search", response_model=List[CatResponse])
def search_cats(
    q: str = Query(..., min_length=1),
) -> List[CatResponse]:
    """Search cats."""
    try:
        return FeedService.search_cats(q)
    except InvalidSearchQueryError:
        raise HTTPException(
            status_code=400,
            detail="Search query must not be empty.",
        )
    except FeedQueryError:
        raise HTTPException(
            status_code=500,
            detail="Failed to search cats.",
        )


@router.get("/nearby", response_model=List[CatResponse])
def get_nearby_cats(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(5, gt=0),
) -> List[CatResponse]:
    """Return nearby cats."""
    try:
        return FeedService.get_nearby_cats(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )
    except InvalidLocationError:
        raise HTTPException(
            status_code=400,
            detail="Invalid location.",
        )
    except FeedQueryError:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch nearby cats.",
        )