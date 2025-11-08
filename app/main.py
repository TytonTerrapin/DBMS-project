from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from app.api import auth, photos
from app.ml.tagger import load_models

app = FastAPI(title="CampusLens API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers first (before static file mounting)
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(photos.router, prefix="/api", tags=["photos"])

# Then mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount root static files last to not interfere with API routes
app.mount("/", StaticFiles(directory="app/static", html=True), name="root")
app.include_router(photos.router, prefix="/api", tags=["photos"])

@app.get("/")
async def root():
    """Redirect root to index.html"""
    return RedirectResponse(url="/index.html")

@app.on_event("startup")
async def startup_event():
    """Preload ML models on startup"""
    await load_models()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)