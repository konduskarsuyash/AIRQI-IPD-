from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import json

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

# Security configurations
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class AsthmaFormData(BaseModel):
    severity: str
    symptoms: List[str]
    trigger_factors: List[str]
    allergies: Optional[List[str]] = None
    checkup_frequency: str
    last_attack_date: Optional[datetime] = None
    report_pdf_url: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserWithAsthma(User):
    asthma_data: Optional[AsthmaFormData] = None

class AsthmaFormStatus(BaseModel):
    has_submitted: bool
    last_updated: Optional[datetime] = None

app = FastAPI()

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection error"
        )

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                u.id as user_id, u.username, u.email, u.disabled,
                a.severity, a.symptoms, a.trigger_factors,
                a.allergies, a.checkup_frequency, a.last_attack_date, a.report_pdf_url
            FROM users u 
            LEFT JOIN asthma_data a ON u.id = a.user_id 
            WHERE u.email = %s
        """, (token_data.email,))

        user = cur.fetchone()
        if not user:
            raise credentials_exception

        user_dict = dict(user)

        user_base = {
            "id": user_dict.get("user_id"),
            "username": user_dict.get("username"),
            "email": user_dict.get("email"),
            "disabled": user_dict.get("disabled"),
        }

        asthma_data = None
        if user_dict.get("symptoms") is not None:
            asthma_data = AsthmaFormData(
                severity=user_dict.get("severity"),
                symptoms=user_dict.get("symptoms"),
                trigger_factors=user_dict.get("trigger_factors"),
                allergies=user_dict.get("allergies"),
                checkup_frequency=user_dict.get("checkup_frequency"),
                last_attack_date=user_dict.get("last_attack_date"),
                report_pdf_url=user_dict.get("report_pdf_url"),
            )

        return UserWithAsthma(**user_base, asthma_data=asthma_data)
    except Exception as e:
        print(f"Error in get_current_user: {e}")
        raise credentials_exception


async def get_current_active_user(current_user: UserWithAsthma = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    print("current_user",current_user)
    return current_user

@app.post("/signup", response_model=User)
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

@app.post("/login", response_model=Token)
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
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user['email']}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    finally:
        cur.close()
        conn.close()

@app.get("/asthma-form-status", response_model=AsthmaFormStatus)
async def get_asthma_form_status(current_user: UserWithAsthma = Depends(get_current_active_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if user has submitted asthma form data
        cur.execute(
            "SELECT created_at FROM asthma_data WHERE user_id = %s",
            (current_user.id,)
        )
        result = cur.fetchone()
        
        if result:
            return AsthmaFormStatus(
                has_submitted=True,
                last_updated=result['created_at']
            )
        else:
            return AsthmaFormStatus(
                has_submitted=False,
                last_updated=None
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@app.post("/asthma-form", response_model=AsthmaFormData)
async def submit_asthma_form(
    severity: str = Form(...),
    symptoms: str = Form(...),
    trigger_factors: str = Form(...),
    allergies: Optional[str] = Form(None),
    checkup_frequency: str = Form(...),
    last_attack_date: Optional[str] = Form(None),
    report_pdf: Optional[UploadFile] = File(None),
    current_user: UserWithAsthma = Depends(get_current_active_user)
):
    conn = get_db_connection()
    cur = conn.cursor()
    print("current_user",current_user)
    try:
        # Parse JSON strings to lists
        symptoms_list = json.loads(symptoms)
        trigger_factors_list = json.loads(trigger_factors)
        allergies_list = json.loads(allergies) if allergies else None
        
        # Parse date if provided
        last_attack_date_obj = None
        if last_attack_date:
            try:
                last_attack_date_obj = datetime.fromisoformat(last_attack_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format for last_attack_date"
                )
        
        # Handle PDF file upload
        report_pdf_url = None
        if report_pdf:
            # Create user-specific directory if it doesn't exist
            user_dir = os.path.join("static", "asthma-reports", str(current_user.id))
            os.makedirs(user_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(report_pdf.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(user_dir, unique_filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                content = await report_pdf.read()
                buffer.write(content)
            
            # Generate URL for the file
            report_pdf_url = f"/static/asthma-reports/{current_user.id}/{unique_filename}"
        
        # Check if asthma data already exists for this user
        cur.execute("SELECT * FROM asthma_data WHERE user_id = %s", (current_user.id,))
        existing_data = cur.fetchone()
        
        if existing_data:
            # Update existing asthma data
            cur.execute(
                """
                UPDATE asthma_data 
                SET severity = %s, symptoms = %s, trigger_factors = %s, 
                    allergies = %s, checkup_frequency = %s, last_attack_date = %s,
                    report_pdf_url = %s
                WHERE user_id = %s
                RETURNING *
                """,
                (
                    severity,
                    symptoms_list,
                    trigger_factors_list,
                    allergies_list,
                    checkup_frequency,
                    last_attack_date_obj,
                    report_pdf_url,
                    current_user.id
                )
            )
        else:
            # Insert new asthma data
            cur.execute(
                """
                INSERT INTO asthma_data (
                    user_id, severity, symptoms, trigger_factors, 
                    allergies, checkup_frequency, last_attack_date, report_pdf_url
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    current_user.id,
                    severity,
                    symptoms_list,
                    trigger_factors_list,
                    allergies_list,
                    checkup_frequency,
                    last_attack_date_obj,
                    report_pdf_url
                )
            )
        
        updated_data = cur.fetchone()
        conn.commit()
        
        return AsthmaFormData(
            severity=updated_data['severity'],
            symptoms=updated_data['symptoms'],
            trigger_factors=updated_data['trigger_factors'],
            allergies=updated_data['allergies'],
            checkup_frequency=updated_data['checkup_frequency'],
            last_attack_date=updated_data['last_attack_date'],
            report_pdf_url=updated_data['report_pdf_url']
        )
    
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format for symptoms, trigger_factors, or allergies"
        )
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@app.get("/users/me", response_model=UserWithAsthma)
async def read_users_me(current_user: UserWithAsthma = Depends(get_current_active_user)):
    return current_user

@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI Authentication API"} 