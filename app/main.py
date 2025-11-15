import os
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response, FileResponse
# --- UPDATED IMPORTS ---
# We only need the 'photos' router
from app.api import photos 
# --- END UPDATE ---
from app.ml.tagger import load_models
from app.db.models import init_db
from sqlalchemy import text

app = FastAPI(title="CampusLens API")

# Serve a tiny default favicon to avoid 404s when no favicon.ico is present.
# This returns a 1x1 transparent PNG. Replace by placing a real
# `favicon.ico` in the `frontend/` folder or by serving a file from disk.
import base64
_FAVICON_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
)


@app.get("/favicon.ico")
async def favicon():
    return Response(content=_FAVICON_PNG, media_type="image/png")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development. In production, list your domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- UPDATED ROUTERS ---
app.include_router(photos.router, prefix="/api", tags=["photos"])
# --- END UPDATE ---

# --- UPDATED STATIC FILE MOUNTS ---
# Ensure the uploads directory exists before mounting StaticFiles. Mounting happens
# at import time, so the directory must be present to avoid RuntimeError.
uploads_dir = os.path.join(os.getcwd(), "uploads")
try:
    os.makedirs(uploads_dir, exist_ok=True)
except Exception:
    # If directory creation fails, allow StaticFiles to raise a clearer error later,
    # but we try to create it here to support typical local development workflows.
    pass

# Mount static files (serves your uploads)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Serve frontend static files. Prefer a production build directory `frontend/dist`
# when present (Vite's default) and otherwise fall back to the `frontend` folder
# which is useful for simple static files during development.
frontend_dir = os.path.join(os.getcwd(), "frontend")
dist_dir = os.path.join(frontend_dir, "dist")
if os.path.exists(dist_dir):
    root_static_dir = dist_dir
    print(f"Serving frontend from production build: {dist_dir}")
else:
    root_static_dir = frontend_dir
    print(f"Serving frontend from source directory: {frontend_dir}")

app.mount("/", StaticFiles(directory=root_static_dir, html=True), name="root")


# SPA fallback: serve index.html for non-API paths so client-side routing works.
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # Let API and uploads paths be handled by their mounts/routers
    if full_path.startswith("api") or full_path.startswith("uploads"):
        raise HTTPException(status_code=404)
    index_path = os.path.join(root_static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(status_code=404)
# --- END OF UPDATES ---


@app.get("/api/health")
async def health_check():
    """Lightweight health check that does NOT load ML models.

    Returns basic service status and whether ML models have been loaded.
    This endpoint will not call load_models() and is safe for readiness probes.
    """
    try:
        # Import the ml.tagger module to inspect whether models are loaded.
        # Importing the module does not trigger model downloads; load_models() is explicit.
        from app.ml import tagger as ml_tagger

        models_loaded = bool(getattr(ml_tagger, "blip_model", None) and getattr(ml_tagger, "clip_model", None))
    except Exception:
        models_loaded = False

    return {"status": "ok", "models_loaded": models_loaded}

@app.on_event("startup")
async def startup_event():
    """Prepare uploads directory and optionally preload ML models on startup."""
    # Ensure uploads directory exists and has permissive permissions for serving files
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    try:
        os.makedirs(uploads_dir, exist_ok=True)
        # set readable/executable for owner and group (0755)
        os.chmod(uploads_dir, 0o755)
    except Exception:
        # If permissions cannot be set, continue — OS may restrict chmod on some filesystems
        pass

    # Regenerate uploads manifest (a static `list.json` inside uploads/) so
    # the frontend can fetch `/uploads/list.json` directly without an API call.
    try:
        from app.api import photos as photos_api
        try:
            photos_api._regenerate_uploads_manifest()
        except Exception:
            # best-effort, don't block startup
            pass
    except Exception:
        pass

    # Optionally load heavy ML models on startup. Set LOAD_ML_MODELS=false in .env for faster dev startup.
    load_models_flag = os.environ.get("LOAD_ML_MODELS", "true").lower() in ("1", "true", "yes")
    if load_models_flag:
        await load_models()

    # Ensure `is_public` column exists in `photos` table. Many local setups may
    # not have this column if the DB was created before the field was added.
    # Attempt to ALTER the table; ignore errors if the column already exists.
    try:
        engine, _ = init_db()
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE photos ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0"))
                print("DEBUG: Added 'is_public' column to photos table")
            except Exception as _:
                # If column exists or ALTER not permitted, skip silently.
                pass
    except Exception as e:
        print(f"DEBUG: Failed to ensure is_public column: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)