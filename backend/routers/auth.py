"""
backend/routers/auth.py
------------------------
POST /auth/register  — create new account
POST /auth/login     — returns JWT token
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db import crud
from ..models.schemas import RegisterRequest, LoginRequest, TokenResponse
from ..dependencies import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, payload.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user  = crud.create_user(db, payload.username, payload.email, payload.password)
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, username=user.username, is_admin=user.is_admin, email=user.email)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, payload.username)
    if not user or not crud.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, username=user.username, is_admin=user.is_admin)
