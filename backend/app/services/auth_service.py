from fastapi import Request

from app.services.supabase_client import supabase

# ------------------------------------------------------------------
# Cookie Names
# ------------------------------------------------------------------

ACCESS_COOKIE_NAME = "sb_access_token"
REFRESH_COOKIE_NAME = "sb_refresh_token"


class AuthError(Exception):
    """Custom authentication exception."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


# ------------------------------------------------------------------
# Authentication
# ------------------------------------------------------------------

def signup_user(email: str, password: str):
    """Register a new user."""
    try:
        result = supabase.auth.sign_up(
            {
                "email": email,
                "password": password,
            }
        )
    except Exception as e:
        raise AuthError(str(e))

    if result.user is None:
        raise AuthError("Signup failed.")

    return result.user


def login_user(email: str, password: str):
    """Authenticate a user and return the session."""
    try:
        result = supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )
    except Exception:
        raise AuthError("Invalid email or password.")

    if result.session is None:
        raise AuthError("Invalid email or password.")

    return result.session


def logout_user():
    """Sign out the current user."""
    try:
        supabase.auth.sign_out()
    except Exception:
        pass


# ------------------------------------------------------------------
# User Helpers
# ------------------------------------------------------------------

def get_user_from_token(access_token: str):
    """Return the authenticated user from an access token."""
    try:
        response = supabase.auth.get_user(access_token)
    except Exception:
        return None

    if response.user is None:
        return None

    return response.user


def get_current_user(request: Request):
    """Return the currently authenticated user from cookies."""
    access_token = request.cookies.get(ACCESS_COOKIE_NAME)

    if not access_token:
        return None

    return get_user_from_token(access_token)


def refresh_session(refresh_token: str):
    """Refresh an expired session."""
    try:
        session = supabase.auth.refresh_session(refresh_token)
    except Exception:
        return None

    if session.session is None:
        return None

    return session.session