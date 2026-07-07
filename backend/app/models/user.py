# app/models/user.py

"""
Pydantic models for user profiles.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    """
    Public representation of a user's profile.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="User UUID")
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None, max_length=30)
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """
    Fields a user is allowed to update.
    """

    display_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    avatar_url: Optional[str] = Field(default=None)

    phone: Optional[str] = Field(
        default=None,
        max_length=30,
    )