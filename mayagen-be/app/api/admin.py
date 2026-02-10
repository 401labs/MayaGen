
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

@router.patch("/images/{image_id}/visibility")
async def toggle_image_visibility(
    image_id: int,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Toggle image public/private visibility."""
    image = await session.get(Image, image_id)
    if not image:
        return responses.api_error(status_code=404, message="Image not found")
    
    # Toggle visibility
    image.is_public = not image.is_public
    await session.commit()
    
    return responses.api_success(
        message=f"Image visibility updated to {'public' if image.is_public else 'private'}",
        data={"id": image_id, "is_public": image.is_public}
    )

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

# --- IP Blocking Management ---

from ..models import BlockedIP
from pydantic import BaseModel

class BlockIPRequest(BaseModel):
    ip_address: str
    reason: Optional[str] = None
    expires_hours: Optional[int] = None  # Optional temporary block

@router.post("/block-ip")
async def block_ip(
    request: BlockIPRequest,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Block an IP address from accessing the platform."""
    # Check if IP is already blocked
    query = select(BlockedIP).where(BlockedIP.ip_address == request.ip_address)
    result = await session.execute(query)
    existing_block = result.scalar_one_or_none()
    
    if existing_block:
        if existing_block.is_active:
            return responses.api_error(status_code=400, message="IP is already blocked")
        else:
            # Reactivate existing block
            existing_block.is_active = True
            existing_block.reason = request.reason
            existing_block.blocked_by_user_id = admin.id
            existing_block.blocked_at = datetime.utcnow()
            if request.expires_hours:
                from datetime import timedelta
                existing_block.expires_at = datetime.utcnow() + timedelta(hours=request.expires_hours)
            else:
                existing_block.expires_at = None
            await session.commit()
            return responses.api_success(message="IP block reactivated", data={"ip_address": request.ip_address})
    
    # Create new block
    expires_at = None
    if request.expires_hours:
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(hours=request.expires_hours)
    
    blocked_ip = BlockedIP(
        ip_address=request.ip_address,
        reason=request.reason,
        blocked_by_user_id=admin.id,
        expires_at=expires_at
    )
    
    session.add(blocked_ip)
    await session.commit()
    await session.refresh(blocked_ip)
    
    return responses.api_success(message="IP blocked successfully", data={
        "id": blocked_ip.id,
        "ip_address": blocked_ip.ip_address,
        "reason": blocked_ip.reason,
        "expires_at": blocked_ip.expires_at.isoformat() if blocked_ip.expires_at else None
    })

@router.delete("/block-ip/{ip_address}")
async def unblock_ip(
    ip_address: str,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Unblock an IP address."""
    query = select(BlockedIP).where(
        BlockedIP.ip_address == ip_address,
        BlockedIP.is_active == True
    )
    result = await session.execute(query)
    blocked_ip = result.scalar_one_or_none()
    
    if not blocked_ip:
        return responses.api_error(status_code=404, message="Active block not found for this IP")
    
    # Deactivate the block
    blocked_ip.is_active = False
    await session.commit()
    
    return responses.api_success(message="IP unblocked successfully", data={"ip_address": ip_address})

@router.get("/blocked-ips")
async def list_blocked_ips(
    skip: int = 0,
    limit: int = 50,
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """List all blocked IPs."""
    # Base query
    base_query = select(BlockedIP)
    if not include_inactive:
        base_query = base_query.where(BlockedIP.is_active == True)
    
    # Get total count
    from sqlalchemy import func as sql_func
    count_query = select(sql_func.count()).select_from(BlockedIP)
    if not include_inactive:
        count_query = count_query.where(BlockedIP.is_active == True)
    total_result = await session.execute(count_query)
    total = total_result.scalar()
    
    # Fetch blocked IPs
    query = base_query.order_by(desc(BlockedIP.blocked_at)).offset(skip).limit(limit)
    result = await session.execute(query)
    blocked_ips = result.scalars().all()
    
    # Format response
    response_list = []
    for block in blocked_ips:
        response_list.append({
            "id": block.id,
            "ip_address": block.ip_address,
            "reason": block.reason,
            "blocked_by_user_id": block.blocked_by_user_id,
            "blocked_at": block.blocked_at.isoformat() if block.blocked_at else None,
            "expires_at": block.expires_at.isoformat() if block.expires_at else None,
            "is_active": block.is_active
        })
    
    return responses.api_success(message="Blocked IPs retrieved", data={"items": response_list, "total": total})

@router.get("/users/{user_id}/ips")
async def get_user_ips(
    user_id: int,
    limit: int = 10,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get recent IP addresses used by a specific user."""
    # Query activity logs for unique IPs
    query = (
        select(ActivityLog.ip_address, func.max(ActivityLog.timestamp).label("last_seen"))
        .where(ActivityLog.user_id == user_id, ActivityLog.ip_address.isnot(None))
        .group_by(ActivityLog.ip_address)
        .order_by(desc("last_seen"))
        .limit(limit)
    )
    
    result = await session.execute(query)
    ip_records = result.all()
    
    # Format response and check if IPs are blocked
    response_list = []
    for ip, last_seen in ip_records:
        # Check if blocked
        block_query = select(BlockedIP).where(
            BlockedIP.ip_address == ip,
            BlockedIP.is_active == True
        )
        block_result = await session.execute(block_query)
        is_blocked = block_result.scalar_one_or_none() is not None
        
        response_list.append({
            "ip_address": ip,
            "last_seen": last_seen.isoformat() if last_seen else None,
            "is_blocked": is_blocked
        })
    
    return responses.api_success(message="User IPs retrieved", data={"user_id": user_id, "ips": response_list})
