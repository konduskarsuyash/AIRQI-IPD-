from fastapi import APIRouter, Depends
from ....schemas.schemas import UserWithAsthma
from ...deps import get_current_active_user

router = APIRouter()

@router.get("/me", response_model=UserWithAsthma)
async def read_users_me(current_user: UserWithAsthma = Depends(get_current_active_user)):
    return current_user 