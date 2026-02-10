
import logging
import time
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.background import BackgroundTask
from fastapi import Request
from sqlmodel import Session
from app.database import get_session_context  # Correct import
from app.models import ActivityLog
from app.services.geoip import get_location_from_ip
from app.core.security import decode_access_token
import json

logger = logging.getLogger(__name__)

async def log_activity_task(user_id: int | None, method: str, endpoint: str, ip: str, user_agent: str, duration: float):
    """
    Background task to log activity to the database.
    """
    try:
        # Resolve Location (External API call - might be slow)
        location = await get_location_from_ip(ip) if ip else "Unknown"
        
        async with get_session_context() as session:
            log = ActivityLog(
                user_id=user_id,
                action="API_REQUEST",
                method=method,
                endpoint=endpoint,
                ip_address=ip,
                location=location,
                user_agent=user_agent,
                details={"duration": duration},
                timestamp=datetime.utcnow()
            )
            session.add(log)
            await session.commit()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")

class ActivityLoggerMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/docs", "/openapi.json", "/health", "/metrics", "/favicon.ico", "/static"]

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        if any(request.url.path.startswith(p) for p in self.exclude_paths):
            return await call_next(request)

        start_time = time.time()
        
        # Capture Request Info (Pre-processing)
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = decode_access_token(token)
                if payload:
                    user_id = int(payload.get("sub"))
            except:
                pass

        ip = request.client.host
        if request.headers.get("X-Forwarded-For"):
            ip = request.headers.get("X-Forwarded-For").split(",")[0]
            
        user_agent = request.headers.get("User-Agent")
        method = request.method
        endpoint = request.url.path

        # Process Request
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # Only log if user_id is present OR if it's a mutation (POST/PUT/DELETE)
        # OR if it's a specific interesting endpoint like /generate
        should_log = (
            user_id is not None or 
            method in ["POST", "PUT", "DELETE"] or 
            "/generate" in endpoint
        )
        
        if should_log:
            # We must handle the case where response already has a background task
            # Starlette responses only support one background task technically, but we can chain them or replace.
            # Simpler: Just run ours if none exists, or wrap.
            
            # Helper to wrap existing task
            existing_task = response.background
            
            async def wrapped_task():
                if existing_task:
                    await existing_task()
                await log_activity_task(user_id, method, endpoint, ip, user_agent, process_time)
            
            response.background = BackgroundTask(wrapped_task)

        return response
