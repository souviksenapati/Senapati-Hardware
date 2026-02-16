from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.models import Payment, PurchaseInvoice, SalesInvoice, Supplier, B2BCustomer
from app.schemas.schemas import PaymentCreate, PaymentResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new payment record"""
    # Check if payment number exists
    existing = db.query(Payment).filter(Payment.payment_number == payment.payment_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment number already exists")
    
    # Create payment
    db_payment = Payment(
        **payment.model_dump(),
        created_by=current_user.id
    )
    db.add(db_payment)
    
    from decimal import Decimal as D
    
    # Update invoice status and balance
    if payment.payment_type == "purchase" and payment.purchase_invoice_id:
        invoice = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == payment.purchase_invoice_id).first()
        if invoice:
            invoice.paid_amount += D(str(payment.amount))
            invoice.balance_due = invoice.total - invoice.paid_amount
            
            if invoice.balance_due <= 0:
                invoice.status = "paid"
            elif invoice.paid_amount > 0:
                invoice.status = "partially_paid"
            
            # Update supplier balance
            if payment.supplier_id:
                supplier = db.query(Supplier).filter(Supplier.id == payment.supplier_id).first()
                if supplier:
                    supplier.current_balance -= D(str(payment.amount))
    
    elif payment.payment_type == "sales" and payment.sales_invoice_id:
        invoice = db.query(SalesInvoice).filter(SalesInvoice.id == payment.sales_invoice_id).first()
        if invoice:
            invoice.paid_amount += D(str(payment.amount))
            invoice.balance_due = invoice.total - invoice.paid_amount
            
            if invoice.balance_due <= 0:
                invoice.status = "paid"
            elif invoice.paid_amount > 0:
                invoice.status = "partially_paid"
            
            # Update customer balance
            if payment.customer_id:
                customer = db.query(B2BCustomer).filter(B2BCustomer.id == payment.customer_id).first()
                if customer:
                    customer.current_balance -= D(str(payment.amount))
    
    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.get("/", response_model=List[PaymentResponse])
def get_payments(
    skip: int = 0,
    limit: int = 100,
    payment_type: str = None,
    supplier_id: str = None,
    customer_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all payments with optional filtering"""
    query = db.query(Payment)
    
    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)
    if supplier_id:
        query = query.filter(Payment.supplier_id == supplier_id)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)
    
    query = query.order_by(Payment.created_at.desc())
    payments = query.offset(skip).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific payment by ID"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.get("/purchase-invoice/{invoice_id}", response_model=List[PaymentResponse])
def get_payments_by_purchase_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all payments for a specific purchase invoice"""
    payments = db.query(Payment).filter(
        Payment.purchase_invoice_id == invoice_id
    ).order_by(Payment.payment_date.desc()).all()
    
    return payments


@router.get("/sales-invoice/{invoice_id}", response_model=List[PaymentResponse])
def get_payments_by_sales_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all payments for a specific sales invoice"""
    payments = db.query(Payment).filter(
        Payment.sales_invoice_id == invoice_id
    ).order_by(Payment.payment_date.desc()).all()
    
    return payments


@router.get("/supplier/{supplier_id}/aging")
def get_supplier_aging(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get supplier payment aging analysis"""
    from datetime import date, timedelta
    
    today = date.today()
    
    # Get all unpaid/partially paid invoices for supplier
    invoices = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.supplier_id == supplier_id,
        PurchaseInvoice.balance_due > 0
    ).all()
    
    aging = {
        "current": 0,  # 0-30 days
        "30_60": 0,    # 30-60 days
        "60_90": 0,    # 60-90 days
        "over_90": 0,  # >90 days
        "total_due": 0
    }
    
    for invoice in invoices:
        days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
        balance = float(invoice.balance_due)
        
        if days_overdue < 30:
            aging["current"] += balance
        elif days_overdue < 60:
            aging["30_60"] += balance
        elif days_overdue < 90:
            aging["60_90"] += balance
        else:
            aging["over_90"] += balance
        
        aging["total_due"] += balance
    
    return aging


@router.get("/customer/{customer_id}/aging")
def get_customer_aging(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get customer payment aging analysis"""
    from datetime import date, timedelta
    
    today = date.today()
    
    # Get all unpaid/partially paid invoices for customer
    invoices = db.query(SalesInvoice).filter(
        SalesInvoice.customer_id == customer_id,
        SalesInvoice.balance_due > 0
    ).all()
    
    aging = {
        "current": 0,  # 0-30 days
        "30_60": 0,    # 30-60 days
        "60_90": 0,    # 60-90 days
        "over_90": 0,  # >90 days
        "total_due": 0
    }
    
    for invoice in invoices:
        days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
        balance = float(invoice.balance_due)
        
        if days_overdue < 30:
            aging["current"] += balance
        elif days_overdue < 60:
            aging["30_60"] += balance
        elif days_overdue < 90:
            aging["60_90"] += balance
        else:
            aging["over_90"] += balance
        
        aging["total_due"] += balance
    
    return aging
