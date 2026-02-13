
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, col, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, text
from ..database import get_session
from ..models import User, Image, ActivityLog, JobStatus, BatchJob, BatchJobStatus, EditBatchJob
from ..core import config
from .deps import get_current_admin_user
from ..helpers import api_response_helper as responses

router = APIRouter()

# --- Queue Management ---

@router.get("/queue")
async def get_queue(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get global queue with positions, stats, and processing jobs."""
    
    # 1. Stats: count by status
    stats_query = select(
        Image.status,
        func.count(Image.id)
    ).group_by(Image.status)
    stats_result = await session.execute(stats_query)
    stats_raw = stats_result.all()
    print(f"DEBUG: stats_raw = {stats_raw}")
    
    # Ensure keys are strings and handle potential case mismatch if needed (though API returns what it returns)
    stats = {}
    for s, c in stats_raw:
        # If 's' is Enum, s.value gives the string. If it's already string, use it.
        key = str(s.value if hasattr(s, 'value') else s)
        print(f"DEBUG: Processing stat key={key} count={c}")
        stats[key.lower()] = c # Force lowercase keys to match what I just set in Frontend

    print(f"DEBUG: final stats dict = {stats}")

    
    # 2. Currently PROCESSING jobs (Always get all processing jobs as they are few)
    processing_query = (
        select(Image)
        .where(Image.status == JobStatus.PROCESSING)
        .order_by(Image.updated_at.desc())
    )
    processing_result = await session.execute(processing_query)
    processing_jobs = processing_result.scalars().all()
    
    # 3. QUEUED jobs (Pagination)
    # Count total queued first
    queue_count_query = select(func.count()).select_from(Image).where(Image.status == JobStatus.QUEUED)
    queue_total_result = await session.execute(queue_count_query)
    queue_total = queue_total_result.scalar()

    # Fetch page of queued jobs
    queued_query = (
        select(Image)
        .where(Image.status == JobStatus.QUEUED)
        .order_by(
            case(
                (Image.batch_job_id.is_(None), 0),
                else_=1
            ).asc(),
            Image.created_at.asc()
        )
        .offset(skip)
        .limit(limit)
    )
    queued_result = await session.execute(queued_query)
    queued_jobs = queued_result.scalars().all()
    
    # 4. Active/pending batch jobs (Regular & Edit)
    batch_query = (
        select(BatchJob)
        .where(BatchJob.status.in_([BatchJobStatus.QUEUED, BatchJobStatus.GENERATING]))
        .order_by(BatchJob.created_at.desc())
    )
    batch_result = await session.execute(batch_query)
    active_batches = batch_result.scalars().all()

    edit_batch_query = (
        select(EditBatchJob)
        .where(EditBatchJob.status.in_([BatchJobStatus.QUEUED, BatchJobStatus.GENERATING]))
        .order_by(EditBatchJob.created_at.desc())
    )
    edit_batch_result = await session.execute(edit_batch_query)
    active_edit_batches = edit_batch_result.scalars().all()
    
    # Format helper
    base_url = config.API_BASE_URL + "/images"
    def format_job(img, position=None):
        safe_cat = img.category.replace("\\", "/") if img.category else "uncategorized"
        output_path = f"{safe_cat}/{img.filename}" if img.filename else None
        # Clean status: use .value if available (e.g. "QUEUED") instead of str() (e.g. "JobStatus.QUEUED")
        status_str = img.status.value if hasattr(img.status, 'value') else str(img.status)
        
        return {
            "id": img.id,
            "position": position,
            "prompt": img.prompt[:100] if img.prompt else None,
            "edit_prompt": img.edit_prompt[:100] if img.edit_prompt else None,
            "is_edit": img.is_edit,
            "status": status_str,
            "model": img.model,
            "provider": img.provider,
            "category": img.category,
            "width": img.width,
            "height": img.height,
            "user_id": img.user_id,
            "batch_job_id": img.batch_job_id,
            "url": f"{base_url}/{output_path}" if output_path else None,
            "created_at": img.created_at.isoformat() if img.created_at else None,
            "updated_at": img.updated_at.isoformat() if img.updated_at else None,
        }
    
    processing_list = [format_job(j) for j in processing_jobs]
    # Calculate global position: skip + index + 1
    queued_list = [format_job(j, position=skip + i + 1) for i, j in enumerate(queued_jobs)]
    
    batch_list = []
    for b in active_batches:
        batch_list.append({
            "id": b.id,
            "name": b.name,
            "type": "generate",
            "status": str(b.status.value if hasattr(b.status, 'value') else b.status),
            "total_images": b.total_images,
            "generated_count": b.generated_count,
            "failed_count": b.failed_count,
            "user_id": b.user_id,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    
    for b in active_edit_batches:
        batch_list.append({
            "id": b.id,
            "name": b.name,
            "type": "edit",
            "status": str(b.status.value if hasattr(b.status, 'value') else b.status),
            "total_images": b.total_variations,
            "generated_count": b.generated_count,
            "failed_count": b.failed_count,
            "user_id": b.user_id,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    
    # Sort combined list by created_at desc
    batch_list.sort(key=lambda x: x["created_at"], reverse=True)
    
    return responses.api_success(
        message="Queue retrieved",
        data={
            "stats": {
                "queued": stats.get("queued", 0),
                "processing": stats.get("processing", 0),
                "completed": stats.get("completed", 0),
                "failed": stats.get("failed", 0),
            },
            "processing": processing_list,
            "queued": {
                "items": queued_list,
                "total": queue_total,
                "skip": skip,
                "limit": limit
            },
            "active_batches": batch_list,
        }
    )

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
    
    # Construct path manually as output_path is not a DB column
    safe_cat = image.category.replace("\\", "/") if image.category else "uncategorized"
    output_path = f"{safe_cat}/{image.filename}"
    file_path = Path(config.OUTPUT_FOLDER) / output_path
    
    if file_path.exists():
        try:
            os.remove(file_path)
            print(f"Deleted file {file_path}")
        except Exception as e:
            print(f"Failed to delete file {file_path}: {e}")
    else:
        print(f"File not found at {file_path}, deleting DB record only.")
    
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
