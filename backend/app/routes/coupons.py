from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Coupon, DiscountType
from app.schemas.schemas import CouponCreate, CouponResponse, CouponValidate
from app.utils.auth import require_permission
from typing import List

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


@router.get("", response_model=List[CouponResponse])
def list_coupons(user=Depends(require_permission("coupons:view")), db: Session = Depends(get_db)):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("", response_model=CouponResponse)
def create_coupon(req: CouponCreate, user=Depends(require_permission("coupons:manage")), db: Session = Depends(get_db)):
    if db.query(Coupon).filter(Coupon.code == req.code).first():
        raise HTTPException(400, "Coupon code already exists")
    coupon = Coupon(**req.model_dump())
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.put("/{coupon_id}", response_model=CouponResponse)
def update_coupon(coupon_id: str, req: CouponCreate, user=Depends(require_permission("coupons:manage")), db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/{coupon_id}")
def delete_coupon(coupon_id: str, user=Depends(require_permission("coupons:manage")), db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted"}


@router.post("/validate")
def validate_coupon(req: CouponValidate, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.code == req.code, Coupon.is_active == True).first()
    if not coupon:
        raise HTTPException(400, "Invalid coupon code")

    now = datetime.now(timezone.utc)
    if now < coupon.valid_from or now > coupon.valid_until:
        raise HTTPException(400, "Coupon expired")
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(400, "Coupon usage limit reached")
    if req.order_total < float(coupon.min_order_amount):
        raise HTTPException(400, f"Minimum order ₹{coupon.min_order_amount}")

    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount = req.order_total * (float(coupon.discount_value) / 100)
        if coupon.max_discount:
            discount = min(discount, float(coupon.max_discount))
    else:
        discount = float(coupon.discount_value)

    return {"valid": True, "discount": round(discount, 2), "code": coupon.code}
