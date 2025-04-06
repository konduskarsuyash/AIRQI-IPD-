from fastapi import APIRouter
from .endpoints import auth, users, asthma

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(asthma.router, tags=["asthma"]) 