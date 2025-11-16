import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, BackgroundTasks, HTTPException, Query, Form, Request
from typing import List, Optional
from pydantic import BaseModel
# --- UPDATED IMPORTS for mysql.connector ---
from ..db.models import get_db, Photo as DBPhoto, Tag, User, get_connection
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
):
    """Upload a photo and queue it for processing"""
    try:
        # Save file
        file_path = await save_upload_file(file)

        # Create photo record using the new model
        db_photo = DBPhoto.create(
            file_path=file_path,
            title=title or file.filename,
            description=description,
            owner_id=current_user.id,
            caption=None,
            is_public=False
        )

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
    current_user: User = Depends(get_current_user)
):
    """List all photos uploaded by the current logged-in user"""
    photos = DBPhoto.get_by_owner(current_user.id)
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
):
    """
    List all photos in the system (ADMIN ONLY)
    """
    # Admins can use the full set of queries
    if current_user.role == 'admin':
        if tags:
            photos = PhotoQueries.get_photos_by_tags(tags)
        elif date_from and date_to:
            photos = PhotoQueries.get_photos_by_date_range(date_from, date_to)
        elif min_confidence:
            photos = PhotoQueries.get_photos_by_confidence(min_confidence)
        elif search:
            photos = DBPhoto.search(search)
        else:
            photos = DBPhoto.get_all(skip, limit, tag, sort_by, order)
    else:
        # Regular users only see their own photos
        photos = DBPhoto.get_by_owner(current_user.id)
        
        # Apply simple filters
        if search:
            photos = [p for p in photos if search.lower() in (p.title.lower() or '') or 
                      search.lower() in (p.description.lower() or '') or
                      search.lower() in (p.caption.lower() or '')]
        
        if tag:
            photos = [p for p in photos if any(t['name'] == tag for t in p.tags)]
        
        if tags:
            photos = [p for p in photos if any(t['name'] in tags for t in p.tags)]
        
        # Apply sorting
        reverse = order == 'desc'
        if sort_by == 'uploaded_at':
            photos = sorted(photos, key=lambda p: p.uploaded_at, reverse=reverse)
        elif sort_by == 'title':
            photos = sorted(photos, key=lambda p: p.title, reverse=reverse)
        
        # Apply pagination
        photos = photos[skip:skip+limit]

    return [photo.to_dict() for photo in photos]


@router.get("/photos/explore")
async def explore_photos(
    request: Request
):
    """Public read-only gallery of opt-in public photos. Returns anonymized owner info."""
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

    # Get all public photos
    photos = DBPhoto.get_all(skip, limit, tag)
    
    # Filter for only public photos
    photos = [p for p in photos if p.is_public]
    
    if q:
        photos = [p for p in photos if q.lower() in (p.title.lower() or '')]
    
    if tag:
        photos = [p for p in photos if any(t['name'] == tag for t in p.tags)]
    
    # Re-apply pagination after filtering
    photos = photos[skip:skip+limit]

    return [p.to_dict(include_tags=True, anonymize_owner=True) for p in photos]

# --- PROTECTED: Admin-Only Action ---
@router.get("/photos/recent")
async def get_recent_photos(
    days: int = 7,
    limit: int = 20,
    admin_user: User = Depends(get_current_admin_user)
):
    """Get recently uploaded photos (ADMIN ONLY)"""
    photos = PhotoQueries.get_recent_photos(days, limit)
    return [photo.to_dict() for photo in photos]

# --- PROTECTED: Admin-Only Action ---
@router.get("/photos/{photo_id}")
async def get_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get detailed photo information by ID. Admins can view any photo; users can view their own."""
    photo = DBPhoto.get_by_id(photo_id)
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
):
    """Update photo metadata. Admins can update any photo; users may update their own."""
    photo = DBPhoto.get_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if current_user.role != 'admin' and photo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this photo")

    updates = {}
    if title:
        updates['title'] = title
    if description:
        updates['description'] = description

    updated_photo = DBPhoto.update(photo_id, **updates)
    return updated_photo.to_dict()

# --- PROTECTED: Admin-Only Action ---
@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a photo and its file. Admins can delete any photo; users may delete their own."""
    photo = DBPhoto.get_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if current_user.role != 'admin' and photo.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo")

    DBPhoto.delete(photo_id)
    return {"status": "success", "message": "Photo deleted"}

# --- PROTECTED: Admin-Only Action ---
@router.post("/photos/{photo_id}/reprocess")
async def reprocess_photo(
    photo_id: int, 
    background_tasks: BackgroundTasks, 
    admin_user: User = Depends(get_current_admin_user)
):
    """Trigger reprocessing (tagging) for a specific photo (ADMIN ONLY)"""
    photo = DBPhoto.get_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    background_tasks.add_task(process_image, photo.id, photo.file_path)
    return {"status": "queued", "photo_id": photo.id}

# --- PROTECTED: Admin-Only Action ---
@router.get("/tags")
async def list_tags(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(get_current_admin_user)
):
    """List all tags with usage statistics (ADMIN ONLY)"""
    tags_stats = TagQueries.get_tag_stats()
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
    admin_user: User = Depends(get_current_admin_user)
):
    """Get tags that frequently appear together (ADMIN ONLY)"""
    related = TagQueries.get_related_tags(tag_name, min_correlation)
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
    admin_user: User = Depends(get_current_admin_user)
):
    """Get overall analytics summary (ADMIN ONLY)"""
    upload_stats = Analytics.get_upload_statistics()
    confidence_dist = Analytics.get_tag_confidence_distribution()
    
    return {
        "upload_stats": [
            {"date": date, "count": count}
            for date, count in upload_stats
        ],
        "confidence_distribution": [
            {"confidence": float(conf), "count": count}
            for conf, count in confidence_dist
        ]
    }