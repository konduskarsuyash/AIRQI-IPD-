from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from ....core.config import settings
from ....core.security import verify_password, get_password_hash, create_access_token
from ....db.database import get_db_connection
from ....schemas.schemas import Token, User, UserCreate, LoginRequest
from ...deps import get_current_active_user
import uuid

router = APIRouter()

@router.post("/signup", response_model=User)
async def signup(user: UserCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if user already exists (by email or username)
        cur.execute("SELECT * FROM users WHERE email = %s OR username = %s", 
                   (user.email, user.username))
        existing_user = cur.fetchone()
        
        if existing_user:
            if existing_user['email'] == user.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Create new user
        hashed_password = get_password_hash(user.password)
        user_id = str(uuid.uuid4())
        
        # Insert user data
        cur.execute(
            """
            INSERT INTO users (id, username, email, hashed_password, disabled)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, username, email, disabled
            """,
            (user_id, user.username, user.email, hashed_password, False)
        )
        new_user = cur.fetchone()
        conn.commit()
        return User(**dict(new_user))
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get user from database
        cur.execute("SELECT * FROM users WHERE email = %s", (login_data.email,))
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(login_data.password, user['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user['email']}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    finally:
        cur.close()
        conn.close() 