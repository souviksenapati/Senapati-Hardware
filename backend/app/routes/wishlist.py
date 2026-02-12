from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.models import WishlistItem, Product, User
from app.schemas.schemas import WishlistResponse
from app.utils.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistResponse])
def get_wishlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WishlistItem).options(
        joinedload(WishlistItem.product).joinedload(Product.images)
    ).filter(WishlistItem.user_id == user.id).order_by(WishlistItem.created_at.desc()).all()
    return [WishlistResponse.model_validate(i) for i in items]


@router.post("/{product_id}")
def add_to_wishlist(product_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
    ).first()
    if existing:
        return {"message": "Already in wishlist"}

    item = WishlistItem(user_id=user.id, product_id=product_id)
    db.add(item)
    db.commit()
    return {"message": "Added to wishlist"}


@router.delete("/{product_id}")
def remove_from_wishlist(product_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
    ).first()
    if not item:
        raise HTTPException(404, "Item not in wishlist")
    db.delete(item)
    db.commit()
    return {"message": "Removed from wishlist"}
