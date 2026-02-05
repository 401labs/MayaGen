from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..core import security
from ..database import get_session
from ..models import User
from .deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=dict)
async def register(
    username: str, 
    email: str, 
    password: str, 
    session: AsyncSession = Depends(get_session)
):
    # Check existing user
    result = await session.execute(select(User).where((User.username == username) | (User.email == email)))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    # Create User
    db_user = User(
        username=username,
        email=email,
        hashed_password=security.get_password_hash(password)
    )
    session.add(db_user)
    await session.commit()
    return {"status": "created", "username": username}

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    # Authenticate User
    result = await session.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Create Token
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at
    }
