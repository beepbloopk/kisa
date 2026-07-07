# app/services/feed_service.py

"""
FeedService

Provides read-only feed operations for browsing, searching, and
locating cats. Uses the existing Supabase client.
"""

import math
from typing import List

from app.services.supabase_client import supabase
from app.models.cat import CatResponse


class FeedServiceError(Exception):
    """Base exception for FeedService errors."""


class FeedQueryError(FeedServiceError):
    """Raised when a Supabase query fails unexpectedly."""


class InvalidSearchQueryError(FeedServiceError):
    """Raised when a search query is invalid."""


class InvalidLocationError(FeedServiceError):
    """Raised when latitude/longitude/radius values are invalid."""


class FeedService:
    """Business logic for the public cat feed."""

    TABLE_NAME = "cats"

    @staticmethod
    def get_recent_cats(limit: int = 20) -> List[CatResponse]:
        """Return the most recently created cats."""
        try:
            response = (
                supabase.table(FeedService.TABLE_NAME)
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [
                CatResponse.model_validate(cat)
                for cat in (response.data or [])
            ]

        except Exception as exc:
            raise FeedQueryError(f"Failed to fetch recent cats: {exc}") from exc

    @staticmethod
    def search_cats(query: str) -> List[CatResponse]:
        """Search cats by multiple text fields."""
        if not query or not query.strip():
            raise InvalidSearchQueryError("Search query must not be empty.")

        term = f"%{query.strip()}%"

        or_filter = ",".join(
            [
                f"name.ilike.{term}",
                f"nickname.ilike.{term}",
                f"breed.ilike.{term}",
                f"color.ilike.{term}",
                f"description.ilike.{term}",
                f"location_name.ilike.{term}",
            ]
        )

        try:
            response = (
                supabase.table(FeedService.TABLE_NAME)
                .select("*")
                .or_(or_filter)
                .execute()
            )

            return [
                CatResponse.model_validate(cat)
                for cat in (response.data or [])
            ]

        except Exception as exc:
            raise FeedQueryError(f"Failed to search cats: {exc}") from exc

    @staticmethod
    def get_nearby_cats(
        latitude: float,
        longitude: float,
        radius_km: float = 5,
    ) -> List[CatResponse]:
        """Return cats near a given coordinate using a simple bounding box."""

        if not (-90 <= latitude <= 90):
            raise InvalidLocationError("Invalid latitude.")

        if not (-180 <= longitude <= 180):
            raise InvalidLocationError("Invalid longitude.")

        if radius_km <= 0:
            raise InvalidLocationError("Radius must be greater than zero.")

        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (
            111.0 * max(math.cos(math.radians(latitude)), 0.1)
        )

        try:
            response = (
                supabase.table(FeedService.TABLE_NAME)
                .select("*")
                .gte("latitude", latitude - lat_delta)
                .lte("latitude", latitude + lat_delta)
                .gte("longitude", longitude - lon_delta)
                .lte("longitude", longitude + lon_delta)
                .execute()
            )

            return [
                CatResponse.model_validate(cat)
                for cat in (response.data or [])
            ]

        except Exception as exc:
            raise FeedQueryError(f"Failed to fetch nearby cats: {exc}") from exc