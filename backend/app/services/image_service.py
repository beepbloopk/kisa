from uuid import uuid4

from fastapi import UploadFile

from app.services.supabase_client import supabase

BUCKET_NAME = "cat-images"

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


class ImageService:
    """Handles image upload and deletion using Supabase Storage."""

    @staticmethod
    async def upload_image(file: UploadFile) -> str:
        """
        Upload an image to Supabase Storage and return its public URL.
        """
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Unsupported file type.")

        file_extension = (
            file.filename.rsplit(".", 1)[1].lower()
            if file.filename and "." in file.filename
            else ""
        )

        filename = (
            f"{uuid4()}.{file_extension}"
            if file_extension
            else str(uuid4())
        )

        file_bytes = await file.read()

        supabase.storage.from_(BUCKET_NAME).upload(
            filename,
            file_bytes,
            {"content-type": file.content_type},
        )

        return supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

    @staticmethod
    def delete_image(file_path: str) -> bool:
        """
        Delete an image from Supabase Storage.
        """
        supabase.storage.from_(BUCKET_NAME).remove([file_path])
        return True