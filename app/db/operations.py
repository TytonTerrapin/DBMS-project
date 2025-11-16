"""
Database operations and queries module using mysql.connector
"""
from typing import List, Optional, Tuple
from .models import Photo, Tag, get_connection, dict_from_cursor, row_from_cursor, get_dict_cursor, get_standard_cursor
from datetime import datetime, timedelta

class PhotoQueries:
    @staticmethod
    def get_photos_by_date_range(
        start_date: datetime,
        end_date: datetime
    ) -> List[Photo]:
        """Get photos within a date range"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                   FROM photos WHERE uploaded_at >= %s AND uploaded_at <= %s ORDER BY uploaded_at DESC""",
                (start_date, end_date)
            )
            rows = cursor.fetchall()
            photos = []
            for row in rows:
                photo = Photo(**row)
                cursor.execute(
                    """SELECT t.name, pt.confidence FROM tags t
                       JOIN photo_tags pt ON t.id = pt.tag_id
                       WHERE pt.photo_id = %s""",
                    (photo.id,)
                )
                photo.tags = [dict(tag_row) for tag_row in cursor.fetchall()]
                photos.append(photo)
            return photos
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_photos_by_tags(
        tags: List[str],
        match_all: bool = False
    ) -> List[Photo]:
        """
        Get photos by tags
        match_all: If True, photo must have all tags. If False, any tag matches
        """
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            if match_all:
                # Must match all tags - use GROUP BY and HAVING
                placeholders = ','.join(['%s'] * len(tags))
                query = f"""SELECT DISTINCT p.id, p.file_path, p.title, p.description, p.owner_id, 
                           p.uploaded_at, p.tags_generated, p.caption, p.is_public
                           FROM photos p
                           JOIN photo_tags pt ON p.id = pt.photo_id
                           JOIN tags t ON pt.tag_id = t.id
                           WHERE t.name IN ({placeholders})
                           GROUP BY p.id
                           HAVING COUNT(DISTINCT t.id) = %s"""
                params = tags + [len(tags)]
            else:
                # Match any tag
                placeholders = ','.join(['%s'] * len(tags))
                query = f"""SELECT DISTINCT p.id, p.file_path, p.title, p.description, p.owner_id, 
                           p.uploaded_at, p.tags_generated, p.caption, p.is_public
                           FROM photos p
                           JOIN photo_tags pt ON p.id = pt.photo_id
                           JOIN tags t ON pt.tag_id = t.id
                           WHERE t.name IN ({placeholders})"""
                params = tags
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            photos = []
            for row in rows:
                photo = Photo(**row)
                cursor.execute(
                    """SELECT t.name, pt.confidence FROM tags t
                       JOIN photo_tags pt ON t.id = pt.tag_id
                       WHERE pt.photo_id = %s""",
                    (photo.id,)
                )
                photo.tags = [dict(tag_row) for tag_row in cursor.fetchall()]
                photos.append(photo)
            return photos
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_photos_by_confidence(
        min_confidence: float = 0.5
    ) -> List[Tuple[Photo, str, float]]:
        """Get photos with tags above confidence threshold"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT p.id, p.file_path, p.title, p.description, p.owner_id, p.uploaded_at,
                   p.tags_generated, p.caption, p.is_public, t.name, pt.confidence
                   FROM photos p
                   JOIN photo_tags pt ON p.id = pt.photo_id
                   JOIN tags t ON pt.tag_id = t.id
                   WHERE pt.confidence >= %s
                   ORDER BY p.uploaded_at DESC""",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            results = []
            for row in rows:
                photo = Photo(
                    row['id'], row['file_path'], row['title'], row['description'],
                    row['owner_id'], row['uploaded_at'], row['tags_generated'],
                    row['caption'], row['is_public']
                )
                results.append((photo, row['name'], row['confidence']))
            return results
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_untagged_photos() -> List[Photo]:
        """Get photos that haven't been processed by ML yet"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                   FROM photos WHERE tags_generated = 0"""
            )
            rows = cursor.fetchall()
            return [Photo(**row) for row in rows]
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_recent_photos(
        days: int = 7,
        limit: int = 20
    ) -> List[Photo]:
        """Get recently uploaded photos"""
        cutoff = datetime.now() - timedelta(days=days)
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                   FROM photos WHERE uploaded_at >= %s ORDER BY uploaded_at DESC LIMIT %s""",
                (cutoff, limit)
            )
            rows = cursor.fetchall()
            photos = []
            for row in rows:
                photo = Photo(**row)
                cursor.execute(
                    """SELECT t.name, pt.confidence FROM tags t
                       JOIN photo_tags pt ON t.id = pt.tag_id
                       WHERE pt.photo_id = %s""",
                    (photo.id,)
                )
                photo.tags = [dict(tag_row) for tag_row in cursor.fetchall()]
                photos.append(photo)
            return photos
        finally:
            cursor.close()
            conn.close()

class TagQueries:
    @staticmethod
    def get_tag_stats() -> List[Tuple]:
        """Get tags with usage count and average confidence"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT t.id, t.name, COUNT(pt.photo_id) as usage_count, AVG(pt.confidence) as avg_confidence
                   FROM tags t
                   LEFT JOIN photo_tags pt ON t.id = pt.tag_id
                   GROUP BY t.id, t.name
                   ORDER BY usage_count DESC"""
            )
            rows = cursor.fetchall()
            results = []
            for row in rows:
                tag = Tag(row['id'], row['name'])
                results.append((tag, row['usage_count'], row['avg_confidence']))
            return results
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_related_tags(
        tag_name: str,
        min_correlation: int = 2
    ) -> List[Tuple]:
        """Find tags that frequently appear together"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            # Get the tag ID
            cursor.execute("SELECT id FROM tags WHERE name = %s", (tag_name,))
            row = cursor.fetchone()
            if not row:
                return []
            
            tag_id = row['id']
            
            # Find photos with this tag
            cursor.execute(
                """SELECT photo_id FROM photo_tags WHERE tag_id = %s""",
                (tag_id,)
            )
            photo_ids = [r['photo_id'] for r in cursor.fetchall()]
            
            if not photo_ids:
                return []
            
            # Find other tags on these photos
            placeholders = ','.join(['%s'] * len(photo_ids))
            query = f"""SELECT t.id, t.name, COUNT(pt.photo_id) as correlation
                       FROM tags t
                       JOIN photo_tags pt ON t.id = pt.tag_id
                       WHERE pt.photo_id IN ({placeholders}) AND t.id != %s
                       GROUP BY t.id, t.name
                       HAVING COUNT(pt.photo_id) >= %s
                       ORDER BY correlation DESC"""
            
            params = photo_ids + [tag_id, min_correlation]
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                tag = Tag(row['id'], row['name'])
                results.append((tag, row['correlation']))
            return results
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def cleanup_unused_tags() -> int:
        """Remove tags that aren't associated with any photos"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            # Find unused tags
            cursor.execute(
                """SELECT t.id FROM tags t
                   LEFT JOIN photo_tags pt ON t.id = pt.tag_id
                   WHERE pt.photo_id IS NULL"""
            )
            unused_ids = [r['id'] for r in cursor.fetchall()]
            
            if unused_ids:
                placeholders = ','.join(['%s'] * len(unused_ids))
                cursor = get_standard_cursor(conn)
                cursor.execute(f"DELETE FROM tags WHERE id IN ({placeholders})", unused_ids)
                conn.commit()
            
            return len(unused_ids)
        finally:
            cursor.close()
            conn.close()

class Analytics:
    @staticmethod
    def get_upload_statistics(
        days: int = 30
    ) -> List[Tuple]:
        """Get daily upload counts for the last N days"""
        cutoff = datetime.now() - timedelta(days=days)
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT DATE(uploaded_at) as date, COUNT(id) as count
                   FROM photos
                   WHERE uploaded_at >= %s
                   GROUP BY DATE(uploaded_at)
                   ORDER BY DATE(uploaded_at)""",
                (cutoff,)
            )
            rows = cursor.fetchall()
            return [(row['date'], row['count']) for row in rows]
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_tag_confidence_distribution() -> List[Tuple]:
        """Get distribution of tag confidence scores"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT ROUND(confidence, 1) as confidence, COUNT(*) as count
                   FROM photo_tags
                   GROUP BY ROUND(confidence, 1)
                   ORDER BY ROUND(confidence, 1)"""
            )
            rows = cursor.fetchall()
            return [(row['confidence'], row['count']) for row in rows]
        finally:
            cursor.close()
            conn.close()