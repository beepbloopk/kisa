# NOTE: Adjust this import line only if the Supabase client lives at a
# different path in the project. The client itself is assumed to already
# exist and is not recreated here.
from app.services.supabase_client import supabase

from app.models.comment import CommentCreate, CommentUpdate, CommentResponse

TABLE_NAME = "comments"


def create_comment(cat_id: str, comment: CommentCreate) -> CommentResponse:
    """Create a new comment attached to a cat."""
    payload = {
        "cat_id": cat_id,
        "username": comment.username,
        "content": comment.content,
    }
    result = supabase.table(TABLE_NAME).insert(payload).execute()
    return CommentResponse(**result.data[0])


def get_comments(cat_id: str) -> list[CommentResponse]:
    """Retrieve all comments for a given cat, ordered oldest first."""
    result = (
        supabase.table(TABLE_NAME)
        .select("*")
        .eq("cat_id", cat_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [CommentResponse(**row) for row in result.data]


def update_comment(comment_id: str, comment: CommentUpdate) -> CommentResponse | None:
    """Update the content of an existing comment. Returns None if not found."""
    result = (
        supabase.table(TABLE_NAME)
        .update({"content": comment.content})
        .eq("id", comment_id)
        .execute()
    )
    if not result.data:
        return None
    return CommentResponse(**result.data[0])


def delete_comment(comment_id: str) -> bool:
    """Delete a comment by id. Returns True if a row was deleted."""
    result = supabase.table(TABLE_NAME).delete().eq("id", comment_id).execute()
    return len(result.data) > 0