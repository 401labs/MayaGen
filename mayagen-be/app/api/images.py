import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core import config
from ..database import get_session
from ..models import Image, User, JobStatus
from ..models import Image, User, JobStatus
from ..helpers import api_response_helper as responses
from . import deps

router = APIRouter()

from sqlalchemy import case

# ...

from sqlalchemy import func

@router.get("/images")
async def list_images(
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(deps.get_current_user_optional), # Optional auth
    page: int = 1,
    limit: int = 20
):
    try:
        """Lists generated images. Public feed."""
        base_url = config.API_BASE_URL + "/images"
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Base query for filtering
        base_query = select(Image).where(Image.is_public == True).where(Image.status == JobStatus.COMPLETED)
        
        # Count total
        count_statement = select(func.count()).select_from(base_query.subquery())
        total_result = await session.execute(count_statement)
        total = total_result.scalar_one()

        # Custom sort order: COMPLETED (1), PROCESSING (2), QUEUED (3), FAILED (4)
        status_order = case(
            (Image.status == JobStatus.COMPLETED, 1),
            (Image.status == JobStatus.PROCESSING, 2),
            (Image.status == JobStatus.QUEUED, 3),
            (Image.status == JobStatus.FAILED, 4),
            else_=5
        )
        
        # Query DB sorted by Status Priority then Created At desc
        # Query DB sorted by Status Priority then Created At desc
        # Filter: Only public images AND COMPLETED
        statement = (
            select(Image, User)
            .join(User, isouter=True)
            .where(Image.is_public == True)
            .where(Image.status == JobStatus.COMPLETED)
            .order_by(Image.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        results = await session.execute(statement)
        # Results is list of (Image, User) tuples
        
        response_list = []
        for img, user in results:
            # Construct URL based on predictable structure: /images/{category}/{filename}
            # Since we filter by COMPLETED, url is always generated
            safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
            url = f"{base_url}/{safe_category}/{img.filename}"

            response_list.append({
                "id": img.id,
                "filename": img.filename,
                "category": img.category,
                "url": url,
                "prompt": img.prompt,
                "model": img.model,
                "width": img.width,
                "height": img.height,
                "created_at": img.created_at.isoformat(),
                "created_by": user.username if user else "Anonymous",
                "is_public": img.is_public,
                "status": img.status
            })
            
        return responses.api_success(
            message="Images List Retrieved",
            data={
                "images": response_list,
                "meta": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to list images", error=str(e))


@router.get("/images/me")
async def get_my_images(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    page: int = 1,
    limit: int = 20
):
    """Get all images created by the current user (Private & Public)."""
    try:
        base_url = config.API_BASE_URL + "/images"
        
        offset = (page - 1) * limit
        
        # Custom sort order: COMPLETED (1), PROCESSING (2), QUEUED (3), FAILED (4)
        status_order = case(
            (Image.status == JobStatus.COMPLETED, 1),
            (Image.status == JobStatus.PROCESSING, 2),
            (Image.status == JobStatus.QUEUED, 3),
            (Image.status == JobStatus.FAILED, 4),
            else_=5
        )

        # Count total
        count_statement = select(func.count()).where(Image.user_id == current_user.id)
        total_result = await session.execute(count_statement)
        total = total_result.scalar_one()

        statement = (
            select(Image)
            .where(Image.user_id == current_user.id)
            .order_by(status_order, Image.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        results = await session.execute(statement)
        images = results.scalars().all()
        
        response_list = []
        for img in images:
            url = None
            if img.status == JobStatus.COMPLETED:
                safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
                url = f"{base_url}/{safe_category}/{img.filename}"

            response_list.append({
                "id": img.id,
                "filename": img.filename,
                "category": img.category,
                "url": url,
                "prompt": img.prompt,
                "model": img.model,
                "width": img.width,
                "height": img.height,
                "created_at": img.created_at.isoformat(),
                "created_by": current_user.username,
                "is_public": img.is_public,
                "status": img.status
            })
            
        return responses.api_success(
            message="User Collection Retrieved",
            data={
                "images": response_list,
                "meta": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to get user collection", error=str(e))

@router.get("/images/recent")
async def get_recent_images(
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
    limit: int = 8
):
    """Get recent COMPLETED images. If logged in, shows user's images. Else public."""
    try:
        base_url = config.API_BASE_URL + "/images"
        
        # Custom sort order: COMPLETED (1), PROCESSING (2), QUEUED (3), FAILED (4)
        # But for Recent Public Feed, we only want COMPLETED + PUBLIC
        
        statement = (
            select(Image, User)
            .join(User, isouter=True)
            .where(Image.is_public == True)
            .where(Image.status == JobStatus.COMPLETED)
            .order_by(Image.created_at.desc())
            .limit(limit)
        )

        results = await session.execute(statement)
        
        response_list = []
        for img, user in results:
            safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
            url = f"{base_url}/{safe_category}/{img.filename}"
            
            response_list.append({
                "id": img.id,
                "filename": img.filename,
                "url": url,
                "prompt": img.prompt,
                "category": img.category,
                "model": img.model,
                "created_by": user.username if user else "Anonymous"
            })
        
        return responses.api_success(
            message="Recent Images Retrieved",
            data={"images": response_list, "count": len(response_list)}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to get recent images", error=str(e))

@router.get("/images/{image_id}")
async def get_image(
    image_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    try:
        """Get a single image detail."""
        base_url = config.API_BASE_URL + "/images"
        
        # Query with User join
        statement = select(Image, User).where(Image.id == image_id).join(User, isouter=True)
        result = await session.execute(statement)
        row = result.first()
        
        if not row:
            return responses.api_error(status_code=404, message="Not Found", error="Image not found")
            
        img, user = row
        
        # Access Control
        if not img.is_public:
            if not current_user or current_user.id != img.user_id:
                return responses.api_error(status_code=403, message="Access Denied", error="This image is private and can only be viewed by its creator.")

        url = None
        if img.status == JobStatus.COMPLETED:
            safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
            url = f"{base_url}/{safe_category}/{img.filename}"

        return responses.api_success(
            message="Image Detail Retrieved",
            data={
                "id": img.id,
                "user_id": img.user_id,
                "filename": img.filename,
                "category": img.category,
                "url": url,
                "prompt": img.prompt,
                "width": img.width,
                "height": img.height,
                "model": img.model,
                "provider": img.provider,
                "created_at": img.created_at.isoformat(),
                "created_by": user.username if user else "Anonymous",
                "is_public": img.is_public,
                "status": img.status
            }
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to retrieve image", error=str(e))


class ImageUpdate(BaseModel):
    is_public: Optional[bool] = None

@router.patch("/images/{image_id}")
async def update_image(
    image_id: int,
    data: ImageUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Update image details (e.g. visibility). Only owner can update."""
    try:
        statement = select(Image).where(Image.id == image_id)
        result = await session.execute(statement)
        img = result.scalars().first()
        
        if not img:
            return responses.api_error(status_code=404, message="Not Found", error="Image not found")
            
        if img.user_id != current_user.id:
            return responses.api_error(status_code=403, message="Access Denied", error="You can only update your own images")
            
        if data.is_public is not None:
            img.is_public = data.is_public
            
        session.add(img)
        await session.commit()
        await session.refresh(img)
        
        return responses.api_success(
            message="Image updated",
            data={"id": img.id, "is_public": img.is_public}
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to update image", error=str(e))


