# app/services/sighting_service.py
"""Business logic for cat sightings.

All Supabase access for sightings lives here. Routes must stay thin
and only call into this service.
"""

import struct
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException

# NOTE: import path assumed to match the existing Supabase client used by
# CatService/SOSService. Only this import line may need adjusting to match
# the actual project structure.
from app.services.supabase_client import supabase

from app.models.sighting import SightingCreate, SightingUpdate

TABLE_NAME = "sightings"


# ----------------------------
# PostGIS helpers (private)
# ----------------------------

def _validate_geojson_point(location: dict) -> tuple[float, float]:
    """Validate a client-supplied GeoJSON Point and return (longitude, latitude).

    Raises HTTPException(400) if the structure, geometry type, coordinate
    count, or coordinate ranges are invalid.
    """
    if not isinstance(location, dict):
        raise HTTPException(status_code=400, detail="location must be a GeoJSON object")

    if location.get("type") != "Point":
        raise HTTPException(status_code=400, detail="location.type must be 'Point'")

    coordinates = location.get("coordinates")

    if not isinstance(coordinates, (list, tuple)) or len(coordinates) != 2:
        raise HTTPException(
            status_code=400,
            detail="location.coordinates must be exactly [longitude, latitude]",
        )

    longitude, latitude = coordinates

    if not isinstance(longitude, (int, float)) or not isinstance(latitude, (int, float)):
        raise HTTPException(status_code=400, detail="location coordinates must be numeric")

    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="longitude must be between -180 and 180")

    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="latitude must be between -90 and 90")

    return float(longitude), float(latitude)


def _location_to_ewkt(location: dict) -> str:
    """Convert a validated GeoJSON Point dict into a PostGIS EWKT point string.

    PostgREST accepts this text representation and casts it into the
    `geography` column type on insert/update.
    """
    longitude, latitude = _validate_geojson_point(location)
    return f"SRID=4326;POINT({longitude} {latitude})"


def _parse_location(location: Any) -> Optional[dict]:
    """Parse a `geography` value returned by Supabase into a GeoJSON Point dict.

    Supabase/PostgREST returns geography columns as WKB/EWKB hex strings
    by default (e.g. "0101000020E6100000...."). This parses that hex
    string back into a GeoJSON Point dict.

    Malformed database values never crash this function: they are reported
    as HTTP 500 errors instead, since a bad value at this point means the
    stored data itself is invalid, not the caller's request.
    """
    if not location:
        return None

    if isinstance(location, dict):
        # Validate structured GeoJSON returned by the database.
        _validate_geojson_point(location)
        return location

    if not isinstance(location, str):
        raise HTTPException(status_code=500, detail="Stored location data is malformed")

    try:
        data = bytes.fromhex(location)
        endian = "<" if data[0] == 1 else ">"
        geom_type = struct.unpack(endian + "I", data[1:5])[0]
        has_srid = bool(geom_type & 0x20000000)
        offset = 9 if has_srid else 5
        x, y = struct.unpack(endian + "dd", data[offset : offset + 16])
    except (ValueError, IndexError, struct.error):
        raise HTTPException(status_code=500, detail="Stored location data is malformed")

    return {"type": "Point", "coordinates": [x, y]}


def _row_to_response_dict(row: dict) -> dict:
    """Reshape a raw Supabase row into the SightingResponse-compatible shape."""
    row = dict(row)
    row["location"] = _parse_location(row.get("location"))
    return row


# ----------------------------
# CRUD
# ----------------------------

def create_sighting(payload: SightingCreate) -> dict:
    """Create a new sighting."""
    data = payload.model_dump(exclude={"location"}, mode="json")

    if payload.location is not None:
        data["location"] = _location_to_ewkt(payload.location)

    result = supabase.table(TABLE_NAME).insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create sighting")

    return _row_to_response_dict(result.data[0])


def get_sighting_by_id(sighting_id: UUID) -> dict:
    """Fetch a single sighting by id."""
    result = (
        supabase.table(TABLE_NAME)
        .select("*")
        .eq("id", str(sighting_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Sighting not found")

    return _row_to_response_dict(result.data)


def get_all_sightings(cat_id: Optional[UUID] = None) -> list[dict]:
    """Fetch all sightings, optionally filtered by cat_id."""
    query = supabase.table(TABLE_NAME).select("*")

    if cat_id is not None:
            query = query.eq("cat_id", str(cat_id))

    result = query.order("created_at", desc=True).execute()

    return [_row_to_response_dict(row) for row in result.data or []]


def update_sighting(sighting_id: UUID, payload: SightingUpdate) -> dict:
    """Partially update an existing sighting."""
    # Ensures a 404 is raised early if the sighting does not exist.
    get_sighting_by_id(sighting_id)

    data = payload.model_dump(exclude_unset=True, mode="json")

    if not data:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    if "location" in data and data["location"] is not None:
        data["location"] = _location_to_ewkt(data["location"])

    result = (
        supabase.table(TABLE_NAME)
        .update(data)
        .eq("id", str(sighting_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update sighting")

    return _row_to_response_dict(result.data[0])


def delete_sighting(sighting_id: UUID) -> None:
    """Delete a sighting by id."""
    # Ensures a 404 is raised if the sighting does not exist.
    get_sighting_by_id(sighting_id)

    result = supabase.table(TABLE_NAME).delete().eq("id", str(sighting_id)).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to delete sighting")