from fastapi import APIRouter, HTTPException

from app.services.map_service import MapService

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/cats")
def get_map_cats():
    """Return every cat marker that has valid coordinates."""
    return MapService.get_all_map_cats()


@router.get("/cats/{cat_id}")
def get_map_cat(cat_id: str):
    """Return a single cat's map data for popup/details display."""
    cat = MapService.get_map_cat_by_id(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Cat not found")
    return cat