
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, col, desc
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_session
from ..models import User, Image, ActivityLog
from .deps import get_current_admin_user
from ..helpers import api_response_helper as responses

router = APIRouter()

# --- User Management ---

@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    query = select(User).offset(skip).limit(limit)
    result = await session.execute(query)
    users = result.scalars().all()
    
    # Hide passwords
    users_data = []
    for u in users:
        u_dict = u.dict()
        u_dict.pop("hashed_password", None)
        users_data.append(u_dict)
        
    return responses.api_success(
        message="Users retrieved",
        data=users_data
    )

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    if role not in ["user", "admin"]:
        return responses.api_error(status_code=400, message="Invalid role", error="Role must be 'user' or 'admin'")
        
    user = await session.get(User, user_id)
    if not user:
        return responses.api_error(status_code=404, message="User not found")
        
    user.role = role
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    u_dict = user.dict()
    u_dict.pop("hashed_password", None)
    
    return responses.api_success(message="User role updated", data=u_dict)

# --- Activity Logs ---

@router.get("/activity")
async def list_activity(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    query = select(ActivityLog).order_by(desc(ActivityLog.timestamp))
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
        
    query = query.offset(skip).limit(limit)
    result = await session.execute(query)
    logs = result.scalars().all()
    
    return responses.api_success(message="Activity logs retrieved", data=logs)

# --- Image Management ---

@router.get("/images")
async def list_all_images(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    # Fetch all images regardless of user, ensuring admin visibility
    query = select(Image).order_by(desc(Image.created_at)).offset(skip).limit(limit)
    result = await session.execute(query)
    images = result.scalars().all()
    
    return responses.api_success(message="All images retrieved", data=images)

