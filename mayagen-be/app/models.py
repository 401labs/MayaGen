from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON, Relationship, select
from sqlalchemy.dialects.postgresql import JSONB

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Images relationship
    images: List["Image"] = Relationship(back_populates="user")

class Image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    file_path: str
    prompt: str
    negative_prompt: Optional[str] = None
    width: int
    height: int
    model: str
    provider: str
    category: str = "uncategorized"
    settings: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    is_public: bool = Field(default=True)
    
    # User Relation
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="images")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
