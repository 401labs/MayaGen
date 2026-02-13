
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
        import zipfile
        import io
        import os
        from fastapi import Response, HTTPException
        
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
        
        # We allow download even if only original exists? 
        # But usually user wants results. Let's proceed even if no results yet, just logic handling.
        
        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            
            # 1. Add Original Image
            # The original_image_url is like "http://localhost:8000/images/projects/MyProject/img.png"
            # We need to find the file modification path on disk.
            # Base path in config is usually `synthetic_dataset`
            
            # Helper to resolve disk path from DB info
            # We assume standard structure: synthetic_dataset/{category}/{filename}
            
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
