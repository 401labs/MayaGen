
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, col, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_session
from ..models import User, Image, ActivityLog
from ..core import config
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
    
    # Format response with URLs like collections API
    base_url = config.API_BASE_URL + "/images"
    response_list = []
    for img in images:
        # Construct output_path from category and filename
        safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
        output_path = f"{safe_category}/{img.filename}" if img.filename else None
        url = f"{base_url}/{output_path}" if output_path else None
        
        response_list.append({
            "id": img.id,
            "user_id": img.user_id,
            "filename": img.filename,
            "category": img.category,
            "url": url,
            "output_path": output_path,
            "prompt": img.prompt,
            "model": img.model,
            "width": img.width,
            "height": img.height,
            "status": img.status,
            "is_public": img.is_public,
            "created_at": img.created_at.isoformat() if img.created_at else None
        })
    
    return responses.api_success(message="All images retrieved", data={"items": response_list, "total": total})

@router.delete("/images/{image_id}")
async def delete_image(
    image_id: int,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    # Fetch the image
    image = await session.get(Image, image_id)
    if not image:
        return responses.api_error(status_code=404, message="Image not found")
    
    # Delete physical file
    import os
    from pathlib import Path
    file_path = Path(config.OUTPUT_FOLDER) / image.output_path
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete file {file_path}: {e}")
    
    # Delete from database
    await session.delete(image)
    await session.commit()
    
    return responses.api_success(message="Image deleted successfully", data={"id": image_id})
