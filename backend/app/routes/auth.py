from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from app.services.auth_service import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    AuthError,
    login_user,
    logout_user,
    signup_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

templates = Jinja2Templates(directory="app/templates")

COOKIE_MAX_AGE = 60 * 60 * 24 * 7


@router.post("/signup")
async def signup(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
):

    if password != confirm_password:
        return templates.TemplateResponse(
            request=request,
            name="signup.html",
            context={
                "error": "Passwords do not match."
            },
            status_code=400,
        )

    try:
        signup_user(email, password)
    except AuthError as e:
        return templates.TemplateResponse(
            request=request,
            name="signup.html",
            context={
                "error": e.message
            },
            status_code=400,
        )

    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context={
            "message": "Account created successfully. Please verify your email before logging in."
        },
    )


@router.post("/login")
async def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
):

    try:
        session = login_user(email, password)
    except AuthError as e:
        return templates.TemplateResponse(
            request=request,
            name="login.html",
            context={
                "error": e.message
            },
            status_code=400,
        )

    response = RedirectResponse(
        url="/dashboard",
        status_code=303,
    )

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=session.access_token,
        httponly=True,
        secure=False,   # Change to True in production (HTTPS)
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=session.refresh_token,
        httponly=True,
        secure=False,   # Change to True in production (HTTPS)
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )

    return response


@router.get("/logout")
async def logout(request: Request):

    logout_user()

    response = RedirectResponse(
        url="/login",
        status_code=303,
    )

    response.delete_cookie(
        ACCESS_COOKIE_NAME,
        path="/",
    )

    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path="/",
    )

    return response