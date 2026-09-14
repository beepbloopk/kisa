from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from app.services.auth_service import get_current_user

router = APIRouter(tags=["pages"])

templates = Jinja2Templates(directory="app/templates")


@router.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@router.get("/login")
async def login_page(request: Request):
    user = get_current_user(request)

    if user is not None:
        return RedirectResponse("/dashboard", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context={}
    )


@router.get("/signup")
async def signup_page(request: Request):
    user = get_current_user(request)

    if user is not None:
        return RedirectResponse("/dashboard", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="signup.html",
        context={}
    )


@router.get("/dashboard")
async def dashboard_page(request: Request):
    user = get_current_user(request)

    if user is None:
        return RedirectResponse("/login", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "user": user
        }
    )


@router.get("/profile")
async def profile_page(request: Request):
    user = get_current_user(request)

    if user is None:
        return RedirectResponse("/login", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="profile.html",
        context={
            "user": user
        }
    )


@router.get("/report")
async def report_page(request: Request):
    user = get_current_user(request)

    if user is None:
        return RedirectResponse("/login", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="report.html",
        context={
            "user": user
        }
    )


@router.get("/community")
async def community_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="community.html",
        context={}
    )


@router.get("/livemap")
async def livemap_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="livemap.html",
        context={}
    )


@router.get("/contact")
async def contact_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="contact.html",
        context={}
    )