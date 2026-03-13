# 预定义技能标签：管理员维护，普通用户可选
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, SkillTagTemplate
from app.schemas import SkillTagTemplateCreate, SkillTagTemplateResponse
from app.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/skill-tags", tags=["技能标签模板"])


@router.get("/templates", response_model=list[SkillTagTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SkillTagTemplate).order_by(SkillTagTemplate.name))
    items = result.scalars().all()
    return [SkillTagTemplateResponse.model_validate(x) for x in items]


@router.post("/templates", response_model=SkillTagTemplateResponse)
async def create_template(
    body: SkillTagTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="名称不能为空")
    r = await db.execute(select(SkillTagTemplate).where(SkillTagTemplate.name == name))
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该标签已存在")
    obj = SkillTagTemplate(name=name)
    db.add(obj)
    await db.flush()
    return SkillTagTemplateResponse.model_validate(obj)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    r = await db.execute(select(SkillTagTemplate).where(SkillTagTemplate.id == template_id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="标签不存在")
    await db.delete(obj)
    return {"message": "ok"}
