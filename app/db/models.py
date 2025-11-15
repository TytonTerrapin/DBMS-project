"""Database models and utilities"""
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Table, DateTime, Boolean
from sqlalchemy.orm import relationship, sessionmaker,declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

Base = declarative_base()

# Association table for many-to-many relationship between photos and tags
# (This is unchanged)
photo_tags = Table('photo_tags',
    Base.metadata,
    Column('photo_id', Integer, ForeignKey('photos.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE')),
    Column('confidence', Float),
    Column('created_at', DateTime, server_default=func.now())
)

# --- NEW: User Model ---
# This table links your app's data to Clerk's user IDs.
class User(Base):
    __tablename__ = 'users'
    
    # Your internal database ID for this user
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # The ID from Clerk (e.g., "user_2a...")
    clerk_user_id = Column(String(100), unique=True, nullable=False, index=True)
    
    email = Column(String(100), nullable=True)
    
    # This is the key for your admin logic
    role = Column(String(50), nullable=False, default='user') # 'user' or 'admin'
    
    # This links a User to all their Photos
    photos = relationship("Photo", back_populates="owner")

# --- UPDATED: Photo Model ---
class Photo(Base):
    __tablename__ = 'photos'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_path = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    
    # --- THIS IS THE KEY CHANGE ---
    # owner_id is no longer a simple number, it's a link to the 'users.id' table
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    # This creates the relationship so you can do 'photo.owner'
    owner = relationship("User", back_populates="photos")
    # --- END OF CHANGE ---
    
    uploaded_at = Column(DateTime, server_default=func.now())
    tags_generated = Column(Integer, default=0)
    caption = Column(String(500), nullable=True)
    # New: whether the uploader opted in to show this photo in the public/explore gallery
    is_public = Column(Boolean, nullable=False, default=False)
    tags = relationship("Tag", secondary=photo_tags, back_populates="photos",
                       cascade="all, delete")

    def to_dict(self, include_tags=True, anonymize_owner: bool = False):
        """Convert photo to dictionary with optional tag inclusion"""
        # file_path is already stored as /uploads/filename.jpg
        # If it doesn't start with /, add it
        file_url = self.file_path if self.file_path.startswith('/') else f"/{self.file_path}"
        
        result = {
            'id': self.id,
            'file_path': file_url,  # Return as file_path for frontend compatibility
            'file_url': file_url,    # Also return as file_url
            'title': self.title,
            'description': self.description,
            'owner_id': None if anonymize_owner else self.owner_id,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'tags_generated': self.tags_generated,
            'caption': self.caption
        }

        # expose is_public flag to clients so frontends can show status (if needed)
        result['is_public'] = bool(self.is_public)
        
        if include_tags:
            # Return tag names; confidence can be queried separately if needed
            result['tags'] = [{'name': tag.name, 'confidence': None} for tag in self.tags]
        
        return result

    @classmethod
    def create(cls, db, **kwargs):
        """Create a new photo record"""
        photo = cls(**kwargs)
        db.add(photo)
        db.commit()
        db.refresh(photo)
        return photo

    @classmethod
    def get_by_id(cls, db, photo_id: int):
        """Get photo by ID with tags"""
        return db.query(cls).filter(cls.id == photo_id).first()

    @classmethod
    def get_all(cls, db, skip: int = 0, limit: int = 100, tag: str = None,
                sort_by: str = "uploaded_at", order: str = "desc"):
        """Get all photos with filtering and sorting"""
        query = db.query(cls)

        # Apply tag filter if specified
        if tag:
            query = query.join(cls.tags).filter(Tag.name == tag)

        # Apply sorting
        if hasattr(cls, sort_by):
            sort_column = getattr(cls, sort_by)
            if order == "desc":
                sort_column = sort_column.desc()
            query = query.order_by(sort_column)

        # Apply pagination
        return query.offset(skip).limit(limit).all()

    @classmethod
    def search(cls, db, search_term: str):
        """Search photos by title, description, or caption"""
        return db.query(cls).filter(
            db.or_(
                cls.title.ilike(f"%{search_term}%"),
                cls.description.ilike(f"%{search_term}%"),
                cls.caption.ilike(f"%{search_term}%")
            )
        ).all()

    def update(self, db, **kwargs):
        """Update photo attributes"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        db.commit()
        db.refresh(self)
        return self

    def delete(self, db):
        """Delete photo and its file"""
        # Resolve full path for the stored file_path (handles relative and absolute paths)
        try:
            file_full_path = self.file_path if os.path.isabs(self.file_path) else os.path.join(os.getcwd(), self.file_path)
            if os.path.exists(file_full_path):
                os.remove(file_full_path)
        except Exception:
            # If file deletion fails, continue to remove DB entry but log could be added
            pass
        db.delete(self)
        db.commit()

# --- Unchanged: Tag Model ---
class Tag(Base):
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    photos = relationship("Photo", secondary=photo_tags, back_populates="tags")

    # (All methods for Tag class are unchanged)
    def to_dict(self, include_photos=False):
        # ...
        return result
    @classmethod
    def create(cls, db, name: str):
        # ...
        return tag
    # ... (etc.)


# --- Unchanged: Database Connection ---
def get_database_url():
    """Get database URL from environment variables"""
    host = os.getenv('MYSQL_HOST', 'localhost')
    user = os.getenv('MYSQL_USER', 'root')
    password = os.getenv('MYSQL_PASSWORD', '')
    database = os.getenv('MYSQL_DATABASE', 'campus_lens')
    port = os.getenv('MYSQL_PORT', '3306')
    
    return f"mysql://{user}:{password}@{host}:{port}/{database}"

def init_db():
    """Initialize database connection and create tables"""
    # Create database URL
    database_url = get_database_url()
    
    # Create engine with specific MySQL settings
    engine = create_engine(
        database_url,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=3600
    )
    
    # Create all tables (this will now create the User table too)
    Base.metadata.create_all(engine)
    
    # Create session factory
    SessionLocal = sessionmaker(bind=engine)
    
    return engine, SessionLocal

def get_db():
    """Get database session - use as dependency in FastAPI"""
    engine, SessionLocal = init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()