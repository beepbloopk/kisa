# app/routes/cats.py

"""Routes for cats.

Routes contain only request handling.
All business logic lives in app.services.cat_service.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.models.cat import (
    CatCreate,
    CatListResponse,
    CatResponse,
    CatUpdate,
)
from app.services import cat_service

router = APIRouter(
    prefix="/cats",
    tags=["Cats"],
)


@router.get("", response_model=CatListResponse)
def get_all_cats(
    status_filter: Optional[str] = Query(default=None, alias="status"),
) -> CatListResponse:
    """Get all cats, optionally filtered by status."""
    return cat_service.get_all_cats(status=status_filter)


@router.get("/{cat_id}", response_model=CatResponse)
def get_cat_by_id(cat_id: UUID) -> CatResponse:
    """Get a single cat by id."""
    return cat_service.get_cat_by_id(cat_id)


@router.post(
    "",
    response_model=CatResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_cat(payload: CatCreate) -> CatResponse:
    """Create a new cat."""
    return cat_service.create_cat(payload)


@router.patch("/{cat_id}", response_model=CatResponse)
def update_cat(cat_id: UUID, payload: CatUpdate) -> CatResponse:
    """Partially update an existing cat."""
    return cat_service.update_cat(cat_id, payload)


@router.delete(
    "/{cat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_cat(cat_id: UUID) -> None:
    """Delete a cat by id."""
    cat_service.delete_cat(cat_id)