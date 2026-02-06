import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Image, User, JobStatus
from ..models import Image, User, JobStatus
from . import deps
from ..helpers import api_response_helper as responses

router = APIRouter()

class GenerateRequest(BaseModel):
    prompt: str
    filename_prefix: str = "api_img"
    width: int = 512
    height: int = 512 
    provider: str = "comfyui" 
    model: str = "sd15" 
    category: str = "uncategorized"
    is_public: bool = True

@router.post("/generate")
async def generate_image(
    req: GenerateRequest, 
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        # Determine Folder Path (Still needed for the filename)
        safe_category = "".join([c for c in req.category if c.isalnum() or c in (' ', '_', '-')]).strip().replace(" ", "_")
        
        # We define the Target Path, but don't create file yet
        filename = f"{req.filename_prefix}_{uuid.uuid4().hex}.png"
        
        # Save to Database as PENDING
        db_image = Image(
            filename=filename,
             # We store the intended path/prefix, Worker determines full/absolute path or we store relative
            file_path=filename, 
            prompt=req.prompt,
            width=req.width,
            height=req.height,
            model=req.model,
            provider=req.provider,
            category=safe_category,
            user_id=current_user.id,
            status=JobStatus.QUEUED,
            is_public=req.is_public
        )
        session.add(db_image)
        await session.commit()
        await session.refresh(db_image)
        
        # Return Accepted/Pending Response
        return responses.api_success(
            message="Job queued successfully",
            data={
                "status": "QUEUED",
                "job_id": db_image.id,
                "message": "Job queued successfully. Please poll /api/images/{id} for status.",
                "prompt": req.prompt,
                "category": safe_category
            }
        )

    except Exception as e:
        return responses.api_error(status_code=500, message="Generation Failed", error=str(e))
