# app/routes/users.py

"""
User profile routes.

Provides endpoints for:
- Getting the current user's profile
- Updating the current user's profile
- Listing the current user's cats
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import UserResponse, UserUpdate
from app.models.cat import CatResponse
from app.services.auth_service import get_current_user
from app.services.user_service import (
    UserService,
    UserNotFoundError,
    UserUpdateError,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def get_my_profile(current_user=Depends(get_current_user)):
    """
    Return the authenticated user's profile.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        return UserService.get_user_profile(UUID(current_user.id))
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def update_my_profile(
    update_data: UserUpdate,
    current_user=Depends(get_current_user),
):
    """
    Update the authenticated user's profile.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        return UserService.update_user_profile(
            UUID(current_user.id),
            update_data,
        )
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except UserUpdateError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.get(
    "/me/cats",
    response_model=List[CatResponse],
    status_code=status.HTTP_200_OK,
)
def get_my_cats(current_user=Depends(get_current_user)):
    """
    Return all cats owned by the authenticated user.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return UserService.get_cats_for_user(
        UUID(current_user.id)
    )