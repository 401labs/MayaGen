import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ..core import config
from ..database import init_db
from ..services.worker import worker_loop
from ..helpers import api_response_helper as responses
from . import auth, images, jobs, batch
import asyncio

app = FastAPI(title="MayaGen FastAPI")

# --- Global Exception Handlers ---
from fastapi.exceptions import RequestValidationError
# from . import responses (Removed as we imported it above)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return responses.api_error(
        status_code=exc.status_code,
        message="Request Failed",
        error=exc.detail
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return responses.api_error(
        status_code=422,
        message="Validation Error",
        error=str(exc)
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    return responses.api_error(
        status_code=500,
        message="Internal Server Error",
        error=str(exc)
    )
# ---------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(images.router, tags=["images"])
app.include_router(jobs.router, tags=["jobs"])
app.include_router(batch.router, tags=["batch"])

# Mount static files
app.mount("/images", StaticFiles(directory=config.OUTPUT_FOLDER), name="images")

@app.on_event("startup")
async def on_startup():
    await init_db()
    # Start Background Worker
    asyncio.create_task(worker_loop())

@app.get("/health")
def health_check():
    try:
        if not config.COMFYUI["server_address"]:
             return responses.api_error(status_code=503, message="Configuration Error", error="Server address not configured")
        
        return responses.api_success(
            message="System Operational",
            data={"status": "online", "backend": config.COMFYUI["server_address"]}
        )
    except Exception as e:
        return responses.api_error(status_code=503, message="System Error", error=str(e))
