# CampusLens

CampusLens is an AI-assisted media management platform tailored for campus photo collections. It combines a FastAPI backend with a React + Vite frontend and optional BLIP/CLIP models to provide automated captions and tag validation for uploaded images.

---

## Table of contents

- [Key features](#key-features)
- [Prerequisites](#prerequisites)
- [Quick start (backend)](#quick-start-backend)
- [Quick start (frontend)](#quick-start-frontend)
- [Configuration](#configuration)
- [API reference (selected endpoints)](#api-reference-selected-endpoints)
- [Development notes](#development-notes)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Key features

- User authentication (Clerk integration)
- Photo upload with automatic tagging and captioning
- Gallery with filtering and sorting by tags and metadata
- ML-backed tag scoring and caption generation (BLIP/CLIP)

## Features

- User authentication
- Photo upload with automatic tagging
- Gallery view with filtering and sorting
- Tag-based search
- AI-powered image caption generation and tag scoring

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment variables (create a `.env` file):

```env
DATABASE_URL=mysql://user:pass@localhost/campus_lens
SECRET_KEY=your-secret-key
```

3. Initialize database:

```python
from app.db.models import init_db
init_db()
```

4. Run the server:

```bash
uvicorn app.main:app --reload
```

The application will be available at http://localhost:8000

Developer notes:

- The ML models (BLIP/CLIP) are heavy. During local development you can skip loading them at startup by setting the environment variable `LOAD_ML_MODELS=false` (default is true).
- The server will create an `uploads/` directory at project root on startup if it does not exist. Ensure the process has permission to write to the project directory.

## Project Structure

```
app/
├── api/               # FastAPI routes
│   ├── auth.py       # Authentication endpoints
│   └── photos.py     # Photo management endpoints
├── db/               # Database models
│   └── models.py     # SQLAlchemy models
├── ml/               # Machine learning components
│   └── tagger.py     # BLIP/CLIP integration
├── static/           # Static web files
│   ├── index.html    # Login page
│   └── gallery.html  # Photo gallery
└── main.py          # FastAPI application entry point
```

## API Endpoints

- `POST /api/token` - Login and get access token
- `POST /api/photos/upload` - Upload new photo
- `GET /api/photos` - List photos with filtering/sorting

## Development

- Uses FastAPI for the backend API
- Static HTML/JS/CSS frontend
- SQLAlchemy for database ORM
- BLIP and CLIP models for AI tagging

## Todo

- [ ] Implement proper authentication system
- [ ] Add admin controls for tag management
- [ ] Implement export functionality
- [ ] Add batch upload support
- [ ] Integrate with cloud storage

Notes on TODOs / current status:

- Authentication: basic integration with Clerk is present (see `app/api/dependencies.py`) which validates tokens and creates local `User` records on first sign-in. You still need admin onboarding (no UI or admin creation endpoint is provided).
- Admin controls: several admin-protected endpoints exist in `app/api/photos.py` (analytics, full photo lists, tag stats), but the admin user must be assigned in the database (set `role='admin'` for the Clerk-linked user).
- Batch upload / export / cloud storage: not implemented yet; they remain open tasks.

---
Updated README to improve setup and run instructions.
