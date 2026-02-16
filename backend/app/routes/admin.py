from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.models import (
    User, UserRole, Product, Order, OrderItem, OrderStatus,
    Staff, StaffRole, InventoryLog, StoreSetting, Coupon
)
from app.schemas.schemas import (
    DashboardStats, OrderResponse, UserResponse, StaffCreate, StaffResponse,
    StoreSettingResponse, StoreSettingUpdate, InventoryUpdate, InventoryLogResponse, InventoryTransactionCreate
)
from app.utils.auth import require_admin, require_staff_or_admin, hash_password
from typing import List

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─── DASHBOARD ──────────────────────────────────────────
@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(admin=Depends(require_staff_or_admin), db: Session = Depends(get_db)):
    total_revenue = db.query(func.sum(Order.total)).filter(Order.status != OrderStatus.CANCELLED).scalar() or 0
    total_orders = db.query(Order).count()
    total_customers = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    total_products = db.query(Product).filter(Product.is_active == True).count()
    pending_orders = db.query(Order).filter(Order.status == OrderStatus.PENDING).count()
    low_stock = db.query(Product).filter(Product.stock <= 10, Product.is_active == True).count()
    low_stock_list = db.query(Product).options(joinedload(Product.category)).filter(Product.stock <= 10, Product.is_active == True).limit(10).all()

    recent = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc()).limit(10).all()

    # Top products by quantity sold
    top = db.query(
        OrderItem.product_name,
        func.sum(OrderItem.quantity).label("total_qty"),
        func.sum(OrderItem.total).label("total_revenue")
    ).group_by(OrderItem.product_name).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()

    # Revenue by day (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    rev_by_day = db.query(
        func.date(Order.created_at).label("date"),
        func.sum(Order.total).label("revenue"),
        func.count(Order.id).label("orders")
    ).filter(Order.created_at >= thirty_days_ago, Order.status != OrderStatus.CANCELLED
    ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()

    return DashboardStats(
        total_revenue=float(total_revenue),
        total_orders=total_orders,
        total_customers=total_customers,
        total_products=total_products,
        pending_orders=pending_orders,
        low_stock_products=low_stock,
        recent_orders=[OrderResponse.model_validate(o) for o in recent],
        top_products=[{"name": t[0], "quantity": int(t[1]), "revenue": float(t[2])} for t in top],
        revenue_by_day=[{"date": str(r[0]), "revenue": float(r[1]), "orders": int(r[2])} for r in rev_by_day],
        low_stock_list=[{"id": p.id, "name": p.name, "stock": p.stock, "category": p.category.name if p.category else None} for p in low_stock_list]
    )


# ─── CUSTOMER MANAGEMENT ────────────────────────────────
@router.get("/customers", response_model=List[UserResponse])
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(User).filter(User.role == UserRole.CUSTOMER)
    if search:
        q = q.filter(User.email.ilike(f"%{search}%") | User.first_name.ilike(f"%{search}%"))
    return q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.put("/customers/{user_id}/toggle-active")
def toggle_customer(user_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}"}


# ─── STAFF MANAGEMENT ───────────────────────────────────
@router.get("/staff", response_model=List[StaffResponse])
def list_staff(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Staff).options(joinedload(Staff.user)).all()


@router.post("/staff", response_model=StaffResponse)
def create_staff(req: StaffCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already exists")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        role=UserRole.STAFF
    )
    db.add(user)
    db.flush()

    staff = Staff(
        user_id=user.id,
        staff_role=StaffRole(req.staff_role),
        department=req.department,
        salary=req.salary
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return StaffResponse.model_validate(staff)


@router.delete("/staff/{staff_id}")
def remove_staff(staff_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")
    staff.is_active = False
    user = db.query(User).filter(User.id == staff.user_id).first()
    if user:
        user.is_active = False
    db.commit()
    return {"message": "Staff deactivated"}


# ─── INVENTORY MANAGEMENT ───────────────────────────────
@router.get("/inventory/low-stock")
def low_stock_products(admin=Depends(require_staff_or_admin), db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.stock <= 10, Product.is_active == True
    ).all()
    return [{"id": p.id, "name": p.name, "sku": p.sku, "stock": p.stock, "threshold": p.low_stock_threshold} for p in products]


@router.put("/inventory/{product_id}")
def update_inventory(
    product_id: str, req: InventoryUpdate,
    admin=Depends(require_staff_or_admin), db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    product.stock += req.stock_change
    if product.stock < 0:
        raise HTTPException(400, "Stock cannot be negative")

    log = InventoryLog(
        product_id=product_id,
        change=req.stock_change,
        reason=req.reason,
        performed_by=admin.id
    )
    db.add(log)
    db.commit()
    return {"message": "Stock updated", "new_stock": product.stock}


@router.get("/inventory/{product_id}/logs", response_model=List[InventoryLogResponse])
def get_inventory_logs(product_id: str, admin=Depends(require_staff_or_admin), db: Session = Depends(get_db)):
    logs = db.query(InventoryLog).options(joinedload(InventoryLog.product)).filter(
        InventoryLog.product_id == product_id
    ).order_by(InventoryLog.created_at.desc()).limit(50).all()
    
    return [InventoryLogResponse.from_orm_with_product(log) for log in logs]


@router.post("/inventory/transactions", response_model=dict)
def create_inventory_transaction(
    req: InventoryTransactionCreate,
    admin=Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """Create an inward or outward inventory transaction with invoice details for multiple products"""
    import uuid
    from datetime import date as date_type
    
    # Generate unique invoice_id for grouping
    invoice_id = str(uuid.uuid4())[:8]
    
    # Parse invoice date
    invoice_date_obj = None
    if req.invoice_date:
        try:
            invoice_date_obj = date_type.fromisoformat(str(req.invoice_date))
        except:
            pass
    
    logs_created = []
    
    # Process each product in the invoice
    for product_data in req.products:
        product = db.query(Product).filter(Product.id == product_data['product_id']).first()
        if not product:
            continue  # Skip invalid products
        
        quantity = product_data['quantity']
        # Calculate stock change
        change = quantity if req.transaction_type == "inward" else -quantity
        product.stock += change
        
        if product.stock < 0:
            db.rollback()
            raise HTTPException(400, f"Stock for {product.name} cannot be negative")
        
        log = InventoryLog(
            product_id=product.id,
            change=change,
            reason=f"{req.transaction_type.capitalize()} transaction - {req.invoice_number or 'No invoice'}",
            performed_by=admin.id,
            transaction_type=req.transaction_type,
            invoice_id=invoice_id,
            invoice_number=req.invoice_number,
            supplier_name=req.supplier_name if req.transaction_type == "inward" else "",
            customer_name=req.customer_name if req.transaction_type == "outward" else "",
            invoice_date=invoice_date_obj,
            invoice_image_url=req.invoice_image_url,
            notes=req.notes
        )
        db.add(log)
        logs_created.append(log)
    
    if not logs_created:
        raise HTTPException(400, "No valid products in transaction")
    
    db.commit()
    
    return {
        "message": f"{len(logs_created)} product(s) processed",
        "invoice_id": invoice_id,
        "count": len(logs_created)
    }


@router.get("/inventory/transactions/all")
def get_all_inventory_transactions(
    transaction_type: str = Query(None),
    limit: int = Query(500),
    admin=Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """Get all inventory transactions (inward/outward) across all products with product details"""
    query = db.query(InventoryLog).options(joinedload(InventoryLog.product))
    
    if transaction_type and transaction_type in ['inward', 'outward']:
        query = query.filter(InventoryLog.transaction_type == transaction_type)
    
    logs = query.order_by(InventoryLog.created_at.desc()).limit(limit).all()
    
    # Return enriched response with product name
    return [InventoryLogResponse.from_orm_with_product(log) for log in logs]


# ─── STORE SETTINGS ─────────────────────────────────────
@router.get("/settings", response_model=List[StoreSettingResponse])
def get_settings(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(StoreSetting).all()


@router.put("/settings")
def update_settings(reqs: List[StoreSettingUpdate], admin=Depends(require_admin), db: Session = Depends(get_db)):
    for req in reqs:
        setting = db.query(StoreSetting).filter(StoreSetting.key == req.key).first()
        if setting:
            setting.value = req.value
        else:
            setting = StoreSetting(key=req.key, value=req.value)
            db.add(setting)
    db.commit()
    return {"message": "Settings updated"}


# ─── REPORTS ────────────────────────────────────────────
@router.get("/reports/sales")
def sales_report(
    start_date: str = Query(None),
    end_date: str = Query(None),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Order).filter(Order.status != OrderStatus.CANCELLED)
    if start_date:
        q = q.filter(Order.created_at >= start_date)
    if end_date:
        q = q.filter(Order.created_at <= end_date)

    orders = q.all()
    total_revenue = sum(float(o.total) for o in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders else 0

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_order_value": round(avg_order_value, 2),
        "total_discount_given": sum(float(o.discount_amount) for o in orders),
        "total_shipping_collected": sum(float(o.shipping_charge) for o in orders),
        "total_tax_collected": sum(float(o.tax_amount) for o in orders)
    }
