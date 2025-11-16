"""Database models and utilities using mysql.connector"""
import mysql.connector
from mysql.connector import pooling
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection pool configuration
_connection_pool = None

def get_connection_pool():
    """Get or initialize the MySQL connection pool"""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pooling.MySQLConnectionPool(
            pool_name="campus_lens_pool",
            pool_size=5,
            pool_reset_session=True,
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', ''),
            database=os.getenv('MYSQL_DATABASE', 'campus_lens'),
            port=int(os.getenv('MYSQL_PORT', 3306))
        )
    return _connection_pool

def get_connection():
    """Get a connection from the pool"""
    pool = get_connection_pool()
    return pool.get_connection()

# --- Database Helper Functions ---

def dict_from_cursor(cursor):
    """Convert cursor result to list of dicts"""
    if cursor.description is None:
        return []
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def row_from_cursor(cursor):
    """Convert single cursor result to dict"""
    if cursor.description is None:
        return None
    columns = [desc[0] for desc in cursor.description]
    row = cursor.fetchone()
    if row:
        return dict(zip(columns, row))
    return None

def get_dict_cursor(conn):
    """Get a dictionary cursor from a connection"""
    return conn.cursor(dictionary=True)

def get_standard_cursor(conn):
    """Get a standard cursor from a connection"""
    return conn.cursor()

# --- User Helper Functions ---

class User:
    """User model - represents a user from Clerk"""
    def __init__(self, id, clerk_user_id, email, role):
        self.id = id
        self.clerk_user_id = clerk_user_id
        self.email = email
        self.role = role

    @staticmethod
    def get_or_create(clerk_user_id: str, email: str = None):
        """Get user by clerk_user_id or create if doesn't exist"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            # Try to get existing user
            cursor.execute(
                "SELECT id, clerk_user_id, email, role FROM users WHERE clerk_user_id = %s",
                (clerk_user_id,)
            )
            row = cursor.fetchone()
            if row:
                return User(**row)
            
            # Create new user
            cursor.execute(
                "INSERT INTO users (clerk_user_id, email, role) VALUES (%s, %s, %s)",
                (clerk_user_id, email, 'user')
            )
            conn.commit()
            user_id = cursor.lastrowid
            return User(user_id, clerk_user_id, email, 'user')
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_by_id(user_id: int):
        """Get user by ID"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                "SELECT id, clerk_user_id, email, role FROM users WHERE id = %s",
                (user_id,)
            )
            row = cursor.fetchone()
            if row:
                return User(**row)
            return None
        finally:
            cursor.close()
            conn.close()

# --- Photo Helper Functions ---

class Photo:
    """Photo model"""
    def __init__(self, id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public):
        self.id = id
        self.file_path = file_path
        self.title = title
        self.description = description
        self.owner_id = owner_id
        self.uploaded_at = uploaded_at
        self.tags_generated = tags_generated
        self.caption = caption
        self.is_public = is_public
        self.tags = []

    def to_dict(self, include_tags=True, anonymize_owner: bool = False):
        """Convert photo to dictionary"""
        file_url = self.file_path if self.file_path.startswith('/') else f"/{self.file_path}"
        
        result = {
            'id': self.id,
            'file_path': file_url,
            'file_url': file_url,
            'title': self.title,
            'description': self.description,
            'owner_id': None if anonymize_owner else self.owner_id,
            'uploaded_at': self.uploaded_at.isoformat() if isinstance(self.uploaded_at, datetime) else self.uploaded_at,
            'tags_generated': self.tags_generated,
            'caption': self.caption,
            'is_public': bool(self.is_public)
        }
        
        if include_tags:
            result['tags'] = self.tags
        
        return result

    @staticmethod
    def create(file_path: str, title: str, description: str, owner_id: int, caption: str = None, is_public: bool = False):
        """Create a new photo record"""
        conn = get_connection()
        cursor = get_standard_cursor(conn)
        try:
            cursor.execute(
                """INSERT INTO photos (file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public)
                   VALUES (%s, %s, %s, %s, NOW(), 0, %s, %s)""",
                (file_path, title, description, owner_id, caption, int(is_public))
            )
            conn.commit()
            photo_id = cursor.lastrowid
            return Photo(
                photo_id, file_path, title, description, owner_id,
                datetime.now(), 0, caption, is_public
            )
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_by_id(photo_id: int, include_tags: bool = True):
        """Get photo by ID with optional tags"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                   FROM photos WHERE id = %s""",
                (photo_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            
            photo = Photo(**row)
            
            if include_tags:
                cursor.execute(
                    """SELECT t.id, t.name, pt.confidence FROM tags t
                       JOIN photo_tags pt ON t.id = pt.tag_id
                       WHERE pt.photo_id = %s""",
                    (photo_id,)
                )
                photo.tags = [dict(row) for row in cursor.fetchall()]
            
            return photo
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_all(skip: int = 0, limit: int = 100, tag: str = None, sort_by: str = "uploaded_at", order: str = "desc"):
        """Get all photos with filtering and sorting"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            if tag:
                query = """SELECT DISTINCT p.id, p.file_path, p.title, p.description, p.owner_id, p.uploaded_at, 
                           p.tags_generated, p.caption, p.is_public
                           FROM photos p
                           JOIN photo_tags pt ON p.id = pt.photo_id
                           JOIN tags t ON pt.tag_id = t.id
                           WHERE t.name = %s"""
                params = [tag]
            else:
                query = """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                           FROM photos"""
                params = []
            
            # Add sorting
            valid_sorts = ['uploaded_at', 'title', 'id']
            if sort_by not in valid_sorts:
                sort_by = 'uploaded_at'
            query += f" ORDER BY {sort_by} {'DESC' if order == 'desc' else 'ASC'}"
            
            # Add pagination
            query += " LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            photos = []
            for row in rows:
                photo = Photo(**row)
                # Load tags
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
    def get_by_owner(owner_id: int):
        """Get all photos by an owner"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                   FROM photos WHERE owner_id = %s ORDER BY uploaded_at DESC""",
                (owner_id,)
            )
            rows = cursor.fetchall()
            
            photos = []
            for row in rows:
                photo = Photo(**row)
                # Load tags
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
    def search(search_term: str):
        """Search photos by title, description, or caption"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                """SELECT id, file_path, title, description, owner_id, uploaded_at, tags_generated, caption, is_public
                   FROM photos WHERE title LIKE %s OR description LIKE %s OR caption LIKE %s""",
                (f"%{search_term}%", f"%{search_term}%", f"%{search_term}%")
            )
            rows = cursor.fetchall()
            
            photos = []
            for row in rows:
                photo = Photo(**row)
                # Load tags
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
    def update(photo_id: int, **kwargs):
        """Update photo attributes"""
        conn = get_connection()
        cursor = get_standard_cursor(conn)
        try:
            allowed_fields = ['title', 'description', 'caption', 'is_public', 'tags_generated']
            updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
            
            if not updates:
                return Photo.get_by_id(photo_id)
            
            set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
            query = f"UPDATE photos SET {set_clause} WHERE id = %s"
            params = list(updates.values()) + [photo_id]
            
            cursor.execute(query, params)
            conn.commit()
            
            return Photo.get_by_id(photo_id)
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete(photo_id: int):
        """Delete photo and its file"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            # Get file path first
            cursor.execute("SELECT file_path FROM photos WHERE id = %s", (photo_id,))
            row = cursor.fetchone()
            
            if row:
                file_path = row['file_path']
                # Try to delete file
                try:
                    file_full_path = file_path if os.path.isabs(file_path) else os.path.join(os.getcwd(), file_path)
                    if os.path.exists(file_full_path):
                        os.remove(file_full_path)
                except Exception:
                    pass
            
            # Delete from database
            cursor = get_standard_cursor(conn)
            cursor.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

# --- Tag Helper Functions ---

class Tag:
    """Tag model"""
    def __init__(self, id, name, created_at=None):
        self.id = id
        self.name = name
        self.created_at = created_at

    @staticmethod
    def get_or_create(name: str):
        """Get tag by name or create if doesn't exist"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute("SELECT id, name, created_at FROM tags WHERE name = %s", (name,))
            row = cursor.fetchone()
            if row:
                return Tag(**row)
            
            # Create new tag
            cursor = get_standard_cursor(conn)
            cursor.execute("INSERT INTO tags (name, created_at) VALUES (%s, NOW())", (name,))
            conn.commit()
            tag_id = cursor.lastrowid
            return Tag(tag_id, name, datetime.now())
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_all(skip: int = 0, limit: int = 100):
        """Get all tags"""
        conn = get_connection()
        cursor = get_dict_cursor(conn)
        try:
            cursor.execute(
                "SELECT id, name, created_at FROM tags LIMIT %s OFFSET %s",
                (limit, skip)
            )
            rows = cursor.fetchall()
            return [Tag(**row) for row in rows]
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def add_to_photo(photo_id: int, tag_id: int, confidence: float):
        """Add tag to photo with confidence score"""
        conn = get_connection()
        cursor = get_standard_cursor(conn)
        try:
            cursor.execute(
                """INSERT INTO photo_tags (photo_id, tag_id, confidence, created_at)
                   VALUES (%s, %s, %s, NOW())
                   ON DUPLICATE KEY UPDATE confidence = %s, created_at = NOW()""",
                (photo_id, tag_id, confidence, confidence)
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

# --- Simpler Base class for backwards compatibility ---
class Base:
    """Placeholder for backwards compatibility with SQLAlchemy-style code"""
    pass

def init_db():
    """Initialize database and create tables if needed"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                clerk_user_id VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(100),
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_clerk_user_id (clerk_user_id)
            )
        """)

        # Create photos table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS photos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                file_path VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description VARCHAR(1000),
                owner_id INT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tags_generated INT DEFAULT 0,
                caption VARCHAR(500),
                is_public TINYINT(1) DEFAULT 0,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_owner (owner_id),
                INDEX idx_uploaded (uploaded_at)
            )
        """)

        # Create tags table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_name (name)
            )
        """)

        # Create photo_tags junction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS photo_tags (
                photo_id INT NOT NULL,
                tag_id INT NOT NULL,
                confidence FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (photo_id, tag_id),
                FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                INDEX idx_tag (tag_id)
            )
        """)

        # Ensure is_public column exists (migration for older databases)
        try:
            cursor.execute("ALTER TABLE photos ADD COLUMN is_public TINYINT(1) DEFAULT 0")
        except mysql.connector.Error:
            # Column likely already exists
            pass

        conn.commit()
        return conn, cursor
    except mysql.connector.Error as err:
        print(f"Database initialization error: {err}")
        raise
    finally:
        cursor.close()
        conn.close()

def get_db():
    """Dependency injection function for FastAPI - returns a connection"""
    return get_connection()