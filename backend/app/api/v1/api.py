from fastapi import APIRouter
from .endpoints import auth, users, asthma, recommend

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(asthma.router, tags=["asthma"])
api_router.include_router(recommend.router, tags=["recommendations"]) 