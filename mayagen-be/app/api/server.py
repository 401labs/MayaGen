from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid
import os

from ..core import config
from ..services.comfy_client import ComfyUIProvider

app = FastAPI(title="MayaGen FastAPI")

# Initialize Provider
# Note: config.COMFYUI["server_address"] is from the new config structure
provider = ComfyUIProvider(config.COMFYUI["server_address"])

class GenerateRequest(BaseModel):
    prompt: str
    filename_prefix: str = "api_img"
    width: int = 512
    height: int = 768 # Standard SD1.5 Portrait

@app.get("/health")
def health_check():
    """Checks if we can talk to the ComfyUI Backend on Azure"""
    try:
        if not config.COMFYUI["server_address"]:
             raise HTTPException(status_code=503, detail="Server address not configured")
        return {"status": "online", "backend": config.COMFYUI["server_address"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/generate")
def generate_image(req: GenerateRequest):
    """
    Generates an image using the Azure ComfyUI backend.
    """
    try:
        output_path = os.path.join(config.OUTPUT_FOLDER, f"{req.filename_prefix}_{uuid.uuid4().hex}.png")
        
        # Call the synchronous generation
        saved_file = provider.generate(req.prompt, output_path, req.width, req.height)
        
        return {
            "status": "success",
            "image_path": str(saved_file),
            "prompt": req.prompt
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
