
# CampusLens

A media management platform for campus photo collections. Combines a FastAPI backend with React + Vite frontend and deep learning models (BLIP/CLIP) for automated captions and tag validation.

## Features

- User authentication via Clerk
- Photo upload with deep learning-powered tagging and captioning
- Gallery with filtering and sorting by tags
- Dashboard with statistics
- Responsive design with Tailwind CSS
- Protected routes and JWT token authorization

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- MySQL database (e.g., via XAMPP)
- Clerk account (https://dashboard.clerk.com)
- All dependencies installed (run `pip install -r requirements.txt` and `cd frontend && npm install`)
- Environment files created (see "Environment Variables" section below)

### Option 1: Automated Start (Windows)
From the project root directory, simply run the batch file:
```bash
./start.bat
```
This will open two new terminals and start both the backend and frontend servers.

### Option 2: Manual Start (All Platforms)

#### Terminal 1 (Backend):
```bash
# Run the server from the project root
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend available at: <http://localhost:8000>

#### Terminal 2 (Frontend):
```bash
# Navigate to frontend
cd frontend

# Start dev server
npm run dev
```
Frontend available at: <http://localhost:5173>

## Environment Variables

You must create two environment files for the project to run.

### 1. Backend (`.env`)
Create a file named `.env` in the project root directory.

```ini
# Get from https://dashboard.clerk.com API Keys -> Advanced
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev

# Connection string for your MySQL database (e.g., from XAMPP)
DATABASE_URL=mysql+pymysql://root:@localhost/campus_lens

# Set to "false" to skip loading heavy ML models for faster dev startup
LOAD_ML_MODELS=true
```

### 2. Frontend (`frontend/.env.local`)
Create a file named `.env.local` inside the `frontend/` directory.

```ini
# Get from https://dashboard.clerk.com API Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Backend API URL
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
app/                   # Backend (FastAPI)
├── api/              # Route endpoints
├── db/               # Database models and operations
└── ml/               # ML components (BLIP/CLIP)

frontend/             # Frontend (React + Vite)
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Route pages
│   ├── services/     # API client
│   └── styles/       # Tailwind CSS
└── public/           # Static assets

uploads/              # Photo storage directory
```

## API Endpoints

All endpoints are prefixed with `/api`. Protected routes require a valid Clerk JWT.

### User Endpoints

- `GET /users/me`: (Protected) Get the current logged-in user's details.
- `GET /users/me/photos`: (Protected) Get all photos uploaded by the current user.

### Photo Endpoints

- `POST /photos/upload`: (Protected) Upload a new photo.
- `GET /photos/explore`: (Public) Get all photos marked as `is_public`.
- `GET /photos/{photo_id}`: (Protected) Get a single photo. Users can only get their own; admins can get any.
- `PUT /photos/{photo_id}`: (Protected) Update a photo's title/description.
- `DELETE /photos/{photo_id}`: (Protected) Delete a photo.

### Admin Endpoints

- `GET /photos`: (Admin) Get all photos in the system, with advanced filtering.
- `GET /tags`: (Admin) Get a list of all tags with usage statistics.
- `GET /analytics/summary`: (Admin) Get system-wide analytics.

## Development Notes

- ML models (BLIP/CLIP) are resource-heavy. Disable with `LOAD_ML_MODELS=false` in development.
- The `uploads/` directory is created automatically at startup.
- Protected routes require a valid Clerk JWT token.
- See `frontend/IMPLEMENTATION_SUMMARY.md` for frontend architecture details.

## License

MIT
