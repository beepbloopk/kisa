from typing import Any, Optional

from app.services.supabase_client import supabase

MAP_FIELDS = (
    "id, "
    "name, "
    "latitude, "
    "longitude, "
    "status, "
    "color, "
    "profile_image_url, "
    "location_name"
)


class MapService:
    """Business logic for retrieving cat data formatted for the map view."""

    @staticmethod
    def get_all_map_cats() -> list[dict[str, Any]]:
        """
        Return all cats that have valid latitude and longitude values.
        """
        response = (
            supabase.table("cats")
            .select(MAP_FIELDS)
            .not_.is_("latitude", "null")
            .not_.is_("longitude", "null")
            .execute()
        )

        return response.data or []

    @staticmethod
    def get_map_cat_by_id(cat_id: str) -> Optional[dict[str, Any]]:
        """
        Return a single cat's map data by ID.
        Returns None if the cat does not exist or has no coordinates.
        """
        response = (
            supabase.table("cats")
            .select(MAP_FIELDS)
            .eq("id", cat_id)
            .not_.is_("latitude", "null")
            .not_.is_("longitude", "null")
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]