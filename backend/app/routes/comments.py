from fastapi import APIRouter, HTTPException

import app.services.comment_service as comment_service
from app.models.comment import CommentCreate, CommentUpdate, CommentResponse

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("/{cat_id}", response_model=list[CommentResponse])
def list_comments(cat_id: str):
    """Get all comments for a specific cat."""
    return comment_service.get_comments(cat_id)


@router.post("/{cat_id}", response_model=CommentResponse, status_code=201)
def add_comment(cat_id: str, comment: CommentCreate):
    """Create a new comment on a specific cat."""
    return comment_service.create_comment(cat_id, comment)


@router.put("/{comment_id}", response_model=CommentResponse)
def edit_comment(comment_id: str, comment: CommentUpdate):
    """Update an existing comment by id."""
    updated = comment_service.update_comment(comment_id, comment)
    if updated is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return updated


@router.delete("/{comment_id}", status_code=204)
def remove_comment(comment_id: str):
    """Delete a comment by id."""
    deleted = comment_service.delete_comment(comment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")