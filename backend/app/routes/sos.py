"""Routes for SOS reports.

Routes only handle HTTP concerns; all business logic lives in
app.services.sos_service.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.models.sos import SOSCreate, SOSResponse, SOSUpdate
from app.services import sos_service

router = APIRouter(prefix="/sos", tags=["SOS Reports"])


@router.get("", response_model=list[SOSResponse])
def list_sos_reports(status_filter: Optional[str] = Query(default=None, alias="status")):
    """Get all SOS reports, optionally filtered by status."""
    return sos_service.get_all_sos(status=status_filter)


@router.get("/{sos_id}", response_model=SOSResponse)
def get_sos_report(sos_id: UUID):
    """Get a single SOS report by id."""
    return sos_service.get_sos_by_id(sos_id)


@router.post("", response_model=SOSResponse, status_code=status.HTTP_201_CREATED)
def create_sos_report(payload: SOSCreate):
    """Create a new SOS report."""
    return sos_service.create_sos(payload)


@router.patch("/{sos_id}", response_model=SOSResponse)
def update_sos_report(sos_id: UUID, payload: SOSUpdate):
    """Partially update an existing SOS report."""
    return sos_service.update_sos(sos_id, payload)


@router.delete("/{sos_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sos_report(sos_id: UUID):
    """Delete an SOS report by id."""
    sos_service.delete_sos(sos_id)