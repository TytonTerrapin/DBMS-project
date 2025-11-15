"""
Database operations and queries module
"""
from typing import List, Optional, Tuple
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
from .models import Photo, Tag, photo_tags
from datetime import datetime, timedelta

class PhotoQueries:
    @staticmethod
    def get_photos_by_date_range(
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> List[Photo]:
        """Get photos within a date range"""
        return db.query(Photo).filter(
            and_(
                Photo.uploaded_at >= start_date,
                Photo.uploaded_at <= end_date
            )
        ).all()

    @staticmethod
    def get_photos_by_tags(
        db: Session,
        tags: List[str],
        match_all: bool = False
    ) -> List[Photo]:
        """
        Get photos by tags
        match_all: If True, photo must have all tags. If False, any tag matches
        """
        query = db.query(Photo).join(Photo.tags)
        if match_all:
            # Must match all tags
            for tag in tags:
                query = query.filter(Tag.name == tag)
        else:
            # Match any tag
            query = query.filter(Tag.name.in_(tags))
        return query.distinct().all()

    @staticmethod
    def get_photos_by_confidence(
        db: Session,
        min_confidence: float = 0.5
    ) -> List[Tuple[Photo, str, float]]:
        """Get photos with tags above confidence threshold"""
        return db.query(
            Photo, Tag.name, photo_tags.c.confidence
        ).join(
            photo_tags
        ).join(
            Tag
        ).filter(
            photo_tags.c.confidence >= min_confidence
        ).all()

    @staticmethod
    def get_untagged_photos(db: Session) -> List[Photo]:
        """Get photos that haven't been processed by ML yet"""
        return db.query(Photo).filter(Photo.tags_generated == 0).all()

    @staticmethod
    def get_recent_photos(
        db: Session,
        days: int = 7,
        limit: int = 20
    ) -> List[Photo]:
        """Get recently uploaded photos"""
        cutoff = datetime.now() - timedelta(days=days)
        return db.query(Photo).filter(
            Photo.uploaded_at >= cutoff
        ).order_by(
            Photo.uploaded_at.desc()
        ).limit(limit).all()

class TagQueries:
    @staticmethod
    def get_tag_stats(db: Session) -> List[Tuple[Tag, int, float]]:
        """Get tags with usage count and average confidence"""
        return db.query(
            Tag,
            func.count(photo_tags.c.photo_id).label('usage_count'),
            func.avg(photo_tags.c.confidence).label('avg_confidence')
        ).join(
            photo_tags
        ).group_by(
            Tag.id
        ).order_by(
            func.count(photo_tags.c.photo_id).desc()
        ).all()

    @staticmethod
    def get_related_tags(
        db: Session,
        tag_name: str,
        min_correlation: int = 2
    ) -> List[Tuple[Tag, int]]:
        """Find tags that frequently appear together"""
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            return []

        # Find photos with this tag
        photo_ids = db.query(photo_tags.c.photo_id).filter(
            photo_tags.c.tag_id == tag.id
        ).subquery()

        # Find other tags on these photos
        return db.query(
            Tag,
            func.count(photo_tags.c.photo_id).label('correlation')
        ).join(
            photo_tags
        ).filter(
            and_(
                photo_tags.c.photo_id.in_(photo_ids),
                Tag.id != tag.id
            )
        ).group_by(
            Tag.id
        ).having(
            func.count(photo_tags.c.photo_id) >= min_correlation
        ).order_by(
            func.count(photo_tags.c.photo_id).desc()
        ).all()

    @staticmethod
    def cleanup_unused_tags(db: Session) -> int:
        """Remove tags that aren't associated with any photos"""
        unused = db.query(Tag).outerjoin(photo_tags).filter(
            photo_tags.c.photo_id == None
        ).all()
        
        count = len(unused)
        for tag in unused:
            db.delete(tag)
        db.commit()
        
        return count

class Analytics:
    @staticmethod
    def get_upload_statistics(
        db: Session,
        days: int = 30
    ) -> List[Tuple[datetime, int]]:
        """Get daily upload counts for the last N days"""
        cutoff = datetime.now() - timedelta(days=days)
        return db.query(
            func.date(Photo.uploaded_at).label('date'),
            func.count(Photo.id).label('count')
        ).filter(
            Photo.uploaded_at >= cutoff
        ).group_by(
            func.date(Photo.uploaded_at)
        ).order_by(
            func.date(Photo.uploaded_at)
        ).all()

    @staticmethod
    def get_tag_confidence_distribution(
        db: Session
    ) -> List[Tuple[float, int]]:
        """Get distribution of tag confidence scores"""
        # Round confidence to 1 decimal place for grouping
        return db.query(
            func.round(photo_tags.c.confidence, 1).label('confidence'),
            func.count().label('count')
        ).group_by(
            func.round(photo_tags.c.confidence, 1)
        ).order_by(
            func.round(photo_tags.c.confidence, 1)
        ).all()