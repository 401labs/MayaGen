import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core import config
from ..services.comfy_client import ComfyUIProvider
from ..database import init_db, get_session
from ..models import Image, User
from . import auth, deps

app = FastAPI(title="MayaGen FastAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Router
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Initialize Provider
provider = ComfyUIProvider(config.COMFYUI["server_address"])

# Mount static files
app.mount("/images", StaticFiles(directory=config.OUTPUT_FOLDER), name="images")

@app.on_event("startup")
async def on_startup():
    await init_db()

class GenerateRequest(BaseModel):
    prompt: str
    filename_prefix: str = "api_img"
    width: int = 512
    height: int = 768 
    provider: str = "comfyui" 
    model: str = "sd15" 
    category: str = "uncategorized" 

@app.get("/health")
def health_check():
    try:
        if not config.COMFYUI["server_address"]:
             raise HTTPException(status_code=503, detail="Server address not configured")
        return {"status": "online", "backend": config.COMFYUI["server_address"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/images")
async def list_images(
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(deps.get_current_user) # Optional auth for now
):
    """Lists generated images. Public feed."""
    base_url = "http://127.0.0.1:8000/images"
    
    # Query DB sorted by created_at desc
    statement = select(Image, User).join(User, isouter=True).order_by(Image.created_at.desc())
    results = await session.execute(statement)
    # Results is list of (Image, User) tuples
    
    response_list = []
    for img, user in results:
        try:
             rel_path = os.path.relpath(img.file_path, config.OUTPUT_FOLDER)
             safe_rel_path = rel_path.replace("\\", "/")
             url = f"{base_url}/{safe_rel_path}"
        except ValueError:
             url = f"{base_url}/{img.filename}"

        response_list.append({
            "id": img.id,
            "filename": img.filename,
            "category": img.category,
            "url": url,
            "prompt": img.prompt,
            "model": img.model,
            "created_at": img.created_at,
            "created_by": user.username if user else "Anonymous",
            "is_public": img.is_public
        })
        
    return {"images": response_list}

@app.post("/generate")
async def generate_image(
    req: GenerateRequest, 
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        # Determine Folder Path
        safe_category = "".join([c for c in req.category if c.isalnum() or c in (' ', '_', '-')]).strip().replace(" ", "_")
        category_dir = os.path.join(config.OUTPUT_FOLDER, safe_category)
        os.makedirs(category_dir, exist_ok=True)

        filename = f"{req.filename_prefix}_{uuid.uuid4().hex}.png"
        output_path = os.path.join(category_dir, filename)
        
        saved_file = ""
        
        if req.provider == "comfyui":
             workflow_path = config.WORKFLOWS.get(req.model, config.WORKFLOWS["sd15"])
             saved_file = provider.generate(req.prompt, output_path, req.width, req.height, workflow_path)
        else:
             saved_file = f"mock_{req.provider}.png" 

        # Save to Database with User ID
        db_image = Image(
            filename=filename,
            file_path=output_path,
            prompt=req.prompt,
            width=req.width,
            height=req.height,
            model=req.model,
            provider=req.provider,
            category=safe_category,
            user_id=current_user.id
        )
        session.add(db_image)
        await session.commit()
        await session.refresh(db_image)
        
        # Construct Response
        rel_path = os.path.join(safe_category, filename).replace("\\", "/")
        image_url = f"http://127.0.0.1:8000/images/{rel_path}"

        return {
            "status": "success",
            "image_url": image_url,
            "prompt": req.prompt,
            "provider": req.provider,
            "category": safe_category,
            "db_id": db_image.id,
            "user": current_user.username
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
