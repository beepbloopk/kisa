# KISA Backend Specification v1.0

## AI Instructions

You are the lead backend engineer for the Kisa project.

Treat this specification as the single source of truth.

If a requested change conflicts with this specification, ask for clarification instead of making assumptions.

Do not rename files, classes, methods, models, routes, or database tables unless explicitly instructed.

If an existing project component is referenced (such as the Supabase client), assume it already exists and import it rather than recreating it.

Generate only what is requested.

Do not modify unrelated files.

Keep code modular, readable, and beginner-friendly.

Keep routes thin and business logic inside services.

Return complete code.

---

# Project Overview

Kisa is a FastAPI + Supabase web application that helps communities identify, track, rescue, and care for stray cats.

This backend exposes REST APIs consumed by a browser frontend.

The project is an MVP built for a hackathon, so speed, maintainability, and simplicity are prioritized.

---

# Technology Stack

## Backend

- Python 3.12
- FastAPI
- Pydantic v2
- Uvicorn

## Database

- Supabase PostgreSQL

## Storage

- Supabase Storage

## AI

- Google Gemini API

## Frontend

- HTML
- CSS
- JavaScript
- Jinja2

---

# Folder Structure

backend/

├── app/

│ ├── config/

│ ├── models/

│ ├── routes/

│ ├── services/

│ ├── templates/

│ ├── static/

│ └── utils/

├── .env

├── requirements.txt

└── main.py

---

# Architecture

Request

↓

Route

↓

Service

↓

Supabase

Routes contain only request handling.

Services contain all business logic.

Models contain only Pydantic models.

No SQL inside routes.

No business logic inside routes.

---

# Existing Components

## Config

- settings.py
- environment loading

## Services

- AuthService
- CatService
- Supabase Client

## Routes

- auth.py
- pages.py
- cats.py

## Models

- Cat models

---

# Future Components

Services

- ImageService
- GeminiService
- SightingService

Routes

- images.py
- gemini.py
- sightings.py

Models

- Sighting

---

# Cat Database Model

id (UUID)

owner_id (UUID)

name

nickname

gender

estimated_age_text

estimated_age_years

estimated_age_months

breed

color

coat_pattern

description

sterilized

vaccinated

status

location_name

latitude

longitude

last_location (PostGIS Geography)

profile_image_url

is_identified

created_at

updated_at

---

# Cat Status

Allowed values

- stray

- being_fed

- under_treatment

- rescued

- adopted

- unknown

---

# Existing Cat Service

Implemented methods

- create_cat()

- get_cat_by_id()

- get_all_cats()

- update_cat()

- delete_cat()

Business logic belongs only inside CatService.

---

# Existing API

Authentication

POST /auth/signup

POST /auth/login

POST /auth/logout

Cats

GET /cats

GET /cats/{id}

POST /cats

PUT /cats/{id}

DELETE /cats/{id}

Images

POST /images/upload

DELETE /images/delete

Future

GET /feed

POST /sightings

GET /sightings/{id}

POST /gemini/match

---

# File Upload Rules

Storage

Supabase Storage

Bucket

cat-images

Allowed Types

- JPEG

- PNG

- WebP

Generate UUID filenames.

Return the public URL after upload.

---

# API Rules

Use REST.

Use JSON.

Return proper HTTP status codes.

404 for missing resources.

400 for invalid requests.

500 only for unexpected server errors.

---

# Coding Standards

Use type hints.

Use concise docstrings.

Do not duplicate business logic.

Do not recreate existing clients.

Import existing modules instead.

Do not modify unrelated files.

Do not assume filenames that are not provided.

Keep functions focused.

Prefer readability over cleverness.

Generate production-quality code suitable for a hackathon MVP.

---

# Output Rules

Only generate the requested file(s).

Return complete code.

Do not explain the code unless asked.

Do not include placeholders for missing project files unless absolutely necessary.

If an import path is unknown, clearly indicate that only the import line may need adjustment instead of inventing a project structure.