from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str

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