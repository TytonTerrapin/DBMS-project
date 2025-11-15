import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, BackgroundTasks, HTTPException, Query, Form, Request
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
# --- UPDATED IMPORTS ---
from ..db.models import get_db, Photo as DBPhoto, Tag, User # Import User
from ..db.operations import PhotoQueries, TagQueries, Analytics
from ..ml.tagger import process_image
from .dependencies import get_current_user, get_current_admin_user # Import dependencies
# --- END UPDATE ---
from datetime import datetime, timedelta
import json

router = APIRouter()

# (Response Models are unchanged)
class TagDetail(BaseModel):
    name: str
    confidence: float
# ... (all other response models)


async def save_upload_file(upload_file: UploadFile) -> str:
    """
    Save uploaded file to the uploads/ directory.
    Returns the relative path to the file (e.g., /uploads/filename.jpg)
    """
    # Create uploads directory if it doesn't exist
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Generate unique filename to avoid conflicts
    file_extension = Path(upload_file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = uploads_dir / unique_filename
    
    # Save the file
    try:
        with file_path.open("wb") as buffer:
            content = await upload_file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return the path that the frontend can use to fetch the image
    return f"/uploads/{unique_filename}"


def _regenerate_uploads_manifest():
    """Scan the `uploads/` directory and write a `list.json` manifest used
    by the frontend. This avoids having an API endpoint and lets the frontend
    fetch a static file at `/uploads/list.json` which is served by StaticFiles.
    """
    uploads_dir = Path("uploads")
    manifest_path = uploads_dir / "list.json"
    if not uploads_dir.exists():
        try:
            uploads_dir.mkdir(exist_ok=True)
        except Exception:
            return

    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
    files = []
    try:
        entries = sorted(uploads_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        for p in entries:
            if not p.is_file():
                continue
            if p.suffix.lower() not in allowed:
                continue
            try:
                mtime = datetime.fromtimestamp(p.stat().st_mtime).isoformat()
            except Exception:
                mtime = None
            files.append({
                "filename": p.name,
                "url": f"/uploads/{p.name}",
                "uploaded_at": mtime
            })
        # Write manifest atomically
        try:
            tmp = manifest_path.with_suffix('.tmp')
            with tmp.open('w', encoding='utf-8') as fh:
                json.dump(files, fh)
            tmp.replace(manifest_path)
        except Exception:
            pass
    except Exception:
        return


@router.post("/photos/upload")
async def upload_photo(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a photo and queue it for processing"""
    try:
        # Save file
        file_path = await save_upload_file(file)

        # Create photo record
        db_photo = DBPhoto(
            file_path=file_path,
            title=title or file.filename,
            description=description,
            owner_id=current_user.id,
            uploaded_at=datetime.now(),
            tags_generated=0
        )
        db.add(db_photo)
        db.commit()
        db.refresh(db_photo)

        # Queue processing in background (will generate tags)
        actual_file_path = file_path.lstrip('/').replace('/', os.sep)
        background_tasks.add_task(process_image, db_photo.id, actual_file_path)

        # Regenerate static uploads manifest so the frontend sees the new file
        try:
            _regenerate_uploads_manifest()
        except Exception:
            pass

        return db_photo.to_dict(include_tags=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW ENDPOINT: Get Current User Info ---
@router.get("/users/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current logged-in user's information including role"""
    return {
        "id": current_user.id,
        "clerk_user_id": current_user.clerk_user_id,
        "email": current_user.email,
        "role": current_user.role
    }

# --- NEW ENDPOINT: User's Dashboard ---
@router.get("/users/me/photos")
async def list_my_photos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all photos uploaded by the current logged-in user"""
    photos = db.query(DBPhoto).filter(DBPhoto.owner_id == current_user.id).all()
    return [photo.to_dict() for photo in photos]

# --- PROTECTED: Admin's Dashboard ---
@router.get("/photos")
async def list_photos(
    # Allow any authenticated user; admins see all photos, users see only their own
    current_user: User = Depends(get_current_user),
    tag: Optional[str] = None,
    tags: List[str] = Query(None),
    sort_by: Optional[str] = "uploaded_at",
    order: Optional[str] = "desc",
    skip: int = 0,
    limit: int = 100,
    min_confidence: Optional[float] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    List all photos in the system (ADMIN ONLY)
    """
    # Admins can use the full set of queries
    if current_user.role == 'admin':
        if tags:
            photos = PhotoQueries.get_photos_by_tags(db, tags)
        elif date_from and date_to:
            photos = PhotoQueries.get_photos_by_date_range(db, date_from, date_to)
        elif min_confidence:
            photos = PhotoQueries.get_photos_by_confidence(db, min_confidence)
        elif search:
            photos = DBPhoto.search(db, search)
        else:
            photos = DBPhoto.get_all(db, skip, limit, tag, sort_by, order)
    else:
        # Regular users only see their own photos; apply simple filters supported here
        query = db.query(DBPhoto).filter(DBPhoto.owner_id == current_user.id)

        if tags:
            # Join tags and filter
            query = query.join(DBPhoto.tags).filter(Tag.name.in_(tags))

        if tag:
            query = query.join(DBPhoto.tags).filter(Tag.name == tag)

        if search:
            query = query.filter(
                (DBPhoto.title.ilike(f"%{search}%")) |
                (DBPhoto.description.ilike(f"%{search}%")) |
                (DBPhoto.caption.ilike(f"%{search}%"))
            )

        # Sorting
        if hasattr(DBPhoto, sort_by):
            sort_col = getattr(DBPhoto, sort_by)
            if order == 'desc':
                sort_col = sort_col.desc()
            query = query.order_by(sort_col)

        photos = query.offset(skip).limit(limit).all()

    return [photo.to_dict() for photo in photos]


@router.get("/photos/explore")
async def explore_photos(
    request: Request,
    db: Session = Depends(get_db)
):
    """Public read-only gallery of opt-in public photos. Returns anonymized owner info.

    This handler is public (no auth required). It defensively parses query
    parameters so empty numeric values (e.g. `skip=`) do not cause FastAPI to
    return 422. It eager-loads tags to avoid N+1 queries and enforces a
    reasonable `MAX_LIMIT`.
    """
    # Defensive parse of query params
    q = request.query_params.get("q")
    tag = request.query_params.get("tag")

    def _parse_int(value, default):
        if value is None or value == "":
            return default
        try:
            return int(value)
        except Exception:
            return default

    skip = _parse_int(request.query_params.get("skip"), 0)
    limit = _parse_int(request.query_params.get("limit"), 24)

    MAX_LIMIT = 100
    if limit < 1:
        limit = 1
    limit = min(limit, MAX_LIMIT)

    # Build query only for public photos (uploader opt-in)
    query = db.query(DBPhoto).filter(DBPhoto.is_public == True)

    if q:
        query = query.filter(DBPhoto.title.ilike(f"%{q}%"))

    if tag:
        query = query.join(DBPhoto.tags).filter(Tag.name == tag)

    query = query.options(joinedload(DBPhoto.tags))
    query = query.order_by(DBPhoto.uploaded_at.desc())

    photos = query.offset(skip).limit(limit).all()

    return [p.to_dict(include_tags=True, anonymize_owner=True) for p in photos]

# --- PROTECTED: Admin-Only Action ---
@router.get("/photos/recent")
async def get_recent_photos(
    days: int = 7,
    limit: int = 20,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get recently uploaded photos (ADMIN ONLY)"""
    photos = PhotoQueries.get_recent_photos(db, days, limit)
    return [photo.to_dict() for photo in photos]

# --- PROTECTED: Admin-Only Action ---
@router.get("/photos/{photo_id}")
async def get_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed photo information by ID. Admins can view any photo; users can view their own."""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Allow if admin or owner
    if current_user.role != 'admin' and photo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this photo")

    return photo.to_dict()

# --- PROTECTED: Admin-Only Action ---
@router.put("/photos/{photo_id}")
async def update_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    title: Optional[str] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update photo metadata. Admins can update any photo; users may update their own."""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if current_user.role != 'admin' and photo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this photo")

    updates = {}
    if title:
        updates['title'] = title
    if description:
        updates['description'] = description

    updated_photo = photo.update(db, **updates)
    return updated_photo.to_dict()

# --- PROTECTED: Admin-Only Action ---
@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a photo and its file. Admins can delete any photo; users may delete their own."""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if current_user.role != 'admin' and photo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo")

    photo.delete(db)
    return {"status": "success", "message": "Photo deleted"}

# --- PROTECTED: Admin-Only Action ---
@router.post("/photos/{photo_id}/reprocess")
async def reprocess_photo(
    photo_id: int, 
    background_tasks: BackgroundTasks, 
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Trigger reprocessing (tagging) for a specific photo (ADMIN ONLY)"""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    background_tasks.add_task(process_image, photo.id, photo.file_path)
    return {"status": "queued", "photo_id": photo.id}

# --- PROTECTED: Admin-Only Action ---
@router.get("/tags")
async def list_tags(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """List all tags with usage statistics (ADMIN ONLY)"""
    tags_stats = TagQueries.get_tag_stats(db)
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "photo_count": count,
            "avg_confidence": float(avg_conf) if avg_conf else None
        }
        for tag, count, avg_conf in tags_stats
    ]

# --- PROTECTED: Admin-Only Action ---
@router.get("/tags/{tag_name}/related")
async def get_related_tags(
    tag_name: str,
    min_correlation: int = 2,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get tags that frequently appear together (ADMIN ONLY)"""
    related = TagQueries.get_related_tags(db, tag_name, min_correlation)
    return [
        {
            "tag": tag.name,
            "correlation": correlation
        }
        for tag, correlation in related
    ]

# --- PROTECTED: Admin-Only Action ---
@router.get("/analytics/summary")
async def get_analytics_summary(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get overall analytics summary (ADMIN ONLY)"""
    upload_stats = Analytics.get_upload_statistics(db)
    confidence_dist = Analytics.get_tag_confidence_distribution(db)
    popular_tags = Tag.get_popular(db)
    
    return {
        "upload_stats": [
            {"date": date, "count": count}
            for date, count in upload_stats
        ],
        "confidence_distribution": [
            {"confidence": float(conf), "count": count}
            for conf, count in confidence_dist
        ],
        "popular_tags": [
            {"name": tag.name, "count": count}
            for tag, count in popular_tags
        ]
    }