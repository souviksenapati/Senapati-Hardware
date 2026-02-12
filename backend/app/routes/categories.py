from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Category
from app.schemas.schemas import CategoryCreate, CategoryResponse
from app.utils.auth import require_admin
from typing import List

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order).all()


@router.get("/all", response_model=List[CategoryResponse])
def list_all_categories(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.sort_order).all()


@router.get("/{slug}", response_model=CategoryResponse)
def get_category(slug: str, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.slug == slug).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    return cat


@router.post("", response_model=CategoryResponse)
def create_category(req: CategoryCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.slug == req.slug).first():
        raise HTTPException(400, "Slug already exists")
    cat = Category(**req.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: str, req: CategoryCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}")
def delete_category(category_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted"}
