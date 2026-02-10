
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, col, desc, func
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
    # Get Total Count
    count_query = select(func.count()).select_from(User)
    total_result = await session.execute(count_query)
    total = total_result.scalar()

    query = select(User).order_by(User.id).offset(skip).limit(limit)
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
        data={"items": users_data, "total": total}
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
    count_query = select(func.count()).select_from(ActivityLog)
    
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
        count_query = count_query.where(ActivityLog.user_id == user_id)
        
    total_result = await session.execute(count_query)
    total = total_result.scalar()
        
    query = query.offset(skip).limit(limit)
    result = await session.execute(query)
    logs = result.scalars().all()
    
    return responses.api_success(message="Activity logs retrieved", data={"items": logs, "total": total})

# --- Image Management ---

@router.get("/images")
async def list_all_images(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    # Get Total Count
    count_query = select(func.count()).select_from(Image)
    total_result = await session.execute(count_query)
    total = total_result.scalar()

    # Fetch all images regardless of user, ensuring admin visibility
    query = select(Image).order_by(desc(Image.created_at)).offset(skip).limit(limit)
    result = await session.execute(query)
    images = result.scalars().all()
    
    return responses.api_success(message="All images retrieved", data={"items": images, "total": total})

