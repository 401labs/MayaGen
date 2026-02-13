"""
Edit Batch API Routes for Bulk Image Editing.

Endpoints:
- POST /edit-batch              Create new edit batch job
- GET  /edit-batch              List user's edit batch jobs
- GET  /edit-batch/{id}         Get edit batch job details
- GET  /edit-batch/{id}/images  Get all variations (paginated)
- DELETE /edit-batch/{id}       Cancel edit batch job
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlmodel import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import uuid
import zipfile
import io
import os
import shutil

from ..database import get_session
from ..models import EditBatchJob, BatchJobStatus, User, Image, JobStatus
from ..helpers import api_response_helper as responses
from ..services.prompt_generator import generate_prompts, estimate_unique_combinations
from . import deps
from ..core import config

router = APIRouter()


# Request/Response Models
class EditBatchJobCreate(BaseModel):
    name: str = "Untitled Edit Batch"
    original_image_id: int
    variations: Dict[str, List[str]] = {}
    base_prompt_template: Optional[str] = None
    edit_prompts: Optional[List[str]] = None  # Optional override
    total_variations: int = Field(ge=1, le=100)
    model: str = "FLUX.1-Kontext-pro"
    provider: str = "azure"
    width: int = 512
    height: int = 512
    is_public: bool = True


@router.post("/edit-batch")
async def create_edit_batch_job(
    data: EditBatchJobCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Create a new edit batch job for bulk image editing."""
    try:
        # Verify original image exists and belongs to user
        img_stmt = select(Image).where(
            Image.id == data.original_image_id,
            Image.user_id == current_user.id
        )
        img_result = await session.execute(img_stmt)
        original_image = img_result.scalar_one_or_none()
        
        if not original_image:
            return responses.api_error(
                status_code=404,
                message="Original image not found",
                error="Image not found or you don't have permission"
            )
        
        # Construct image URL
        safe_category = original_image.category.replace("\\", "/") if original_image.category else "uncategorized"
        # FIX: The backend mounts static files at /images, not /outputs
        original_image_url = f"{config.API_BASE_URL}/images/{safe_category}/{original_image.filename}".replace("\\", "/")
        
        # Prepare expanded prompts
        final_prompts = []
        if data.edit_prompts:
            final_prompts = data.edit_prompts[:data.total_variations]
        elif data.base_prompt_template:
            final_prompts = generate_prompts(
                target_subject="the subject", 
                total_images=data.total_variations,
                variations=data.variations, 
                template=data.base_prompt_template
            )
        
        if not final_prompts:
             return responses.api_error(
                status_code=400,
                message="Invalid Configuration",
                error="Must provide either edit_prompts or base_prompt_template"
            )

        # Create edit batch job
        edit_batch = EditBatchJob(
            name=data.name,
            original_image_id=data.original_image_id,
            original_image_url=original_image_url,
            total_variations=len(final_prompts),
            variations=data.variations,
            base_prompt_template=data.base_prompt_template,
            edit_prompts=final_prompts,
            model=data.model,
            provider=data.provider,
            width=data.width,
            height=data.height,
            user_id=current_user.id,
            status=BatchJobStatus.QUEUED,
            is_public=data.is_public
        )
        
        session.add(edit_batch)
        await session.commit()
        await session.refresh(edit_batch)
        
        return responses.api_success(
            message="Edit batch job created successfully",
            data={
                "id": edit_batch.id,
                "name": edit_batch.name,
                "status": edit_batch.status,
                "total_variations": edit_batch.total_variations,
                "created_at": edit_batch.created_at.isoformat()
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to create edit batch job", error=str(e))


@router.get("/edit-batch")
async def list_edit_batch_jobs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """List all edit batch jobs for the current user."""
    try:
        statement = (
            select(EditBatchJob)
            .where(EditBatchJob.user_id == current_user.id)
            .order_by(EditBatchJob.created_at.desc())
        )
        results = await session.execute(statement)
        batches = results.scalars().all()
        
        batch_list = []
        for batch in batches:
            batch_list.append({
                "id": batch.id,
                "name": batch.name,
                "original_image_id": batch.original_image_id,
                "status": batch.status,
                "total_variations": batch.total_variations,
                "generated_count": batch.generated_count,
                "failed_count": batch.failed_count,
                "progress": round((batch.generated_count / batch.total_variations) * 100, 1) if batch.total_variations > 0 else 0,
                "created_at": batch.created_at.isoformat(),
                "share_token": batch.share_token
            })
        
        return responses.api_success(
            message="Edit batch jobs retrieved",
            data={"batches": batch_list, "count": len(batch_list)}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to list edit batch jobs", error=str(e))


@router.get("/edit-batch/{batch_id}")
async def get_edit_batch_job(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Get detailed info about a specific edit batch job."""
    try:
        statement = select(EditBatchJob).where(
            EditBatchJob.id == batch_id,
            EditBatchJob.user_id == current_user.id
        )
        result = await session.execute(statement)
        batch = result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Edit batch job not found")
        
        return responses.api_success(
            message="Edit batch job retrieved",
            data={
                "id": batch.id,
                "name": batch.name,
                "original_image_id": batch.original_image_id,
                "original_image_url": batch.original_image_url,
                "status": batch.status,
                "total_variations": batch.total_variations,
                "generated_count": batch.generated_count,
                "failed_count": batch.failed_count,
                "progress": round((batch.generated_count / batch.total_variations) * 100, 1) if batch.total_variations > 0 else 0,
                "edit_prompts": batch.edit_prompts,
                "model": batch.model,
                "provider": batch.provider,
                "width": batch.width,
                "height": batch.height,
                "error_message": batch.error_message,
                "created_at": batch.created_at.isoformat(),
                "updated_at": batch.updated_at.isoformat(),
                "share_token": batch.share_token
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to get edit batch job", error=str(e))


@router.get("/edit-batch/{batch_id}/images")
async def get_edit_batch_images(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    page: int = 1,
    limit: int = 24
):
    """Get all generated variations for a specific edit batch job with pagination."""
    try:
        # Verify batch belongs to user
        batch_stmt = select(EditBatchJob).where(
            EditBatchJob.id == batch_id,
            EditBatchJob.user_id == current_user.id
        )
        batch_result = await session.execute(batch_stmt)
        batch = batch_result.scalar_one_or_none()

        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Edit batch job not found")

        # Get total count
        count_stmt = select(func.count()).where(Image.edit_batch_job_id == batch_id)
        total_result = await session.execute(count_stmt)
        total = total_result.scalar_one()

        # Get paginated images
        base_url = config.API_BASE_URL + "/images"
        offset = (page - 1) * limit
        
        from sqlalchemy import case

        status_order = case(
            (Image.status == JobStatus.COMPLETED, 1),
            (Image.status == JobStatus.PROCESSING, 2),
            (Image.status == JobStatus.QUEUED, 3),
            (Image.status == JobStatus.FAILED, 4),
            else_=6
        )

        statement = (
            select(Image)
            .where(Image.edit_batch_job_id == batch_id)
            .order_by(status_order, Image.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        results = await session.execute(statement)
        images = results.scalars().all()

        image_list = []
        for img in images:
            url = None
            if img.status == JobStatus.COMPLETED:
                safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
                url = f"{base_url}/{safe_category}/{img.filename}"

            image_list.append({
                "id": img.id,
                "filename": img.filename,
                "category": img.category,
                "url": url,
                "edit_prompt": img.edit_prompt,
                "model": img.model,
                "status": img.status,
                "created_at": img.created_at.isoformat()
            })

        return responses.api_success(
            message="Edit batch images retrieved",
            data={
                "batch_id": batch_id,
                "batch_name": batch.name,
                "original_image_url": batch.original_image_url,
                "images": image_list,
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
        return responses.api_error(status_code=500, message="Failed to get edit batch images", error=str(e))


@router.delete("/edit-batch/{batch_id}")
async def cancel_edit_batch_job(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Cancel an edit batch job (only if QUEUED or GENERATING)."""
    try:
        statement = select(EditBatchJob).where(
            EditBatchJob.id == batch_id,
            EditBatchJob.user_id == current_user.id
        )
        result = await session.execute(statement)
        batch = result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Edit batch job not found")
        
        if batch.status not in [BatchJobStatus.QUEUED, BatchJobStatus.GENERATING]:
            return responses.api_error(
                status_code=400,
                message="Cannot Cancel",
                error=f"Cannot cancel edit batch job with status: {batch.status}"
            )
        
        batch.status = BatchJobStatus.CANCELLED
        
        # Cancel all queued images for this batch
        from sqlalchemy import update
        image_stmt = (
            update(Image)
            .where(Image.edit_batch_job_id == batch_id)
            .where(Image.status == JobStatus.QUEUED)
            .values(status=JobStatus.CANCELLED)
        )
        await session.execute(image_stmt)
        
        await session.commit()
        
        return responses.api_success(
            message="Edit batch job cancelled",
            data={"id": batch.id, "status": batch.status}
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to cancel edit batch job", error=str(e))


# ==========================================
# Export Endpoints
# ==========================================

@router.get("/edit-batch/{batch_id}/download")
async def download_edit_batch_images(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Download all images in an edit batch as a ZIP file (including original)."""
    try:
        # Verify batch
        batch_stmt = select(EditBatchJob).where(
            EditBatchJob.id == batch_id,
            EditBatchJob.user_id == current_user.id
        )
        batch_result = await session.execute(batch_stmt)
        batch = batch_result.scalar_one_or_none()
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Get completed images
        stmt = select(Image).where(
            Image.edit_batch_job_id == batch_id,
            Image.status == JobStatus.COMPLETED
        )
        result = await session.execute(stmt)
        images = result.scalars().all()
        
        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            
            # 1. Add Original Image
            # Find original image record for category/filename
            orig_stmt = select(Image).where(Image.id == batch.original_image_id)
            orig_result = await session.execute(orig_stmt)
            orig_img_record = orig_result.scalar_one_or_none()
            
            if orig_img_record:
                # Construct file path
                base_path = "synthetic_dataset"
                # Handle category (could be null or have backslashes)
                cat_path = orig_img_record.category if orig_img_record.category else "uncategorized"
                orig_file_path = os.path.join(base_path, cat_path, orig_img_record.filename)
                
                if os.path.exists(orig_file_path):
                   zip_file.write(orig_file_path, f"original_{orig_img_record.filename}")
            
            # 2. Add Generated Variations
            if images:
                for img in images:
                    cat_path = img.category if img.category else "uncategorized"
                    file_path = os.path.join(base_path, cat_path, img.filename)
                    if os.path.exists(file_path):
                        zip_file.write(file_path, img.filename)
        
        zip_buffer.seek(0)
        
        # Filename: _MAYAGEN_EDIT_{BATCH_NAME}_{ID}.zip
        safe_name = batch.name.replace(" ", "_").replace("/", "_")
        filename = f"_MAYAGEN_EDIT_{safe_name}_{batch.id}.zip"
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        return responses.api_error(status_code=500, message="Download failed", error=str(e))


# ==========================================
# Sharing Endpoints
# ==========================================

@router.post("/edit-batch/{batch_id}/share")
async def generate_share_token(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Generate or regenerate a unique share token for an edit batch."""
    try:
        statement = select(EditBatchJob).where(
            EditBatchJob.id == batch_id, 
            EditBatchJob.user_id == current_user.id
        )
        result = await session.execute(statement)
        batch = result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Edit batch job not found")
            
        # Generate new token
        batch.share_token = str(uuid.uuid4())
        session.add(batch)
        await session.commit()
        await session.refresh(batch)
        
        return responses.api_success(
            message="Share link generated",
            data={"id": batch.id, "share_token": batch.share_token}
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to generate share token", error=str(e))


@router.delete("/edit-batch/{batch_id}/share")
async def revoke_share_token(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Revoke the share token, making the link invalid."""
    try:
        statement = select(EditBatchJob).where(
            EditBatchJob.id == batch_id, 
            EditBatchJob.user_id == current_user.id
        )
        result = await session.execute(statement)
        batch = result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Edit batch job not found")
            
        batch.share_token = None
        session.add(batch)
        await session.commit()
        
        return responses.api_success(message="Share link revoked")
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to revoke share token", error=str(e))


@router.get("/edit-batch/shared/{token}")
async def get_shared_edit_batch(
    token: str,
    session: AsyncSession = Depends(get_session)
):
    """Public access to an edit batch via share token."""
    try:
        # Find batch by token
        statement = select(EditBatchJob, User).join(User).where(EditBatchJob.share_token == token)
        result = await session.execute(statement)
        row = result.first()
        
        if not row:
            return responses.api_error(status_code=404, message="Not Found", error="Invalid or expired share link")
            
        batch, user = row
        
        return responses.api_success(
            message="Shared edit batch retrieved",
            data={
                "id": batch.id,
                "name": batch.name,
                "original_image_url": batch.original_image_url,
                "status": batch.status,
                "total_variations": batch.total_variations,
                "generated_count": batch.generated_count,
                "progress": round((batch.generated_count / batch.total_variations) * 100, 1) if batch.total_variations > 0 else 0,
                "model": batch.model,
                "created_at": batch.created_at.isoformat(),
                "created_by": user.username,
                "variations": batch.variations
            }
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to retrieve shared edit batch", error=str(e))


@router.get("/edit-batch/shared/{token}/images")
async def get_shared_edit_batch_images(
    token: str,
    page: int = 1,
    limit: int = 24,
    search: Optional[str] = None,
    sort_by: str = "newest",
    session: AsyncSession = Depends(get_session)
):
    """Public access to edit batch images via share token."""
    try:
        # Verify token
        batch_stmt = select(EditBatchJob).where(EditBatchJob.share_token == token)
        batch_result = await session.execute(batch_stmt)
        batch = batch_result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Invalid or expired share link")
            
        # Get images
        base_url = config.API_BASE_URL + "/images"
        offset = (page - 1) * limit
        
        # Base filters
        base_filters = [
            Image.edit_batch_job_id == batch.id,
            Image.status == JobStatus.COMPLETED
        ]
        
        if search:
            base_filters.append(or_(
                Image.edit_prompt.ilike(f"%{search}%"),
                Image.filename.ilike(f"%{search}%")
            ))

        # Get total
        count_stmt = select(func.count()).where(*base_filters)
        total_result = await session.execute(count_stmt)
        total = total_result.scalar_one()
        
        # Get Images (Only Completed for public view)
        statement = (
            select(Image)
            .where(*base_filters)
        )
        
        if sort_by == "oldest":
            statement = statement.order_by(Image.created_at.asc())
        else:
            statement = statement.order_by(Image.created_at.desc())
            
        statement = statement.offset(offset).limit(limit)
        results = await session.execute(statement)
        images = results.scalars().all()
        
        image_list = []
        for img in images:
            safe_category = img.category.replace("\\", "/") if img.category else "uncategorized"
            url = f"{base_url}/{safe_category}/{img.filename}"
            
            image_list.append({
                "id": img.id,
                "filename": img.filename,
                "url": url,
                "edit_prompt": img.edit_prompt,
                "width": img.width,
                "height": img.height,
                "is_public": img.is_public
            })
            
        return responses.api_success(
            message="Shared images retrieved",
            data={
                "images": image_list,
                "meta": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to retrieve shared images", error=str(e))