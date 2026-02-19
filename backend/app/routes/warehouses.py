from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Warehouse
from app.schemas.schemas import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from app.utils.auth import require_permission

router = APIRouter(prefix="/api/warehouses", tags=["Warehouses"])


@router.post("/", response_model=WarehouseResponse)
def create_warehouse(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("warehouses:manage"))
):
    """Create a new warehouse"""
    # Check if warehouse code already exists
    existing = db.query(Warehouse).filter(Warehouse.code == warehouse.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already exists")
    
    db_warehouse = Warehouse(**warehouse.model_dump())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@router.get("/", response_model=List[WarehouseResponse])
def get_warehouses(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("warehouses:view"))
):
    """Get all warehouses"""
    query = db.query(Warehouse)
    
    if is_active is not None:
        query = query.filter(Warehouse.is_active == is_active)
    
    query = query.order_by(Warehouse.name)
    warehouses = query.offset(skip).limit(limit).all()
    return warehouses


@router.get("/search", response_model=List[dict])
def search_warehouses(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("warehouses:view"))
):
    """Search warehouses for dropdown"""
    query = db.query(Warehouse).filter(Warehouse.is_active == True)
    
    if q:
        query = query.filter(
            (Warehouse.name.ilike(f"%{q}%")) |
            (Warehouse.code.ilike(f"%{q}%"))
        )
    
    warehouses = query.order_by(Warehouse.name).limit(limit).all()
    
    return [
        {
            "id": w.id,
            "label": f"{w.name} ({w.code})",
            "name": w.name,
            "code": w.code,
            "city": w.city
        }
        for w in warehouses
    ]


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("warehouses:view"))
):
    """Get a specific warehouse by ID"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: str,
    warehouse_update: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("warehouses:manage"))
):
    """Update a warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    for key, value in warehouse_update.model_dump(exclude_unset=True).items():
        setattr(warehouse, key, value)
    
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}")
def delete_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("warehouses:manage"))
):
    """Delete a warehouse (soft delete)"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    warehouse.is_active = False
    db.commit()
    return {"message": "Warehouse deleted successfully"}
