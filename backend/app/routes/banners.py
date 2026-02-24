from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Banner
from app.schemas.schemas import BannerCreate, BannerResponse
from app.utils.auth import require_permission
from typing import List

router = APIRouter(prefix="/api/banners", tags=["Banners"])


@router.get("", response_model=List[BannerResponse])
def list_active_banners(db: Session = Depends(get_db)):
    return db.query(Banner).filter(Banner.is_active == True).order_by(Banner.sort_order).all()


@router.get("/all", response_model=List[BannerResponse])
def list_all_banners(user=Depends(require_permission("banners:view")), db: Session = Depends(get_db)):
    return db.query(Banner).order_by(Banner.sort_order).all()


@router.post("", response_model=BannerResponse)
def create_banner(req: BannerCreate, user=Depends(require_permission("banners:manage")), db: Session = Depends(get_db)):
    banner = Banner(**req.model_dump())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@router.put("/{banner_id}", response_model=BannerResponse)
def update_banner(banner_id: str, req: BannerCreate, user=Depends(require_permission("banners:manage")), db: Session = Depends(get_db)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(404, "Banner not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(banner, field, value)
    db.commit()
    db.refresh(banner)
    return banner


@router.delete("/{banner_id}")
def delete_banner(banner_id: str, user=Depends(require_permission("banners:manage")), db: Session = Depends(get_db)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(404, "Banner not found")
    db.delete(banner)
    db.commit()
    return {"message": "Banner deleted"}
