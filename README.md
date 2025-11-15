# CampusLens

CampusLens is an AI-powered centralized media management system for college media assets. It uses BLIP for caption generation and CLIP for tag validation, providing an easy-to-use web interface for browsing and managing campus photos.

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

2. Configure environment variables (create .env file):
```
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

## To-do

- [ ] Implement proper authentication system
- [ ] Add admin controls for tag management
- [ ] Implement export functionality
- [ ] Add batch upload support
- [ ] Integrate with cloud storage
