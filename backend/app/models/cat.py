"""Pydantic models for cats."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ----------------------------
# Enums
# ----------------------------

class CatGender(str, Enum):
    """Observed or known gender of a cat."""

    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"


class AgeGroup(str, Enum):
    """Coarse age classification for a cat."""

    KITTEN = "kitten"
    YOUNG = "young"
    ADULT = "adult"
    SENIOR = "senior"
    UNKNOWN = "unknown"


class CatStatus(str, Enum):
    """Current status of a cat within the community care workflow."""

    STRAY = "stray"
    BEING_FED = "being_fed"
    UNDER_TREATMENT = "under_treatment"
    RESCUED = "rescued"
    ADOPTED = "adopted"
    UNKNOWN = "unknown"


# ----------------------------
# Base Model
# ----------------------------

class CatBase(BaseModel):
    """
    Shared fields common to creating and updating a cat.
    Mirrors the cats table schema in Supabase.
    """

    name: str = Field(
        ...,
        max_length=255,
        description="Name of the cat.",
    )

    nickname: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Alternative or informal name for the cat.",
    )

    gender: Optional[CatGender] = Field(
        default=None,
        description="Observed or known gender of the cat.",
    )

    age_group: Optional[AgeGroup] = Field(
        default=None,
        description="Coarse age classification of the cat.",
    )

    breed: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Breed of the cat, if known.",
    )

    color: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Coat color of the cat.",
    )

    coat_pattern: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Coat pattern of the cat.",
    )

    description: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Additional notes describing the cat.",
    )

    sterilized: Optional[bool] = Field(
        default=None,
        description="Whether the cat has been sterilized.",
    )

    vaccinated: Optional[bool] = Field(
        default=None,
        description="Whether the cat has been vaccinated.",
    )

    is_identified: Optional[bool] = Field(
        default=None,
        description="Whether the cat has been positively identified.",
    )

    location_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Human-readable description of the cat's usual location.",
    )

    latitude: Optional[float] = Field(
        default=None,
        ge=-90,
        le=90,
        description="Latitude where the cat is usually found.",
    )

    longitude: Optional[float] = Field(
        default=None,
        ge=-180,
        le=180,
        description="Longitude where the cat is usually found.",
    )

    status: Optional[CatStatus] = Field(
        default=None,
        description="Current status of the cat.",
    )

    profile_image_url: Optional[str] = Field(
        default=None,
        description="Public URL of the cat's profile image.",
    )


# ----------------------------
# Create Model
# ----------------------------

class CatCreate(CatBase):
    """Fields required when creating a new cat."""
    pass


# ----------------------------
# Update Model
# ----------------------------

class CatUpdate(BaseModel):
    """Fields that may be updated on an existing cat."""

    name: Optional[str] = Field(default=None, max_length=255)
    nickname: Optional[str] = Field(default=None, max_length=255)
    gender: Optional[CatGender] = None
    age_group: Optional[AgeGroup] = None
    breed: Optional[str] = Field(default=None, max_length=255)
    color: Optional[str] = Field(default=None, max_length=255)
    coat_pattern: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    sterilized: Optional[bool] = None
    vaccinated: Optional[bool] = None
    is_identified: Optional[bool] = None
    location_name: Optional[str] = Field(default=None, max_length=255)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    status: Optional[CatStatus] = None
    profile_image_url: Optional[str] = None


# ----------------------------
# Response Model
# ----------------------------

class CatResponse(CatBase):
    """Representation of a cat returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique identifier of the cat.")
    created_at: datetime = Field(..., description="Timestamp when the cat was created.")
    updated_at: datetime = Field(..., description="Timestamp when the cat was last updated.")


# ----------------------------
# List Response Model
# ----------------------------

class CatListResponse(BaseModel):
    """Representation of a collection of cats returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    cats: list[CatResponse] = Field(
        default_factory=list,
        description="List of cats matching the query.",
    )

    count: int = Field(
        ...,
        description="Total number of cats returned.",
    )