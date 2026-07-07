"""Business logic for SOS reports.

All Supabase access for sos_reports lives here. Routes must stay thin
and only call into this service.
"""

import struct
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException

# NOTE: import path assumed to match the existing Supabase client used by
# CatService. Only this import line may need adjusting to match the actual
# project structure.
from app.services.supabase_client import supabase

from app.models.sos import SOSCreate, SOSUpdate

TABLE_NAME = "sos_reports"


def _to_ewkt(latitude: float, longitude: float) -> str:
    """Convert latitude/longitude into a PostGIS EWKT point string.

    PostgREST accepts this text representation and casts it into the
    `geography` column type on insert/update.
    """
    return f"SRID=4326;POINT({longitude} {latitude})"


def _parse_location(location: Any) -> dict:
    """Parse a `geography` value returned by Supabase into lat/lon.

    Supabase/PostgREST returns geography columns as WKB/EWKB hex strings
    by default (e.g. "0101000020E6100000...."). This parses that hex
    string back into latitude/longitude floats.
    """
    if not location:
        return {"latitude": None, "longitude": None}

    if isinstance(location, dict):
        # Already in a structured form, e.g. GeoJSON.
        coordinates = location.get("coordinates", [None, None])
        return {"longitude": coordinates[0], "latitude": coordinates[1]}

    data = bytes.fromhex(location)
    endian = "<" if data[0] == 1 else ">"
    geom_type = struct.unpack(endian + "I", data[1:5])[0]
    has_srid = bool(geom_type & 0x20000000)
    offset = 9 if has_srid else 5
    x, y = struct.unpack(endian + "dd", data[offset : offset + 16])
    return {"longitude": x, "latitude": y}


def _row_to_response_dict(row: dict) -> dict:
    """Reshape a raw Supabase row into the SOSResponse-compatible shape."""
    row = dict(row)
    coords = _parse_location(row.pop("location", None))
    row.update(coords)
    return row


def create_sos(payload: SOSCreate) -> dict:
    """Create a new SOS report."""
    data = payload.model_dump(exclude={"latitude", "longitude"}, mode="json")
    data["location"] = _to_ewkt(payload.latitude, payload.longitude)

    result = supabase.table(TABLE_NAME).insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create SOS report")

    return _row_to_response_dict(result.data[0])


def get_sos_by_id(sos_id: UUID) -> dict:
    """Fetch a single SOS report by id."""
    result = (
        supabase.table(TABLE_NAME)
        .select("*")
        .eq("id", str(sos_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="SOS report not found")

    return _row_to_response_dict(result.data)


def get_all_sos(status: Optional[str] = None) -> list[dict]:
    """Fetch all SOS reports, optionally filtered by status."""
    query = supabase.table(TABLE_NAME).select("*")

    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()

    return [_row_to_response_dict(row) for row in result.data or []]


def update_sos(sos_id: UUID, payload: SOSUpdate) -> dict:
    """Partially update an existing SOS report."""
    # Ensures a 404 is raised early if the report does not exist.
    get_sos_by_id(sos_id)

    data = payload.model_dump(
        exclude={"latitude", "longitude"}, exclude_unset=True, mode="json"
    )

    if payload.latitude is not None or payload.longitude is not None:
        current = get_sos_by_id(sos_id)
        latitude = payload.latitude if payload.latitude is not None else current["latitude"]
        longitude = payload.longitude if payload.longitude is not None else current["longitude"]
        data["location"] = _to_ewkt(latitude, longitude)

    if not data:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    result = (
        supabase.table(TABLE_NAME)
        .update(data)
        .eq("id", str(sos_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update SOS report")

    return _row_to_response_dict(result.data[0])


def delete_sos(sos_id: UUID) -> None:
    """Delete an SOS report by id."""
    # Ensures a 404 is raised if the report does not exist.
    get_sos_by_id(sos_id)

    result = supabase.table(TABLE_NAME).delete().eq("id", str(sos_id)).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to delete SOS report")