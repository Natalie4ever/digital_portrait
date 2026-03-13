# 员工数字画像系统 - FastAPI 入口
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, profile, users, operation_logs, skill_tags

app = FastAPI(title="员工数字画像系统", description="内网单机部署")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(users.router)
app.include_router(operation_logs.router)
app.include_router(skill_tags.router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/api/health")
def health():
    return {"status": "ok"}
