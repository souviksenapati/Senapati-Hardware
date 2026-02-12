from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Supplier
from app.schemas.schemas import SupplierCreate, SupplierUpdate, SupplierResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.post("/", response_model=SupplierResponse)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new supplier"""
    # Check if supplier code already exists
    existing = db.query(Supplier).filter(Supplier.supplier_code == supplier.supplier_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    # Create supplier
    db_supplier = Supplier(
        **supplier.model_dump(),
        current_balance=supplier.opening_balance
    )
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all suppliers with optional filtering"""
    query = db.query(Supplier)
    
    if search:
        query = query.filter(
            (Supplier.name.ilike(f"%{search}%")) |
            (Supplier.supplier_code.ilike(f"%{search}%")) |
            (Supplier.phone.ilike(f"%{search}%"))
        )
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    query = query.order_by(Supplier.name)
    suppliers = query.offset(skip).limit(limit).all()
    return suppliers


@router.get("/search", response_model=List[dict])
def search_suppliers(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search suppliers for dropdown - returns simplified data"""
    query = db.query(Supplier).filter(Supplier.is_active == True)
    
    if q:
        query = query.filter(
            (Supplier.name.ilike(f"%{q}%")) |
            (Supplier.supplier_code.ilike(f"%{q}%"))
        )
    
    suppliers = query.order_by(Supplier.name).limit(limit).all()
    
    return [
        {
            "id": s.id,
            "label": f"{s.name} ({s.supplier_code})",
            "name": s.name,
            "supplier_code": s.supplier_code,
            "phone": s.phone,
            "gst_number": s.gst_number,
            "payment_terms": s.payment_terms,
            "current_balance": float(s.current_balance)
        }
        for s in suppliers
    ]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific supplier by ID"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a supplier"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Update fields
    for key, value in supplier_update.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)
    
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a supplier (soft delete by setting is_active=False)"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    supplier.is_active = False
    db.commit()
    return {"message": "Supplier deleted successfully"}


@router.get("/{supplier_id}/balance")
def get_supplier_balance(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get supplier's current balance and pending payments"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {
        "supplier_id": supplier.id,
        "supplier_name": supplier.name,
        "current_balance": float(supplier.current_balance),
        "credit_limit": float(supplier.credit_limit),
        "available_credit": float(supplier.credit_limit - supplier.current_balance)
    }
