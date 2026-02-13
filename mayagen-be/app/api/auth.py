import os
from datetime import timedelta, datetime
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import httpx

from ..core import security
from ..database import get_session
from ..models import User, ActivityLog
from .deps import get_current_user
from ..helpers import api_response_helper as responses
from ..services.geoip import get_location_from_ip

from pydantic import BaseModel

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# Ensure this matches your Google Console and Frontend
REDIRECT_URI = "http://localhost:3000/auth/callback" 

class GoogleCallbackRequest(BaseModel):
    code: str

@router.get("/google/login")
async def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")
    
    scope = "openid email profile"
    login_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&scope={scope}&"
        f"access_type=offline"
    )
    return responses.api_success(
        message="Google Login URL generated",
        data={"url": login_url}
    )

@router.post("/google/callback")
async def google_callback(
    payload: GoogleCallbackRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
         raise HTTPException(status_code=500, detail="Google Credentials not configured")

    # 1. Exchange code for access token
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": payload.code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI,
    }
    
    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=data)
        if token_res.status_code != 200:
             return responses.api_error(
                status_code=400,
                message="Google Login Failed",
                error=f"Failed to get token: {token_res.text}"
            )
        token_data = token_res.json()
        id_token = token_data.get("id_token")
        access_token_google = token_data.get("access_token")

        # 2. Get User Info
        user_info_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token_google}"}
        )
        if user_info_res.status_code != 200:
             return responses.api_error(
                status_code=400,
                message="Google Login Failed",
                error="Failed to fetch user info"
            )
        user_info = user_info_res.json()
    
    # 3. Process User (Find or Create)
    google_id = user_info.get("id")
    email = user_info.get("email")
    name = user_info.get("name") or email.split("@")[0]
    picture = user_info.get("picture")

    # Check if user exists by Google ID OR Email
    query = select(User).where((User.google_id == google_id) | (User.email == email))
    result = await session.execute(query)
    user = result.scalars().first()

    if not user:
        # Create new user
        user = User(
            username=name.replace(" ", "_").lower() + "_" + str(int(datetime.utcnow().timestamp())), # Generate unique username
            email=email,
            google_id=google_id,
            avatar_url=picture,
            role="user" 
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        is_new_user = True
    else:
        # Update existing user info
        if not user.google_id:
            user.google_id = google_id # Link account if found by email
        if picture and not user.avatar_url:
            user.avatar_url = picture
        session.add(user)
        await session.commit()
        await session.refresh(user)
        is_new_user = False

    # 4. Generate Internal JWT
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "uid": user.id, "role": user.role},
        expires_delta=access_token_expires
    )

    # 5. Log Activity
    try:
        ip = request.client.host
        if request.headers.get("X-Forwarded-For"):
            ip = request.headers.get("X-Forwarded-For").split(",")[0]
        
        location = await get_location_from_ip(ip) if ip else "Unknown"
        user_agent = request.headers.get("User-Agent")
        
        log = ActivityLog(
            user_id=user.id,
            action="LOGIN_GOOGLE",
            method="POST",
            endpoint="/api/v1/auth/google/callback",
            ip_address=ip,
            location=location,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
            details={"is_new_user": is_new_user}
        )
        session.add(log)
        await session.commit()
    except Exception as e:
        print(f"Failed to log login activity: {e}")

    return responses.api_success(
        message="Login Successful",
        data={
            "access_token": access_token, 
            "token_type": "bearer",
            "user": {
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "avatar_url": user.avatar_url
            }
        }
    )

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return responses.api_success(
        message="User Profile Retrieved",
        data={
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role,
            "avatar_url": current_user.avatar_url,
            "created_at": current_user.created_at.isoformat()
        }
    )
