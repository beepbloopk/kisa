"""
Main FastAPI application entry point.

Responsibilities:
- Create the FastAPI app instance
- Configure Jinja2 templates
- Mount static files (CSS/JS/images)
- Register routers
- Provide a basic root route
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Base directory of the "app" folder, used to build reliable file paths
BASE_DIR = Path(__file__).resolve().parent

# Initialize the FastAPI application
app = FastAPI(title="Kisa API")

# Configure Jinja2 templates directory
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Mount the static directory so CSS/JS/images are servable at /static
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    Basic root route.

    Renders index.html if it exists in the templates folder.
    This route will be replaced/extended once routers are registered.
    """
    index_path = BASE_DIR / "templates" / "index.html"

    if not index_path.exists():
        return HTMLResponse(
            content="<h1>Kisa</h1><p>index.html not found in app/templates/.</p>",
            status_code=200,
        )

    return templates.TemplateResponse("index.html", {"request": request})


# --------------------------------------------------------------------
# Routers will be registered here as they are built, e.g.:
#
# from app.routes import home
# app.include_router(home.router)
#
# This keeps main.py stable — new features are added as routers,
# not by editing this file repeatedly.
# --------------------------------------------------------------------