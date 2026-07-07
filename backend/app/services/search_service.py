from typing import List, Optional

from app.services.supabase_client import supabase
from app.models.cat import CatResponse


class SearchService:
    """Handles searching and filtering cats stored in Supabase."""

    TABLE_NAME = "cats"

    @staticmethod
    def search_cats(
        name: Optional[str] = None,
        nickname: Optional[str] = None,
        color: Optional[str] = None,
        coat_pattern: Optional[str] = None,
        breed: Optional[str] = None,
        gender: Optional[str] = None,
        status: Optional[str] = None,
        age_group: Optional[str] = None,
        location_name: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[CatResponse]:
        """
        Search cats using optional filters with pagination.

        Text fields (name, nickname, color, coat_pattern, breed,
        location_name) use case-insensitive partial matching.

        Enum fields (gender, status, age_group) use exact matching.
        """

        query = supabase.table(SearchService.TABLE_NAME).select("*")

        if name:
            query = query.ilike("name", f"%{name}%")

        if nickname:
            query = query.ilike("nickname", f"%{nickname}%")

        if color:
            query = query.ilike("color", f"%{color}%")

        if coat_pattern:
            query = query.ilike("coat_pattern", f"%{coat_pattern}%")

        if breed:
            query = query.ilike("breed", f"%{breed}%")

        if location_name:
            query = query.ilike("location_name", f"%{location_name}%")

        if gender:
            query = query.eq("gender", gender)

        if status:
            query = query.eq("status", status)

        if age_group:
            query = query.eq("age_group", age_group)

        query = query.range(offset, offset + limit - 1)

        result = query.execute()
        cats_data = result.data or []

        return [CatResponse(**cat) for cat in cats_data]