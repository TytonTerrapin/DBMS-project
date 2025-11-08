"""Database models and utilities"""
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Table, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.sql import func
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

Base = declarative_base()

# Association table for many-to-many relationship between photos and tags
photo_tags = Table('photo_tags',
    Base.metadata,
    Column('photo_id', Integer, ForeignKey('photos.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE')),
    Column('confidence', Float),
    Column('created_at', DateTime, server_default=func.now())
)

class Photo(Base):
    __tablename__ = 'photos'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_path = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    owner_id = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())
    tags_generated = Column(Integer, default=0)
    caption = Column(String(500), nullable=True)
    tags = relationship("Tag", secondary=photo_tags, back_populates="photos",
                       cascade="all, delete")

    def to_dict(self, include_tags=True):
        """Convert photo to dictionary with optional tag inclusion"""
        result = {
            'id': self.id,
            'file_url': f"/uploads/{os.path.basename(self.file_path)}",
            'title': self.title,
            'description': self.description,
            'owner_id': self.owner_id,
            'uploaded_at': self.uploaded_at.isoformat(),
            'tags_generated': self.tags_generated,
            'caption': self.caption
        }
        
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

class Tag(Base):
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    photos = relationship("Photo", secondary=photo_tags, back_populates="tags")

    def to_dict(self, include_photos=False):
        """Convert tag to dictionary with optional photo inclusion"""
        result = {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'photo_count': len(self.photos)
        }
        
        if include_photos:
            result['photos'] = [photo.to_dict(include_tags=False) 
                              for photo in self.photos]
        
        return result

    @classmethod
    def create(cls, db, name: str):
        """Create a new tag or get existing one"""
        tag = db.query(cls).filter(cls.name == name).first()
        if not tag:
            tag = cls(name=name)
            db.add(tag)
            db.commit()
            db.refresh(tag)
        return tag

    @classmethod
    def get_by_id(cls, db, tag_id: int):
        """Get tag by ID"""
        return db.query(cls).filter(cls.id == tag_id).first()

    @classmethod
    def get_by_name(cls, db, name: str):
        """Get tag by name"""
        return db.query(cls).filter(cls.name == name).first()

    @classmethod
    def get_all(cls, db, skip: int = 0, limit: int = 100):
        """Get all tags with optional pagination"""
        return db.query(cls).offset(skip).limit(limit).all()

    @classmethod
    def get_popular(cls, db, limit: int = 10):
        """Get most used tags"""
        return db.query(cls, func.count(photo_tags.c.photo_id).label('count')).\
            join(photo_tags).\
            group_by(cls.id).\
            order_by(func.count(photo_tags.c.photo_id).desc()).\
            limit(limit).all()

    def merge(self, db, other_tag):
        """Merge another tag into this one"""
        # Update photo associations
        for photo in other_tag.photos:
            if photo not in self.photos:
                self.photos.append(photo)
        
        # Delete other tag
        db.delete(other_tag)
        db.commit()
        return self

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
    
    # Create all tables
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