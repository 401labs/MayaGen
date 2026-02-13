import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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

from sqlalchemy import func, or_

@router.get("/images")
async def list_images(
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(deps.get_current_user_optional), # Optional auth
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
    sort_by: str = "newest"
):
    try:
        """Lists generated images. Public feed."""
        base_url = config.API_BASE_URL + "/images"
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Base query for filtering
        base_query = select(Image).where(Image.is_public == True)
        
        # Apply filters
        if search:
            base_query = base_query.where(or_(
                Image.prompt.ilike(f"%{search}%"),
                Image.filename.ilike(f"%{search}%")
            ))
        
        if category and category != "all":
            base_query = base_query.where(Image.category == category)
            
        if status and status != "all":
             base_query = base_query.where(Image.status == status.upper())
        else:
             base_query = base_query.where(Image.status == JobStatus.COMPLETED)

        if model and model != "all":
            base_query =base_query.where(Image.model == model)

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
        
        # Build main statement
        statement = (
            select(Image, User)
            .join(User, isouter=True)
            .where(Image.is_public == True)
        )
        
        if search:
            statement = statement.where(or_(
                Image.prompt.ilike(f"%{search}%"),
                Image.filename.ilike(f"%{search}%")
            ))
            
        if category and category != "all":
            statement = statement.where(Image.category == category)

        if status and status != "all":
             statement = statement.where(Image.status == status.upper())
        else:
             statement = statement.where(Image.status == JobStatus.COMPLETED)
             
        if model and model != "all":
            statement = statement.where(Image.model == model)
            
        # Apply Sorting
        if sort_by == "oldest":
            statement = statement.order_by(Image.created_at.asc())
        else: # newest
            statement = statement.order_by(Image.created_at.desc())
            
        statement = statement.offset(offset).limit(limit)
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
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
    image_type: Optional[str] = None,
    sort_by: str = "newest"
):
    """Get all images created by the current user (Private & Public)."""
    try:
        base_url = config.API_BASE_URL + "/images"
        
        offset = (page - 1) * limit

        # Base filters
        base_query = select(Image).where(Image.user_id == current_user.id)
        
        # Apply filters
        if image_type:
             base_query = base_query.where(Image.image_type == image_type)

        if search:
            base_query = base_query.where(or_(
                Image.prompt.ilike(f"%{search}%"),
                Image.filename.ilike(f"%{search}%")
            ))
        
        if category and category != "all":
            base_query = base_query.where(Image.category == category)
            
        if status and status != "all":
             base_query = base_query.where(Image.status == status.upper())
             
        if model and model != "all":
            base_query = base_query.where(Image.model == model)
        
        # Custom sort order: COMPLETED (1), PROCESSING (2), QUEUED (3), FAILED (4)
        status_order = case(
            (Image.status == JobStatus.COMPLETED, 1),
            (Image.status == JobStatus.PROCESSING, 2),
            (Image.status == JobStatus.QUEUED, 3),
            (Image.status == JobStatus.FAILED, 4),
            else_=5
        )

        # Count total
        count_statement = select(func.count()).select_from(base_query.subquery())
        total_result = await session.execute(count_statement)
        total = total_result.scalar_one()

        statement = (
            select(Image)
            .where(Image.user_id == current_user.id)
        )
        
        if search:
            statement = statement.where(or_(
                Image.prompt.ilike(f"%{search}%"),
                Image.filename.ilike(f"%{search}%")
            ))
            
        if category and category != "all":
            statement = statement.where(Image.category == category)

        if status and status != "all":
             statement = statement.where(Image.status == status.upper())

        if model and model != "all":
            statement = statement.where(Image.model == model)
            
        if image_type:
            statement = statement.where(Image.image_type == image_type)
            
        # Apply Sorting
        if sort_by == "oldest":
            statement = statement.order_by(Image.created_at.asc())
        else:
            # Default to newest (replacing the complex status sort for now as user requested simple sort)
            # If we want to keep status priority for 'newest', we can, but usually filters are better for finding status.
            statement = statement.order_by(Image.created_at.desc())
            
        statement = statement.offset(offset).limit(limit)
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
                "is_public": img.is_public,
                "status": img.status,
                "image_type": img.image_type,
                "input_image_url": f"{base_url}/{img.input_image_path.replace('\\', '/')}" if img.input_image_path and img.is_edit else None
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


async def calculate_queue_position(session: AsyncSession, image: Image) -> Optional[int]:
    """
    Calculates the position of the image in the generation queue.
    Returns:
        0: If currently PROCESSING
        >0: Position in line (1 means next up)
        None: If not in queue (COMPLETED, FAILED, etc)
    """
    if image.status == JobStatus.PROCESSING:
        return 0
    
    if image.status != JobStatus.QUEUED:
        return None

    # 1. Count Processing (Starts at 0 or 1? If 0 is processing, line starts at 1)
    # Actually, if I am next, waiting for the 1 processing item, am I #1 or #2?
    # Usually #1 means "First in waiting line".
    # So we don't count processing in the "Queue Position", but maybe we say "Behind X items".
    # User asked for "Queue Number". (#4 approx 2 mins).
    # If 1 is processing, and I am next, I am #1 in queue.
    
    # Priority Rules:
    # 1. Single Images (batch_job_id is NULL) sorted by created_at
    # 2. Batch Images (batch_job_id is NOT NULL) sorted by created_at
    
    # Count ahead in my priority group
    if image.batch_job_id is None:
        # I am Priority 1
        # Count other Priority 1 images older than me
        statement = select(func.count()).select_from(Image).where(
            Image.status == JobStatus.QUEUED,
            Image.batch_job_id == None,
            Image.created_at < image.created_at
        )
        ahead = (await session.execute(statement)).scalar_one()
        return ahead + 1
        
    else:
        # I am Priority 2
        # Count ALL Priority 1 images (they are all ahead)
        statement_p1 = select(func.count()).select_from(Image).where(
            Image.status == JobStatus.QUEUED,
            Image.batch_job_id == None
        )
        p1_ahead = (await session.execute(statement_p1)).scalar_one()
        
        # Count Priority 2 images older than me
        statement_p2 = select(func.count()).select_from(Image).where(
            Image.status == JobStatus.QUEUED,
            Image.batch_job_id != None,
            Image.created_at < image.created_at
        )
        p2_ahead = (await session.execute(statement_p2)).scalar_one()
        
        return p1_ahead + p2_ahead + 1


@router.get("/images/{image_id}")
async def get_image(
    image_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    try:
        """Get a single image detail."""
        base_url = config.API_BASE_URL + "/images"
        
        #Query with User join
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

        # Calculate Queue Position if needed
        queue_pos = None
        if img.status in [JobStatus.QUEUED, JobStatus.PROCESSING]:
            queue_pos = await calculate_queue_position(session, img)

        # Build input image URL for edits
        input_image_url = None
        if img.input_image_path and img.is_edit:
            safe_input_path = img.input_image_path.replace("\\", "/")
            input_image_url = f"{base_url}/{safe_input_path}"

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
                "status": img.status,
                "queue_position": queue_pos,
                "image_type": img.image_type or ("IMAGE_EDIT" if img.is_edit else "TEXT_TO_IMAGE"),
                "is_edit": img.is_edit,
                "original_image_id": img.original_image_id,
                "edit_prompt": img.edit_prompt,
                "input_image_url": input_image_url
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


# Image Edit/Variation Endpoint
@router.post("/images/edit")
async def edit_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: Optional[str] = Form(None),
    width: int = Form(1024),
    height: int = Form(1024),
    category: str = Form("edits"),
    is_public: bool = Form(True),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Edit/vary an uploaded image using Azure Foundry FLUX.2-pro.
    
    Args:
        image: Input image file (JPEG, PNG, WebP)
        prompt: Text prompt describing desired changes
        negative_prompt: What to avoid in the output (optional)
        width: Output width (default: 1024)
        height: Output height (default: 1024)
        category: Category for organizing edits (default: "edits")
        is_public: Whether edited image should be public (default: True)
    
    Returns:
        Completed image with URL
    """
    try:
        from ..services.image_edit_service import image_edit_service
        
        # Validate file
        if not image_edit_service.validate_image(image):
            return responses.api_error(
                status_code=400,
                message="Invalid image file",
                error="Please upload a valid image file (JPEG, PNG, or WebP)"
            )
        
        # Check file size
        image_bytes = await image.read()
        size_mb = len(image_bytes) / (1024 * 1024)
        if size_mb > config.MAX_UPLOAD_SIZE_MB:
            return responses.api_error(
                status_code=400,
                message="File too large",
                error=f"Image size ({size_mb:.1f}MB) exceeds limit ({config.MAX_UPLOAD_SIZE_MB}MB)"
            )
        
        # Save input image
        input_image_path = await image_edit_service.save_input_image(
            image_bytes,
            current_user.id,
            image.filename or "input.png"
        )
        
        # Create QUEUED image record
        from datetime import datetime as dt
        timestamp = dt.now().strftime("%Y%m%d_%H%M%S")
        filename = f"edit_{current_user.id}_{timestamp}.png"
        
        # We don't have the file yet, but we define where it WILL be
        # The worker will safe the result to this path
        
        new_image = Image(
            prompt=prompt,
            negative_prompt=negative_prompt,
            filename=filename,
            width=width,
            height=height,
            model=config.AZURE_FOUNDRY_MODEL, # "FLUX.1-Kontext-pro"
            provider="azure_foundry",
            category=category,
            is_public=is_public,
            user_id=current_user.id,
            status=JobStatus.QUEUED, # <--- IMPORTANT: Queued, not Completed
            image_type="IMAGE_EDIT",
            is_edit=True,
            edit_prompt=prompt,
            input_image_path=input_image_path
        )
        
        session.add(new_image)
        await session.commit()
        await session.refresh(new_image)
        
        # We return the job info immediately
        # The frontend will poll /images/{id} to see when status changes to COMPLETED
        
        return responses.api_success(
            message="Image edit queued",
            data={
                "id": new_image.id,
                "status": "QUEUED",
                "prompt": prompt,
                "category": category,
                "image_type": "IMAGE_EDIT",
                "is_edit": True,
                "filename": filename,
                "width": width,
                "height": height,
                "input_image_url": f"{config.API_BASE_URL}/images/{input_image_path.replace('\\', '/')}"
            }
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(
            status_code=500,
            message="Failed to queue image edit",
            error=str(e)
        )

