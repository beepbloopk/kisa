# app/routes/sighting.py
"""Routes for cat sightings.

Routes contain only request handling. All business logic lives in
app.services.sighting_service.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, status

from app.models.sighting import SightingCreate, SightingResponse, SightingUpdate
from app.services import sighting_service

router = APIRouter(prefix="/sightings", tags=["sightings"])


@router.post("", response_model=SightingResponse, status_code=status.HTTP_201_CREATED)
def create_sighting(payload: SightingCreate) -> SightingResponse:
    """Create a new sighting."""
    return sighting_service.create_sighting(payload)


@router.get("", response_model=list[SightingResponse])
def get_all_sightings(cat_id: Optional[UUID] = None) -> list[SightingResponse]:
    """Get all sightings, optionally filtered by cat_id."""
    return sighting_service.get_all_sightings(cat_id)


@router.get("/{sighting_id}", response_model=SightingResponse)
def get_sighting_by_id(sighting_id: UUID) -> SightingResponse:
    """Get a single sighting by id."""
    return sighting_service.get_sighting_by_id(sighting_id)


@router.patch("/{sighting_id}", response_model=SightingResponse)
def update_sighting(sighting_id: UUID, payload: SightingUpdate) -> SightingResponse:
    """Partially update an existing sighting."""
    return sighting_service.update_sighting(sighting_id, payload)


@router.delete("/{sighting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sighting(sighting_id: UUID) -> None:
    """Delete a sighting by id."""
    sighting_service.delete_sighting(sighting_id)