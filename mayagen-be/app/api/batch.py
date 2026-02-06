"""
Batch API Routes for Bulk Image Generation.

Endpoints:
- POST /batch              Create new batch job
- GET  /batch              List user's batch jobs
- GET  /batch/{id}         Get batch job details
- GET  /batch/{id}/preview Get sample prompts preview
- DELETE /batch/{id}       Cancel batch job
"""

from typing import Optional, Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import os

from ..database import get_session
from ..models import BatchJob, BatchJobStatus, User, Image, JobStatus
from ..helpers import api_response_helper as responses
from ..services.prompt_generator import generate_prompts, get_sample_prompts, estimate_unique_combinations, DEFAULT_VARIATIONS
from . import deps
from ..core import config

router = APIRouter()


# Request/Response Models
class BatchJobCreate(BaseModel):
    name: str = "Untitled Batch"
    category: str
    target_subject: str
    total_images: int = Field(ge=1, le=10000)  # Max 10k images per batch
    variations: Dict[str, List[str]] = {}
    base_prompt_template: Optional[str] = None
    model: str = "sd15"
    provider: str = "comfyui"
    width: int = 512
    height: int = 512
    is_public: bool = True


class BatchJobPreviewRequest(BaseModel):
    target_subject: str
    variations: Dict[str, List[str]] = {}
    base_prompt_template: Optional[str] = None
    count: int = Field(default=5, ge=1, le=10)


@router.post("/batch")
async def create_batch_job(
    data: BatchJobCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Create a new batch job for bulk image generation."""
    try:
        # Create batch job
        batch = BatchJob(
            name=data.name,
            category=data.category,
            target_subject=data.target_subject,
            total_images=data.total_images,
            variations=data.variations,
            base_prompt_template=data.base_prompt_template,
            model=data.model,
            provider=data.provider,
            width=data.width,
            height=data.height,
            user_id=current_user.id,
            status=BatchJobStatus.QUEUED,
            is_public=data.is_public
        )
        
        session.add(batch)
        await session.commit()
        await session.refresh(batch)
        
        # Estimate combinations
        max_combinations = estimate_unique_combinations(data.variations)
        
        return responses.api_success(
            message="Batch job created successfully",
            data={
                "id": batch.id,
                "name": batch.name,
                "status": batch.status,
                "total_images": batch.total_images,
                "max_unique_combinations": max_combinations,
                "created_at": batch.created_at.isoformat()
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to create batch job", error=str(e))


@router.get("/batch")
async def list_batch_jobs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """List all batch jobs for the current user."""
    try:
        statement = (
            select(BatchJob)
            .where(BatchJob.user_id == current_user.id)
            .order_by(BatchJob.created_at.desc())
        )
        results = await session.execute(statement)
        batches = results.scalars().all()
        
        batch_list = []
        for batch in batches:
            batch_list.append({
                "id": batch.id,
                "name": batch.name,
                "category": batch.category,
                "target_subject": batch.target_subject,
                "status": batch.status,
                "total_images": batch.total_images,
                "generated_count": batch.generated_count,
                "failed_count": batch.failed_count,
                "progress": round((batch.generated_count / batch.total_images) * 100, 1) if batch.total_images > 0 else 0,
                "created_at": batch.created_at.isoformat()
            })
        
        return responses.api_success(
            message="Batch jobs retrieved",
            data={"batches": batch_list, "count": len(batch_list)}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to list batch jobs", error=str(e))


@router.get("/batch/{batch_id}")
async def get_batch_job(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Get detailed info about a specific batch job."""
    try:
        statement = select(BatchJob).where(
            BatchJob.id == batch_id,
            BatchJob.user_id == current_user.id
        )
        result = await session.execute(statement)
        batch = result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Batch job not found")
        
        return responses.api_success(
            message="Batch job retrieved",
            data={
                "id": batch.id,
                "name": batch.name,
                "category": batch.category,
                "target_subject": batch.target_subject,
                "status": batch.status,
                "total_images": batch.total_images,
                "generated_count": batch.generated_count,
                "failed_count": batch.failed_count,
                "progress": round((batch.generated_count / batch.total_images) * 100, 1) if batch.total_images > 0 else 0,
                "variations": batch.variations,
                "base_prompt_template": batch.base_prompt_template,
                "model": batch.model,
                "provider": batch.provider,
                "width": batch.width,
                "height": batch.height,
                "error_message": batch.error_message,
                "created_at": batch.created_at.isoformat(),
                "updated_at": batch.updated_at.isoformat()
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return responses.api_error(status_code=500, message="Failed to get batch job", error=str(e))


@router.post("/batch/preview")
async def preview_batch_prompts(
    data: BatchJobPreviewRequest,
    current_user: User = Depends(deps.get_current_user)
):
    """Generate sample prompts for preview without creating a batch job."""
    try:
        sample_prompts = get_sample_prompts(
            target_subject=data.target_subject,
            variations=data.variations,
            template=data.base_prompt_template,
            count=data.count
        )
        
        max_combinations = estimate_unique_combinations(data.variations)
        
        return responses.api_success(
            message="Preview prompts generated",
            data={
                "prompts": sample_prompts,
                "max_unique_combinations": max_combinations
            }
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to generate preview", error=str(e))


@router.delete("/batch/{batch_id}")
async def cancel_batch_job(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Cancel a batch job (only if QUEUED or GENERATING)."""
    try:
        statement = select(BatchJob).where(
            BatchJob.id == batch_id,
            BatchJob.user_id == current_user.id
        )
        result = await session.execute(statement)
        batch = result.scalar_one_or_none()
        
        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Batch job not found")
        
        if batch.status not in [BatchJobStatus.QUEUED, BatchJobStatus.GENERATING]:
            return responses.api_error(
                status_code=400,
                message="Cannot Cancel",
                error=f"Cannot cancel batch job with status: {batch.status}"
            )
        
        batch.status = BatchJobStatus.CANCELLED
        
        # Cancel all queued images for this batch
        from sqlalchemy import update
        image_stmt = (
            update(Image)
            .where(Image.batch_job_id == batch_id)
            .where(Image.status == JobStatus.QUEUED)
            .values(status=JobStatus.CANCELLED)
        )
        await session.execute(image_stmt)
        
        await session.commit()
        
        return responses.api_success(
            message="Batch job cancelled",
            data={"id": batch.id, "status": batch.status}
        )
    except Exception as e:
        return responses.api_error(status_code=500, message="Failed to cancel batch job", error=str(e))


@router.get("/batch/presets")
async def get_variation_presets(
    current_user: User = Depends(deps.get_current_user)
):
    """Get default variation presets for the UI."""
    return responses.api_success(
        message="Variation presets retrieved",
        data={"presets": DEFAULT_VARIATIONS}
    )


@router.get("/batch/{batch_id}/images")
async def get_batch_images(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    page: int = 1,
    limit: int = 24
):
    """Get all images for a specific batch job with pagination."""
    try:
        # Verify batch belongs to user
        batch_stmt = select(BatchJob).where(
            BatchJob.id == batch_id,
            BatchJob.user_id == current_user.id
        )
        batch_result = await session.execute(batch_stmt)
        batch = batch_result.scalar_one_or_none()

        if not batch:
            return responses.api_error(status_code=404, message="Not Found", error="Batch job not found")

        # Get total count
        count_stmt = select(func.count()).where(Image.batch_job_id == batch_id)
        total_result = await session.execute(count_stmt)
        total = total_result.scalar_one()

        # Get paginated images
        base_url = config.API_BASE_URL + "/images"
        offset = (page - 1) * limit
        
        statement = (
            select(Image)
            .where(Image.batch_job_id == batch_id)
            .order_by(Image.created_at.desc())
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
                # Check absolute path logic? 
                # Assuming api/images/ is generic, here we point to static or api route
                # Current system seems to assume static serving or api route access
                url = f"{base_url}/{safe_category}/{img.filename}"

            image_list.append({
                "id": img.id,
                "filename": img.filename,
                "category": img.category,
                "url": url,
                "prompt": img.prompt,
                "model": img.model,
                "status": img.status,
                "created_at": img.created_at.isoformat()
            })

        return responses.api_success(
            message="Batch images retrieved",
            data={
                "batch_id": batch_id,
                "batch_name": batch.name,
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
        return responses.api_error(status_code=500, message="Failed to get batch images", error=str(e))


@router.get("/batch/{batch_id}/download")
async def download_batch_images(
    batch_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    """Download all images in a batch as a ZIP file."""
    try:
        import zipfile
        import io
        from fastapi import Response
        
        # Verify batch
        batch_stmt = select(BatchJob).where(
            BatchJob.id == batch_id,
            BatchJob.user_id == current_user.id
        )
        batch_result = await session.execute(batch_stmt)
        batch = batch_result.scalar_one_or_none()
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Get completed images
        stmt = select(Image).where(
            Image.batch_job_id == batch_id,
            Image.status == JobStatus.COMPLETED
        )
        result = await session.execute(stmt)
        images = result.scalars().all()
        
        if not images:
             raise HTTPException(status_code=404, detail="No completed images to download")

        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for img in images:
                # Construct file path
                # Ideally this should use a config for base path
                base_path = "synthetic_dataset" 
                file_path = os.path.join(base_path, img.category, img.filename)
                
                if os.path.exists(file_path):
                    zip_file.write(file_path, img.filename)
        
        zip_buffer.seek(0)
        
        # Filename: _MAYAGEN_{CATEGORY}_{RANDOMID}.zip
        safe_cat = batch.category.replace("/", "_").replace("\\", "_").upper()
        filename = f"_MAYAGEN_{safe_cat}_{batch.id}.zip"
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        # If it's an HTTP exception re-raise it, otherwise generic 500
        if isinstance(e, HTTPException):
            raise e
        return responses.api_error(status_code=500, message="Download failed", error=str(e))
