"""
Supabase client setup.

Provides a single, reusable Supabase client instance for the
rest of the application to import. Does not perform auth or queries.
"""

from supabase import create_client, Client

from app.config import settings

# Create one Supabase client to be reused across the app.
# Avoids creating a new connection/client on every request.
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)