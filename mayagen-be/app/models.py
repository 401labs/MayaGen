from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON, Relationship, select
from sqlalchemy.dialects.postgresql import JSONB

class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class BatchJobStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ImageType(str, Enum):
    TEXT_TO_IMAGE = "TEXT_TO_IMAGE"   # Single text-to-image generation
    IMAGE_EDIT = "IMAGE_EDIT"         # Editing an existing image
    BATCH = "BATCH"                   # Part of a bulk batch job

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: Optional[str] = None # Optional for OAuth users
    google_id: Optional[str] = Field(default=None, index=True, unique=True, sa_column_kwargs={"unique": True})
    avatar_url: Optional[str] = None
    role: str = Field(default="user")  # "user" or "admin"
    phone_number: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    images: List["Image"] = Relationship(back_populates="user")
    batch_jobs: List["BatchJob"] = Relationship(back_populates="user")
    activity_logs: List["ActivityLog"] = Relationship(back_populates="user")

class Image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: Optional[str] = None # Nullable until processed
    file_path: Optional[str] = None # Nullable until processed
    prompt: str
    negative_prompt: Optional[str] = None
    width: int
    height: int
    model: str
    provider: str
    category: str = "uncategorized"
    settings: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    is_public: bool = Field(default=True)
    
    # Image Type
    image_type: Optional[str] = Field(default="TEXT_TO_IMAGE")  # TEXT_TO_IMAGE, IMAGE_EDIT, BATCH
    
    # Image Editing/Variation Fields
    is_edit: bool = Field(default=False)  # True if this is an edited/varied image
    original_image_id: Optional[int] = Field(default=None, foreign_key="image.id")
    edit_prompt: Optional[str] = None  # Prompt used for editing
    input_image_path: Optional[str] = None  # Path to original input image (for edits)
    
    # Status Tracking
    status: JobStatus = Field(default=JobStatus.QUEUED, index=True)
    error_message: Optional[str] = None
    
    # Relationships
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="images")
    
    # Link to batch job (if part of a batch)
    batch_job_id: Optional[int] = Field(default=None, foreign_key="batchjob.id")
    batch_job: Optional["BatchJob"] = Relationship(back_populates="images")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BatchJob(SQLModel, table=True):
    """Tracks bulk/batch image generation requests."""
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Configuration
    name: str = Field(default="Untitled Batch")  # User-friendly name
    category: str  # e.g., "animals/cats"
    target_subject: str  # e.g., "domestic cat"
    total_images: int  # Number of images to generate
    
    # Variation Settings (JSON)
    # Example: {"colors": ["orange", "black"], "environments": ["indoor", "outdoor"]}
    variations: Dict[str, List[str]] = Field(default={}, sa_column=Column(JSONB))
    
    # Base prompt template (optional)
    base_prompt_template: Optional[str] = None
    # e.g., "A {color} {target} {action} in {environment}, {style}, highly detailed"
    
    # Progress
    status: BatchJobStatus = Field(default=BatchJobStatus.QUEUED, index=True)
    generated_count: int = Field(default=0)
    failed_count: int = Field(default=0)
    
    # Generation Settings
    model: str = "sd15"
    provider: str = "comfyui"
    width: int = 512
    height: int = 512
    height: int = 512
    is_public: bool = Field(default=True)
    share_token: Optional[str] = Field(default=None, index=True, sa_column_kwargs={"unique": True})
    
    # Relationships
    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="batch_jobs")
    images: List["Image"] = Relationship(back_populates="batch_job")
    
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    images: List["Image"] = Relationship(back_populates="batch_job")
    
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityLog(SQLModel, table=True):
    """Tracks user actions and metadata."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    action: str = Field(index=True)  # e.g., "LOGIN", "GENERATE_IMAGE"
    method: Optional[str] = None  # GET, POST
    endpoint: Optional[str] = None  # /api/v1/generate
    ip_address: Optional[str] = None
    location: Optional[str] = None  # GeoIP
    user_agent: Optional[str] = None
    details: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="activity_logs")

class BlockedIP(SQLModel, table=True):
    """Tracks blocked IP addresses for security and moderation."""
    __tablename__ = "blocked_ip"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True, unique=True, max_length=45)
    reason: Optional[str] = None
    blocked_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    blocked_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    is_active: bool = Field(default=True, index=True)
    
    # Relationship
    blocked_by: Optional[User] = Relationship()
