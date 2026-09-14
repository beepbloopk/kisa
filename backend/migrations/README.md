# Database migrations

Run these once each, in order, in the Supabase SQL Editor. Every file is
safe to re-run.

| Order | File | What it adds |
|-------|------|--------------|
| 1 | 001_delete_own_account.sql | Lets a signed-in user delete their own account |
| 2 | 002_sighting_social.sql | Likes and comments on sightings, plus bio and location on profiles |
| 3 | 003_notifications.sql | Notifications when someone likes or comments on your report |
| 4 | 004_map_and_rescue.sql | Coordinates for the live map, and recording who took a cat in |
| 5 | 005_contact_avatar_settings.sql | Contact messages, profile photo storage, settings, and profile privacy |

These build on the project's original tables (cats, sightings, posts,
profiles and the rest), which are not in this folder.

The live project already has all five applied. These files are the record
of how it was set up, so a new project can be built the same way.
