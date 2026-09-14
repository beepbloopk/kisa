"""Pydantic models for SOS reports.

Matches the `sos_reports` SQL table exactly:

    id uuid PRIMARY KEY DEFAULT gen_random_uuid()
    cat_id uuid NULL REFERENCES cats(id) ON DELETE SET NULL
    reporter_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL
    location geography NOT NULL
    description text
    status text NOT NULL DEFAULT 'active'
    created_at timestamptz NOT NULL DEFAULT now()
    updated_at timestamptz NOT NULL DEFAULT now()
    resolved_at timestamptz NULL

Note: the table stores a single PostGIS `geography` point in the
`location` column. These models expose that point as separate
`latitude` / `longitude` fields for ease of use over the API; the
service layer is responsible for converting between the two
representations.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SOSStatus(str, Enum):
    """Allowed values for sos_reports.status."""

    active = "active"
    in_progress = "in_progress"
    resolved = "resolved"


class SOSBase(BaseModel):
    """Fields shared across SOS report create/update/response models."""

    cat_id: Optional[UUID] = None
    reporter_id: Optional[UUID] = None
    description: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class SOSCreate(SOSBase):
    """Payload for creating a new SOS report."""

    status: SOSStatus = SOSStatus.active


class SOSUpdate(BaseModel):
    """Payload for partially updating an SOS report.

    All fields are optional since this model backs a PATCH endpoint.
    """

    cat_id: Optional[UUID] = None
    reporter_id: Optional[UUID] = None
    description: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    status: Optional[SOSStatus] = None
    resolved_at: Optional[datetime] = None


class SOSResponse(SOSBase):
    """SOS report as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: SOSStatus
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None