"""
Application configuration.

Loads environment variables from .env and validates that
required variables are present before the app starts.
"""

import os
from dotenv import load_dotenv

# Load variables from the .env file into the environment
load_dotenv()

# --------------------------------------------------------------------
# REQUIRED environment variables — the developer must define these
# in backend/.env. The app will not start without them.
# --------------------------------------------------------------------
REQUIRED_ENV_VARS = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "GEMINI_API_KEY",
]


def _get_env_or_raise(var_name: str) -> str:
    """Fetch an environment variable or raise a clear error if missing."""
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: '{var_name}'. "
            f"Please add it to your .env file."
        )
    return value


# Validate all required variables at import time.
# This fails fast, with a clear message, instead of failing later
# deep inside a service with a confusing error.
for var in REQUIRED_ENV_VARS:
    _get_env_or_raise(var)

# Exposed settings used throughout the app
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")