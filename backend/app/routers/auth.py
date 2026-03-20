# 登录、修改密码
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, ChangePasswordRequest
from app.config import settings
from app.auth import verify_password, create_access_token, get_current_user
from app.operation_log import log_operation

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.get("/check-ehr/{ehr_no}")
async def check_ehr(ehr_no: str, db: AsyncSession = Depends(get_db)):
    """校验 EHR 号是否存在，存在则返回用户姓名（不校验密码、不校验禁用状态）"""
    ehr_no = ehr_no.strip()
    if len(ehr_no) != 7 or not ehr_no.isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="EHR号必须是7位数字")
    result = await db.execute(
        select(User).where(User.ehr_no == ehr_no, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EHR号不存在")
    return {"exists": True, "name": user.name}


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "ehr_no": current_user.ehr_no,
        "name": current_user.name,
        "group_name": current_user.group_name,
        "role": current_user.role,
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.ehr_no == body.ehr_no.strip(), User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="EHR号或密码错误")
    if user.is_disabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已禁用")
    token = create_access_token(user.ehr_no)
    client_ip = request.client.host if request.client else None
    await log_operation(db, user.id, "login", "auth", f"用户 {user.name}({user.ehr_no}) 登录", client_ip)
    return TokenResponse(
        access_token=token,
        expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码错误")
    from app.auth import hash_password
    current_user.password_hash = hash_password(body.new_password)
    db.add(current_user)
    await db.flush()
    await log_operation(db, current_user.id, "change_password", "auth", "修改密码", None)
    return {"message": "密码已修改"}
