# app/services/user_service.py

"""
Business logic for user profile operations.
"""

from typing import List
from uuid import UUID

from app.services.supabase_client import supabase

from app.models.user import UserResponse, UserUpdate
from app.models.cat import CatResponse


class UserServiceError(Exception):
    """Base exception for user service errors."""


class UserNotFoundError(UserServiceError):
    """Raised when a profile does not exist."""


class UserUpdateError(UserServiceError):
    """Raised when a profile update fails."""


class UserService:
    """Service for user profile operations."""

    PROFILES_TABLE = "profiles"
    CATS_TABLE = "cats"

    @staticmethod
    def get_user_profile(user_id: UUID) -> UserResponse:
        """
        Return a user's profile.
        """

        response = (
            supabase.table(UserService.PROFILES_TABLE)
            .select("*")
            .eq("id", str(user_id))
            .limit(1)
            .execute()
        )

        if not response.data:
            raise UserNotFoundError("Profile not found.")

        return UserResponse.model_validate(response.data[0])

    @staticmethod
    def update_user_profile(
        user_id: UUID,
        update_data: UserUpdate,
    ) -> UserResponse:
        """
        Update a user's editable profile fields.
        """

        payload = update_data.model_dump(exclude_unset=True)

        if not payload:
            return UserService.get_user_profile(user_id)

        response = (
            supabase.table(UserService.PROFILES_TABLE)
            .update(payload)
            .eq("id", str(user_id))
            .execute()
        )

        if not response.data:
            raise UserUpdateError("Failed to update profile.")

        return UserResponse.model_validate(response.data[0])

    @staticmethod
    def get_cats_for_user(user_id: UUID) -> List[CatResponse]:
        """
        Return every cat owned by a user.
        """

        response = (
            supabase.table(UserService.CATS_TABLE)
            .select("*")
            .eq("owner_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )

        return [
            CatResponse.model_validate(cat)
            for cat in (response.data or [])
        ]