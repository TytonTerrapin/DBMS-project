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
- MySQL database
- Clerk account (https://dashboard.clerk.com)

### 1. Backend Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file in project root
# Add these environment variables:
# CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
# CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
# DATABASE_URL=mysql+pymysql://user:password@localhost/campus_lens

# Run the server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend available at: http://localhost:8000

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Create .env.local file with:
# VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
# VITE_API_URL=http://localhost:8000

# Install dependencies and start dev server
npm install
npm run dev
```

Frontend available at: http://localhost:5173

## Environment Variables

**Backend (.env)**
- `CLERK_JWKS_URL` - Clerk JWKS endpoint
- `CLERK_ISSUER` - Clerk issuer URL
- `DATABASE_URL` - MySQL connection string
- `LOAD_ML_MODELS` - Set to `false` to skip ML models during development

**Frontend (frontend/.env.local)**
- `VITE_CLERK_PUBLISHABLE_KEY` - Get from https://dashboard.clerk.com API Keys
- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)

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

- `POST /api/token` - Login and get access token
- `POST /api/photos/upload` - Upload new photo
- `GET /api/photos` - List photos with filtering/sorting
- `POST /api/photos/{id}/tags` - Add tags to photo

## Development Notes

- ML models (BLIP/CLIP) are resource-heavy. Disable with `LOAD_ML_MODELS=false` in development
- The `uploads/` directory is created automatically at startup
- Protected routes require valid Clerk JWT token
- See `frontend/IMPLEMENTATION_SUMMARY.md` for frontend architecture details

## License

MIT
