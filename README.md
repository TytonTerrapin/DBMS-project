
# CampusLens

CampusLens is a media management platform built to organize and explore campus photo collections.  
It features a FastAPI backend and a React + Vite frontend, combined with AI models (BLIP/CLIP) for auto-tagging and captioning.

---

## Features

- User authentication via Clerk
- Photo upload with deep learning-powered tagging and captioning
- Gallery with filtering and sorting by tags
- Dashboard with per-user and system-wide statistics
- Responsive UI with Tailwind CSS
- Protected routes with JWT (Clerk → FastAPI)

---

## 1. Prerequisites

Before running CampusLens, install:

- Python 3.9+
- Node.js 16+
- XAMPP (or any MySQL server)
- Git

Clone the repository:

```bash
git clone https://github.com/TytonTerrapin/DBMS-project.git
cd DBMS-project
```

Both backend and frontend environment files (.env and frontend/.env.local) are already present in the repo with working defaults for development.  
You only need to adjust them if your MySQL or Clerk configuration is different.

---

## 2. Database Setup (XAMPP / MySQL)

1. Open the XAMPP Control Panel.
2. Start Apache and MySQL.
3. Go to phpMyAdmin: http://localhost/phpmyadmin
4. Create a database named:

   ```
   campus_lens
   ```

5. Ensure your MySQL credentials match what’s in DATABASE_URL from `.env`.  
   Default XAMPP credentials:

   - Username: `root`
   - Password: *(empty)*

---

## 3. Installing Dependencies

### Backend (FastAPI)

```bash
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
cd ..
```

---

## 4. Running the App

### Recommended: start.bat (Windows Only)

```bash
start.bat
```

It will:

- Activate virtualenv if present (`./venv`)
- Launch backend:
  ```bash
  python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
  ```
- Launch frontend:
  ```bash
  npm run dev
  ```
- Backend: http://127.0.0.1:8000  
- Frontend: http://localhost:5173
- Both the frontend and backend will get launched in two different terminals.

---

## 5. Sample Photos

A folder named `sample_photos` is included in the project. You can upload these photos through the app's interface after logging in. They are intended to help you try out:

- Automatic caption and tag generation
- Photo updating
- Deleting and filtering functionality

---

## 6. API Endpoints Overview

### User

- GET /api/users/me: Get logged-in user details
- GET /api/users/me/photos: Get user’s photos

### Photos

- POST /api/photos/upload: Upload image with caption/tag generation
- GET /api/photos/explore: Public gallery
- GET /api/photos/{id}: Get a specific photo
- PUT /api/photos/{id}: Edit a photo
- DELETE /api/photos/{id}: Delete a photo

### Admin

- GET /api/photos: Get all photos
- GET /api/tags: Get tag stats
- GET /api/analytics/summary: System analytics

---

## 7. Development Notes

Disable ML models during development:

```ini
LOAD_ML_MODELS=false
```

Images are saved in an `uploads/` folder created automatically.

---

## 8. Contributors

- Arnav Bansal (@TytonTerrapin)
- Nakul Tanwar (@Nakul-28)
- Ayush (@Ayush-CS-89112521)

---

## 9. License

MIT License
