from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """Fields required to create a new comment on a cat."""

    username: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=2000)


class CommentUpdate(BaseModel):
    """Fields allowed when updating an existing comment."""

    content: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    """Comment data returned to the client."""

    id: UUID
    cat_id: UUID
    username: str
    content: str
    created_at: datetime