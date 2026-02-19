from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import B2BCustomer
from app.schemas.schemas import B2BCustomerCreate, B2BCustomerUpdate, B2BCustomerResponse
from app.utils.auth import require_permission

router = APIRouter(prefix="/api/b2b-customers", tags=["B2B Customers"])


@router.post("/", response_model=B2BCustomerResponse)
def create_b2b_customer(
    customer: B2BCustomerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:manage"))
):
    """Create a new B2B customer"""
    # Normalize code
    customer.customer_code = customer.customer_code.upper()
    
    # Check if customer code already exists
    existing = db.query(B2BCustomer).filter(B2BCustomer.customer_code == customer.customer_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer code already exists")
    
    # Create customer
    db_customer = B2BCustomer(
        **customer.model_dump(),
        current_balance=customer.opening_balance
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.get("/", response_model=List[B2BCustomerResponse])
def get_b2b_customers(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    is_active: bool = None,
    customer_type: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:view"))
):
    """Get all B2B customers with optional filtering"""
    query = db.query(B2BCustomer)
    
    if search:
        query = query.filter(
            (B2BCustomer.name.ilike(f"%{search}%")) |
            (B2BCustomer.customer_code.ilike(f"%{search}%")) |
            (B2BCustomer.phone.ilike(f"%{search}%"))
        )
    
    if is_active is not None:
        query = query.filter(B2BCustomer.is_active == is_active)
    
    if customer_type:
        query = query.filter(B2BCustomer.customer_type == customer_type)
    
    query = query.order_by(B2BCustomer.name)
    customers = query.offset(skip).limit(limit).all()
    return customers


@router.get("/search", response_model=List[dict])
def search_b2b_customers(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:view"))
):
    """Search B2B customers for dropdown - returns simplified data"""
    query = db.query(B2BCustomer).filter(B2BCustomer.is_active == True)
    
    if q:
        query = query.filter(
            (B2BCustomer.name.ilike(f"%{q}%")) |
            (B2BCustomer.customer_code.ilike(f"%{q}%"))
        )
    
    customers = query.order_by(B2BCustomer.name).limit(limit).all()
    
    return [
        {
            "id": c.id,
            "label": f"{c.name} ({c.customer_code}) - {c.customer_type.upper()}",
            "name": c.name,
            "customer_code": c.customer_code,
            "phone": c.phone,
            "gst_number": c.gst_number,
            "customer_type": c.customer_type,
            "price_tier": c.price_tier,
            "payment_terms": c.payment_terms,
            "current_balance": float(c.current_balance)
        }
        for c in customers
    ]


@router.get("/{customer_id}", response_model=B2BCustomerResponse)
def get_b2b_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:view"))
):
    """Get a specific B2B customer by ID"""
    customer = db.query(B2BCustomer).filter(B2BCustomer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=B2BCustomerResponse)
def update_b2b_customer(
    customer_id: str,
    customer_update: B2BCustomerUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:manage"))
):
    """Update a B2B customer"""
    customer = db.query(B2BCustomer).filter(B2BCustomer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update fields
    for key, value in customer_update.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_b2b_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:manage"))
):
    """Delete a B2B customer (soft delete by setting is_active=False)"""
    customer = db.query(B2BCustomer).filter(B2BCustomer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer.is_active = False
    db.commit()
    return {"message": "Customer deleted successfully"}


@router.get("/{customer_id}/balance")
def get_customer_balance(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("b2b_customers:view"))
):
    """Get customer's current balance and credit info"""
    customer = db.query(B2BCustomer).filter(B2BCustomer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {
        "customer_id": customer.id,
        "customer_name": customer.name,
        "current_balance": float(customer.current_balance),
        "credit_limit": float(customer.credit_limit),
        "available_credit": float(customer.credit_limit - customer.current_balance)
    }
