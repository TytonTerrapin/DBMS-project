import os
import shutil
from fastapi import APIRouter, Depends, File, UploadFile, BackgroundTasks, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db.models import get_db, Photo as DBPhoto, Tag
from ..db.operations import PhotoQueries, TagQueries, Analytics
from ..ml.tagger import process_image
from datetime import datetime, timedelta

router = APIRouter()

# Response Models
class TagDetail(BaseModel):
    name: str
    confidence: float

class PhotoResponse(BaseModel):
    id: int
    file_url: str
    title: str
    description: Optional[str] = None
    tags: List[TagDetail] = []
    uploaded_at: str
    owner_id: int
    caption: Optional[str] = None

class TagResponse(BaseModel):
    id: int
    name: str
    photo_count: int
    avg_confidence: Optional[float] = None

class AnalyticsResponse(BaseModel):
    total_photos: int
    total_tags: int
    avg_tags_per_photo: float
    popular_tags: List[TagResponse]
    recent_uploads: List[PhotoResponse]

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file to uploads directory"""
    # Create unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{upload_file.filename}"
    file_path = os.path.join("uploads", filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    return file_path

@router.post("/photos/upload")
async def upload_photo(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    description: Optional[str] = None,
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
            owner_id=1,  # TODO: Get from auth
            uploaded_at=datetime.now(),
            tags_generated=0
        )
        db.add(db_photo)
        db.commit()
        db.refresh(db_photo)
        
        # Queue processing
        background_tasks.add_task(process_image, db_photo.id, file_path)
        
        return {"photo_id": db_photo.id, "file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/photos")
async def list_photos(
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
    List photos with comprehensive filtering options
    
    - Filter by single tag or multiple tags
    - Sort by various fields
    - Pagination support
    - Filter by tag confidence
    - Search in title/description
    - Filter by date range
    """
    if tags:
        # Multiple tag filtering
        photos = PhotoQueries.get_photos_by_tags(db, tags)
    elif date_from and date_to:
        # Date range filtering
        photos = PhotoQueries.get_photos_by_date_range(db, date_from, date_to)
    elif min_confidence:
        # Confidence threshold filtering
        photos = PhotoQueries.get_photos_by_confidence(db, min_confidence)
    elif search:
        # Text search
        photos = DBPhoto.search(db, search)
    else:
        # Basic listing with optional single tag
        photos = DBPhoto.get_all(db, skip, limit, tag, sort_by, order)
    
    return [photo.to_dict() for photo in photos]

@router.get("/photos/recent")
async def get_recent_photos(
    days: int = 7,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get recently uploaded photos"""
    photos = PhotoQueries.get_recent_photos(db, days, limit)
    return [photo.to_dict() for photo in photos]

@router.get("/photos/{photo_id}")
async def get_photo(photo_id: int, db: Session = Depends(get_db)):
    """Get detailed photo information by ID"""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo.to_dict()

@router.put("/photos/{photo_id}")
async def update_photo(
    photo_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update photo metadata"""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    updates = {}
    if title:
        updates['title'] = title
    if description:
        updates['description'] = description
    
    updated_photo = photo.update(db, **updates)
    return updated_photo.to_dict()

@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    """Delete a photo and its file"""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    photo.delete(db)
    return {"status": "success", "message": "Photo deleted"}


@router.post("/photos/{photo_id}/reprocess")
async def reprocess_photo(photo_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger reprocessing (tagging) for a specific photo"""
    photo = DBPhoto.get_by_id(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Enqueue background tagger job
    background_tasks.add_task(process_image, photo.id, photo.file_path)
    return {"status": "queued", "photo_id": photo.id}

# Tag Management Endpoints
@router.get("/tags")
async def list_tags(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all tags with usage statistics"""
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

@router.get("/tags/{tag_name}/related")
async def get_related_tags(
    tag_name: str,
    min_correlation: int = 2,
    db: Session = Depends(get_db)
):
    """Get tags that frequently appear together"""
    related = TagQueries.get_related_tags(db, tag_name, min_correlation)
    return [
        {
            "tag": tag.name,
            "correlation": correlation
        }
        for tag, correlation in related
    ]

# Analytics Endpoints
@router.get("/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """Get overall analytics summary"""
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