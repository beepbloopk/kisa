from typing import List, Optional

from fastapi import APIRouter, Query

from app.models.cat import CatResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/cats", response_model=List[CatResponse])
def search_cats(
    name: Optional[str] = Query(default=None, description="Partial match on cat name"),
    nickname: Optional[str] = Query(default=None, description="Partial match on cat nickname"),
    color: Optional[str] = Query(default=None, description="Partial match on cat color"),
    coat_pattern: Optional[str] = Query(default=None, description="Partial match on coat pattern"),
    breed: Optional[str] = Query(default=None, description="Partial match on breed"),
    gender: Optional[str] = Query(default=None, description="Exact match on gender"),
    status: Optional[str] = Query(default=None, description="Exact match on cat status"),
    age_group: Optional[str] = Query(default=None, description="Exact match on age group"),
    location_name: Optional[str] = Query(default=None, description="Partial match on location name"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
) -> List[CatResponse]:
    """
    Search and filter cats based on optional query parameters with pagination.
    """

    return SearchService.search_cats(
        name=name,
        nickname=nickname,
        color=color,
        coat_pattern=coat_pattern,
        breed=breed,
        gender=gender,
        status=status,
        age_group=age_group,
        location_name=location_name,
        limit=limit,
        offset=offset,
    )