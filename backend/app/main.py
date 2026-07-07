from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routes import auth as auth_routes
from app.routes import pages as pages_routes
from app.routes import cats as cats_routes
from app.routes import images as images_routes
from app.routes import sightings as sightings_routes
from app.routes import gemini as gemini_routes
from app.routes import feed as feed_routes
from app.routes import users as users_routes
from app.routes import search as search_routes
from app.routes import map as map_routes
from app.routes import comments as comments_routes
from app.routes import sos as sos_routes

app = FastAPI(title="Kisa")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(pages_routes.router)
app.include_router(auth_routes.router)
app.include_router(cats_routes.router)  
app.include_router(images_routes.router)
app.include_router(sightings_routes.router)
app.include_router(gemini_routes.router)
app.include_router(feed_routes.router)
app.include_router(users_routes.router)
app.include_router(search_routes.router)
app.include_router(map_routes.router)
app.include_router(comments_routes.router)
app.include_router(sos_routes.router)