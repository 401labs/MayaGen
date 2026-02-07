import asyncio
import os
import logging
from datetime import datetime
from sqlmodel import select
from sqlalchemy import text
from app.database import get_session_context
from app.models import Image, JobStatus, BatchJob, BatchJobStatus
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
            
            # Construct full absolute path
            full_output_path = os.path.join(category_dir, job.filename)
            
            # 2. Check Provider
            if job.provider == "comfyui":
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

        except Exception as e:
            logger.error(f"Job {job.id} FAILED: {e}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            session.add(job)
            await session.commit()
            
            # Update batch job progress
            if job.batch_job_id:
                await update_batch_progress(job.batch_job_id, success=False)


async def update_batch_progress(batch_id: int, success: bool):
    """Update batch job progress after an image completes."""
    async with get_session_context() as session:
        result = await session.execute(select(BatchJob).where(BatchJob.id == batch_id))
        batch = result.scalars().first()
        
        if batch:
            if success:
                batch.generated_count += 1
            else:
                batch.failed_count += 1
            
            # Check if batch is complete
            total_processed = batch.generated_count + batch.failed_count
            if total_processed >= batch.total_images:
                batch.status = BatchJobStatus.COMPLETED
                logger.info(f"Batch {batch.id} COMPLETED: {batch.generated_count} success, {batch.failed_count} failed")
            
            batch.updated_at = datetime.utcnow()
            session.add(batch)
            await session.commit()


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


async def worker_loop():
    logger.info("Worker started inside Server Process...")
    
    while True:
        try:
            # logger.info("Worker: Checking queue...") 
            
            # 1. First, check for QUEUED batch jobs to expand
            if await process_batch_jobs():
                continue
            
            # 2. Then, process individual image jobs
            async with get_session_context() as session:
                # ACID Transaction for Queue Popping
                statement = text("""
                    UPDATE image
                    SET status = 'PROCESSING'
                    WHERE id = (
                        SELECT id
                        FROM image
                        WHERE status = 'QUEUED'
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
                    
                    # Process as a background task so we don't block the loop from picking up others?
                    # User request: "picks that calls the comfyui... until it gets response"
                    # If we wait, we process 1 by 1. That seems to be the request "simple approach".
                    await process_job(job_id)
                else:
                    await session.commit()
                    # No jobs, sleep
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"Worker Loop Error: {e}")
            await asyncio.sleep(5)


async def reset_stuck_jobs():
    """
    Resets jobs stuck in PROCESSING or GENERATING state on startup.
    This handles cases where the server crashed or was restarted during processing.
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
            
        # 2. Reset stuck Batch Jobs
        # If a batch job was GENERATING, it means it was in the middle of creating image records.
        # Since the creation is atomic (all images added + status update commit), 
        # it's possible it failed before commit.
        # If it's GENERATING, we should check if images were created.
        # But simpler logic: If GENERATING, set back to QUEUED to retry expansion?
        # IMPORTANT: If we retry expansion, we might create duplicates if partial commit happened.
        # Review `process_batch_jobs`: It commits `GENERATING` status FIRST, then creates images, then commits `QUEUED` images.
        # If it crashes in between, we have a batch in GENERATING but no images (or partial?).
        # `process_batch_jobs` checks `BatchJob.status == QUEUED`.
        # If we reset GENERATING -> QUEUED, it will run again.
        # And `process_batch_jobs` logic:
        # `prompts = generate_prompts(...)`
        # `for i, prompt in enumerate(prompts): ...`
        # If we re-run, we create NEW images.
        # We need to be careful.
        # For now, let's just log warning for BatchJobs or set them to FAILED to require manual intervention?
        # Or, check if images exist.
        
        # Safe approach for Batch: Set to FAILED with message "Server restarted during generation".
        statement_batch = text("""
            UPDATE batchjob
            SET status = 'FAILED', error_message = 'Server restarted during initialization'
            WHERE status = 'GENERATING'
        """)
        result_batch = await session.execute(statement_batch)
        if result_batch.rowcount > 0:
             logger.warning(f"Marked {result_batch.rowcount} stuck GENERATING batches as FAILED.")
             
        await session.commit()
