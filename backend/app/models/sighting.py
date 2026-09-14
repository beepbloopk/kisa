"""Pydantic models for cat sightings."""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ----------------------------
# Base Model
# ----------------------------

class SightingBase(BaseModel):
    """
    Shared fields common to creating and updating a sighting.
    Mirrors the sightings table schema in Supabase.
    """

    cat_id: Optional[UUID] = Field(
        default=None,
        description="ID of the cat that was sighted, if identified.",
    )

    reporter_id: Optional[UUID] = Field(
        default=None,
        description="ID of the user reporting the sighting, if known.",
    )

    location: Optional[dict] = Field(
        default=None,
        description="PostGIS geography value (stored as GeoJSON-compatible data).",
    )

    location_text: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Human-readable description of the sighting location.",
    )

    sighted_date: Optional[date] = Field(
        default=None,
        description="Date the sighting occurred.",
    )

    sighted_time: Optional[time] = Field(
        default=None,
        description="Time the sighting occurred.",
    )

    condition: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Observed condition of the cat.",
    )

    estimated_age: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Estimated age of the cat as observed during the sighting.",
    )

    coat_color: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Observed coat color.",
    )

    gender: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Observed gender, if determinable.",
    )

    behaviour: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Observed behaviour.",
    )

    number_of_cats: int = Field(
        default=1,
        ge=1,
        description="Number of cats observed.",
    )

    description: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes about the sighting.",
    )

    contact_preference: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Preferred contact method of the reporter.",
    )

    confirmed: bool = Field(
        default=False,
        description="Whether this sighting has been confirmed.",
    )

    match_status: str = Field(
        default="pending",
        max_length=50,
        description="Current matching status.",
    )

    match_confidence: Optional[float] = Field(
        default=None,
        ge=0,
        description="Numeric confidence score for the match.",
    )


# ----------------------------
# Create Model
# ----------------------------

class SightingCreate(SightingBase):
    """Fields required when creating a new sighting."""
    pass


# ----------------------------
# Update Model
# ----------------------------

class SightingUpdate(BaseModel):
    """Fields that may be updated on an existing sighting."""

    cat_id: Optional[UUID] = None
    reporter_id: Optional[UUID] = None
    location: Optional[dict] = None
    location_text: Optional[str] = Field(default=None, max_length=255)
    sighted_date: Optional[date] = None
    sighted_time: Optional[time] = None
    condition: Optional[str] = Field(default=None, max_length=255)
    estimated_age: Optional[str] = Field(default=None, max_length=100)
    coat_color: Optional[str] = Field(default=None, max_length=100)
    gender: Optional[str] = Field(default=None, max_length=50)
    behaviour: Optional[str] = Field(default=None, max_length=255)
    number_of_cats: Optional[int] = Field(default=None, ge=1)
    description: Optional[str] = Field(default=None, max_length=2000)
    contact_preference: Optional[str] = Field(default=None, max_length=255)
    confirmed: Optional[bool] = None
    match_status: Optional[str] = Field(default=None, max_length=50)
    match_confidence: Optional[float] = Field(
        default=None,
        ge=0,
        description="Numeric confidence score for the match.",
    )


# ----------------------------
# Response Model
# ----------------------------

class SightingResponse(SightingBase):
    """Representation of a sighting returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique identifier of the sighting.")
    created_at: datetime = Field(..., description="Timestamp when the sighting was created.")
    updated_at: datetime = Field(..., description="Timestamp when the sighting was last updated.")