import asyncio
import os
import logging
from datetime import datetime
from sqlmodel import select
from sqlalchemy import text, func
from app.database import get_session_context
from app.models import Image, JobStatus, BatchJob, BatchJobStatus, EditBatchJob
from app.core import config
from app.services.comfy_client import ComfyUIProvider
from app.services.prompt_generator import generate_prompts

# Setup Logging
logger = logging.getLogger("worker")

provider = ComfyUIProvider(config.COMFYUI["server_address"])

async def process_job(image_id: int):
    """
    Processes a single image job.
    """
    async with get_session_context() as session:
        # Re-fetch image to get details
        result = await session.execute(select(Image).where(Image.id == image_id))
        job = result.scalars().first()
        
        if not job:
            logger.error(f"Job {image_id} not found after locking.")
            return

        logger.info(f"Starting Job {job.id} | Prompt: {job.prompt[:30]}...")
        
        try:
            # 1. Prepare Paths
            safe_category = job.category
            category_dir = os.path.join(config.OUTPUT_FOLDER, safe_category)
            os.makedirs(category_dir, exist_ok=True)
            
            # Generate filename if not set (for edit jobs)
            if not job.filename:
                from datetime import datetime as dt
                timestamp = dt.now().strftime("%Y%m%d_%H%M%S")
                job.filename = f"edit_{job.id}_{timestamp}.png"
            
            # Construct full absolute path
            full_output_path = os.path.join(category_dir, job.filename)
            
            # 2. Check Provider / Job Type
            if job.is_edit and job.provider in ["azure", "azure_foundry"]:
                # Azure Foundry FLUX.2-pro Image Edit
                from app.services.image_edit_service import image_edit_service
                
                # Read input image
                input_path = os.path.join(config.OUTPUT_FOLDER, job.input_image_path)
                input_path = os.path.normpath(input_path)
                
                if not os.path.exists(input_path):
                    logger.error(f"Input image not found at: {input_path}")
                    raise FileNotFoundError(f"Input image not found at: {input_path}")

                with open(input_path, "rb") as f:
                    input_image_bytes = f.read()
                
                # Call Azure Foundry API
                output_bytes = await image_edit_service.edit_image(
                    image_bytes=input_image_bytes,
                    prompt=job.edit_prompt or job.prompt,
                    negative_prompt=job.negative_prompt,
                    width=job.width,
                    height=job.height
                )
                
                # Save output image
                with open(full_output_path, "wb") as f:
                    f.write(output_bytes)
                
                logger.info(f"Azure Foundry edit completed for job {job.id}")
            
            elif job.provider == "comfyui":
                workflow_path = config.WORKFLOWS.get(job.model, config.WORKFLOWS["sd15"])
                
                # EXECUTE GENERATION
                # We pass the full path so ComfyClient saves it in the right folder
                await asyncio.to_thread(
                    provider.generate, 
                    job.prompt, 
                    full_output_path, 
                    job.width, 
                    job.height, 
                    workflow_path
                )
                
            else:
                # Mock
                await asyncio.sleep(2)
                logger.info("Mock generation complete")

            # 3. Update Success
            job.status = JobStatus.COMPLETED
            job.file_path = full_output_path # Save the absolute path
            job.updated_at = datetime.utcnow()
            session.add(job)
            await session.commit()
            logger.info(f"Job {job.id} COMPLETED.")
            
            # 4. Update batch job progress if applicable
            if job.batch_job_id:
                await update_batch_progress(job.batch_job_id, success=True)
            elif job.edit_batch_job_id:
                await update_edit_batch_progress(job.edit_batch_job_id, success=True)

        except Exception as e:
            logger.error(f"Job {job.id} FAILED: {e}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            session.add(job)
            await session.commit()
            
            # Update batch job progress
            if job.batch_job_id:
                await update_batch_progress(job.batch_job_id, success=False)
            elif job.edit_batch_job_id:
                await update_edit_batch_progress(job.edit_batch_job_id, success=False)


async def update_batch_progress(batch_id: int, success: bool):
    """Update batch job progress by counting actual images."""
    async with get_session_context() as session:
        result = await session.execute(select(BatchJob).where(BatchJob.id == batch_id))
        batch = result.scalars().first()
        
        if batch:
            # Count completed and failed images
            # This is idempotent and handles retries correctly
            completed_count = await session.execute(
                select(func.count()).where(Image.batch_job_id == batch_id, Image.status == JobStatus.COMPLETED)
            )
            failed_count = await session.execute(
                select(func.count()).where(Image.batch_job_id == batch_id, Image.status == JobStatus.FAILED)
            )
            
            batch.generated_count = completed_count.scalar_one()
            batch.failed_count = failed_count.scalar_one()
            
            # Check if batch is complete
            total_processed = batch.generated_count + batch.failed_count
            if total_processed >= batch.total_images:
                batch.status = BatchJobStatus.COMPLETED
                logger.info(f"Batch {batch.id} COMPLETED: {batch.generated_count} success, {batch.failed_count} failed")
            
            batch.updated_at = datetime.utcnow()
            session.add(batch)
            await session.commit()


async def update_edit_batch_progress(edit_batch_id: int, success: bool):
    """Update edit batch job progress by counting actual images."""
    async with get_session_context() as session:
        result = await session.execute(select(EditBatchJob).where(EditBatchJob.id == edit_batch_id))
        batch = result.scalars().first()
        
        if batch:
            # Count completed and failed images
            completed_count = await session.execute(
                select(func.count()).where(Image.edit_batch_job_id == edit_batch_id, Image.status == JobStatus.COMPLETED)
            )
            failed_count = await session.execute(
                select(func.count()).where(Image.edit_batch_job_id == edit_batch_id, Image.status == JobStatus.FAILED)
            )
            
            batch.generated_count = completed_count.scalar_one()
            batch.failed_count = failed_count.scalar_one()
            
            # Check if batch is complete
            total_processed = batch.generated_count + batch.failed_count
            if total_processed >= batch.total_variations:
                batch.status = BatchJobStatus.COMPLETED
                logger.info(f"Edit Batch {batch.id} COMPLETED: {batch.generated_count} success, {batch.failed_count} failed")
            
            batch.updated_at = datetime.utcnow()
            session.add(batch)
            await session.commit()


async def process_edit_batch_jobs():
    """
    Poll for QUEUED edit batch jobs and create Image records.
    """
    async with get_session_context() as session:
        # Find next QUEUED edit batch job
        result = await session.execute(
            select(EditBatchJob)
            .where(EditBatchJob.status == BatchJobStatus.QUEUED)
            .order_by(EditBatchJob.created_at.asc())
            .limit(1)
        )
        batch = result.scalars().first()
        
        if not batch:
            return False
            
        logger.info(f"Processing Edit Batch Job {batch.id}: {batch.name} ({batch.total_variations} variations)")
        
        try:
            # Mark as generating
            batch.status = BatchJobStatus.GENERATING
            session.add(batch)
            await session.commit()
            
            # Get original image details
            img_result = await session.execute(select(Image).where(Image.id == batch.original_image_id))
            original_image = img_result.scalars().first()
            
            if not original_image:
                raise Exception("Original image not found")

            # Create Image records for each edit prompt
            for i, prompt in enumerate(batch.edit_prompts):
                # Ensure we don't exceed total variations if prompts list is shorter/longer
                if i >= batch.total_variations:
                    break
                    
                image = Image(
                    prompt=prompt, # Using the edit prompt
                    edit_prompt=prompt,
                    filename=None, # Will be generated in process_job
                    category=original_image.category,
                    model=batch.model,
                    provider=batch.provider,
                    width=batch.width,
                    height=batch.height,
                    user_id=batch.user_id,
                    edit_batch_job_id=batch.id,
                    status=JobStatus.QUEUED,
                    is_public=batch.is_public,
                    is_edit=True,
                    input_image_url=batch.original_image_url,
                    input_image_path=os.path.join(original_image.category, original_image.filename)
                )
                session.add(image)
            
            await session.commit()
            logger.info(f"Created {len(batch.edit_prompts)} image edit jobs for batch {batch.id}")
            return True
            
        except Exception as e:
            logger.error(f"Edit Batch Job {batch.id} FAILED: {e}")
            batch.status = BatchJobStatus.FAILED
            batch.error_message = str(e)
            session.add(batch)
            await session.commit()
            return False


async def process_batch_jobs():
    """
    Poll for QUEUED batch jobs, generate prompts, and create Image records.
    """
    async with get_session_context() as session:
        # Find next QUEUED batch job
        result = await session.execute(
            select(BatchJob)
            .where(BatchJob.status == BatchJobStatus.QUEUED)
            .order_by(BatchJob.created_at.asc())
            .limit(1)
        )
        batch = result.scalars().first()
        
        if not batch:
            return False  # No batch jobs to process
        
        logger.info(f"Processing Batch Job {batch.id}: {batch.name} ({batch.total_images} images)")
        
        try:
            # Mark as generating
            batch.status = BatchJobStatus.GENERATING
            session.add(batch)
            await session.commit()
            
            # Generate prompts
            prompts = generate_prompts(
                target_subject=batch.target_subject,
                total_images=batch.total_images,
                variations=batch.variations,
                template=batch.base_prompt_template,
                unique=True
            )
            
            # Create Image records for each prompt
            for i, prompt in enumerate(prompts):
                filename = f"{batch.category.replace('/', '_')}_{batch.id}_{i+1:04d}.png"
                
                image = Image(
                    prompt=prompt,
                    filename=filename,
                    category=batch.category,
                    model=batch.model,
                    provider=batch.provider,
                    width=batch.width,
                    height=batch.height,
                    user_id=batch.user_id,
                    batch_job_id=batch.id,
                    status=JobStatus.QUEUED,
                    is_public=batch.is_public
                )
                session.add(image)
            
            await session.commit()
            logger.info(f"Created {len(prompts)} image jobs for batch {batch.id}")
            return True
            
        except Exception as e:
            logger.error(f"Batch Job {batch.id} FAILED: {e}")
            batch.status = BatchJobStatus.FAILED
            batch.error_message = str(e)
            session.add(batch)
            await session.commit()
            return False



async def batch_manager_loop():
    """Loop for expanding Batch Jobs into Image Jobs."""
    logger.info("Batch Manager started.")
    while True:
        try:
            has_batch = await process_batch_jobs()
            has_edit_batch = await process_edit_batch_jobs()
            
            if not has_batch and not has_edit_batch:
                await asyncio.sleep(2) # Sleep if no jobs found
        except Exception as e:
            logger.error(f"Batch Manager Error: {e}")
            await asyncio.sleep(5)


async def comfy_worker_loop():
    """Loop for processing local ComfyUI generation jobs."""
    logger.info("ComfyUI Worker started.")
    while True:
        try:
            async with get_session_context() as session:
                # Pop next ComfyUI job
                statement = text("""
                    UPDATE image
                    SET status = 'PROCESSING'
                    WHERE id = (
                        SELECT id
                        FROM image
                        WHERE status = 'QUEUED' 
                        AND provider = 'comfyui'
                        ORDER BY 
                            CASE WHEN batch_job_id IS NULL THEN 0 ELSE 1 END ASC,
                            created_at ASC
                        LIMIT 1
                        FOR UPDATE SKIP LOCKED
                    )
                    RETURNING id;
                """)
                
                result = await session.execute(statement)
                row = result.first()
                
                if row:
                    job_id = row[0]
                    await session.commit()
                    
                    logger.info(f"ComfyWorker: Picked up Job {job_id}...")
                    try:
                        await process_job(job_id)
                        logger.info(f"ComfyWorker: Finished Job {job_id}.")
                    except Exception as e:
                        logger.error(f"ComfyWorker: Error on Job {job_id}: {e}")
                else:
                    await session.commit()
                    await asyncio.sleep(1) # No jobs
                    
        except Exception as e:
            logger.error(f"ComfyWorker Critical Error: {e}")
            await asyncio.sleep(5)


async def azure_worker_loop():
    """Loop for processing cloud Azure Foundry editing jobs."""
    logger.info("Azure Worker started.")
    while True:
        try:
            async with get_session_context() as session:
                # Pop next Azure job
                statement = text("""
                    UPDATE image
                    SET status = 'PROCESSING'
                    WHERE id = (
                        SELECT id
                        FROM image
                        WHERE status = 'QUEUED' 
                        AND provider IN ('azure', 'azure_foundry')
                        ORDER BY created_at ASC
                        LIMIT 1
                        FOR UPDATE SKIP LOCKED
                    )
                    RETURNING id;
                """)
                
                result = await session.execute(statement)
                row = result.first()
                
                if row:
                    job_id = row[0]
                    await session.commit()
                    
                    logger.info(f"AzureWorker: Picked up Job {job_id}...")
                    try:
                        await process_job(job_id)
                        logger.info(f"AzureWorker: Finished Job {job_id}.")
                    except Exception as e:
                        logger.error(f"AzureWorker: Error on Job {job_id}: {e}")
                else:
                    await session.commit()
                    await asyncio.sleep(1) # No jobs

        except Exception as e:
            logger.error(f"AzureWorker Critical Error: {e}")
            await asyncio.sleep(5)


async def start_all_workers():
    """Starts all background worker loops concurrently."""
    logger.info("Initializing background workers...")
    await asyncio.gather(
        batch_manager_loop(),
        comfy_worker_loop(),
        azure_worker_loop()
    )


async def reset_stuck_jobs():
    """
    Resets jobs stuck in PROCESSING or GENERATING state on startup.
    """
    async with get_session_context() as session:
        # 1. Reset stuck Images
        statement = text("""
            UPDATE image
            SET status = 'QUEUED'
            WHERE status = 'PROCESSING'
        """)
        result = await session.execute(statement)
        if result.rowcount > 0:
            logger.warning(f"Reset {result.rowcount} stuck PROCESSING images to QUEUED.")
            
        # 2. Reset stuck Batch Jobs to FAILED
        statement_batch = text("""
            UPDATE batchjob
            SET status = 'FAILED', error_message = 'Server restarted during initialization'
            WHERE status = 'GENERATING'
        """)
        result_batch = await session.execute(statement_batch)
        if result_batch.rowcount > 0:
             logger.warning(f"Marked {result_batch.rowcount} stuck GENERATING batches as FAILED.")
             
        # 3. Reset stuck Edit Batch Jobs to FAILED
        statement_edit_batch = text("""
            UPDATE edit_batch_job
            SET status = 'FAILED', error_message = 'Server restarted during initialization'
            WHERE status = 'GENERATING'
        """)
        result_edit_batch = await session.execute(statement_edit_batch)
        if result_edit_batch.rowcount > 0:
             logger.warning(f"Marked {result_edit_batch.rowcount} stuck GENERATING edit batches as FAILED.")
             
        await session.commit()
