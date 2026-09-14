# app/services/cat_service.py
"""Business logic for cats.

All Supabase access for cats lives here. Routes must stay thin
and only call into this service.
"""

from typing import Optional
from uuid import UUID

from fastapi import HTTPException

# NOTE: Adjust this import only if your project uses a different path.
from app.services.supabase_client import supabase

from app.models.cat import (
    CatCreate,
    CatListResponse,
    CatResponse,
    CatUpdate,
)

TABLE_NAME = "cats"


# ----------------------------
# CRUD
# ----------------------------

def create_cat(payload: CatCreate) -> CatResponse:
    """Create a new cat."""
    data = payload.model_dump(mode="json")

    result = supabase.table(TABLE_NAME).insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create cat")

    return result.data[0]


def get_cat_by_id(cat_id: UUID) -> CatResponse:
    """Fetch a single cat by id."""
    result = (
        supabase.table(TABLE_NAME)
        .select("*")
        .eq("id", str(cat_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Cat not found")

    return result.data


def get_all_cats(status: Optional[str] = None) -> CatListResponse:
    """Fetch all cats, optionally filtered by status."""
    query = supabase.table(TABLE_NAME).select("*")

    if status is not None:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()

    cats = result.data or []

    return CatListResponse(
        cats=cats,
        count=len(cats),
    )


def update_cat(cat_id: UUID, payload: CatUpdate) -> CatResponse:
    """Partially update an existing cat."""
    # Ensures a 404 is raised early if the cat does not exist.
    get_cat_by_id(cat_id)

    data = payload.model_dump(exclude_unset=True, mode="json")

    if not data:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    result = (
        supabase.table(TABLE_NAME)
        .update(data)
        .eq("id", str(cat_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update cat")

    return result.data[0]


def delete_cat(cat_id: UUID) -> None:
    """Delete a cat by id."""
    # Ensures a 404 is raised if the cat does not exist.
    get_cat_by_id(cat_id)

    result = (
        supabase.table(TABLE_NAME)
        .delete()
        .eq("id", str(cat_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to delete cat")