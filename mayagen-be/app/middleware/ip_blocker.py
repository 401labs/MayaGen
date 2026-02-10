"""
IP Blocker Middleware

Checks incoming requests against the blocked_ip table and returns 403 for blocked IPs.
Admin routes are exempt from blocking to prevent lockouts.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request
from sqlmodel import select
from datetime import datetime

class IPBlockerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else None
        
        # Exempt admin routes from IP blocking (prevent admin lockout)
        if request.url.path.startswith("/api/v1/admin"):
            return await call_next(request)
        
        # Exempt health check and static files
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"] or request.url.path.startswith("/images"):
            return await call_next(request)
        
        if client_ip:
            # Check if IP is blocked
            from ..database import get_session_context
            from ..models import BlockedIP
            
            async with get_session_context() as session:
                query = select(BlockedIP).where(
                    BlockedIP.ip_address == client_ip,
                    BlockedIP.is_active == True
                )
                result = await session.execute(query)
                blocked_ip = result.scalar_one_or_none()
                
                if blocked_ip:
                    # Check if block has expired
                    if blocked_ip.expires_at and blocked_ip.expires_at < datetime.utcnow():
                        # Deactivate expired block
                        blocked_ip.is_active = False
                        await session.commit()
                    else:
                        # IP is actively blocked
                        return JSONResponse(
                            status_code=403,
                            content={
                                "success": False,
                                "message": "Access Denied",
                                "error": "Your IP address has been blocked. Please contact support if you believe this is an error."
                            }
                        )
        
        response = await call_next(request)
        return response
