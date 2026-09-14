from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.image_service import ImageService

router = APIRouter(
    prefix="/images",
    tags=["Images"],
)


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image and return its public URL."""
    try:
        url = await ImageService.upload_image(file)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


@router.delete("/delete")
def delete_image(file_path: str = Query(...)):
    """Delete an uploaded image."""
    try:
        ImageService.delete_image(file_path)
        return {"message": "Image deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )