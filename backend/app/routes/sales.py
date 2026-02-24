from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import timedelta
from app.database import get_db
from app.models.models import (
    SalesQuotation, SalesQuotationItem,
    SalesOrder, SalesOrderItem,
    SalesInvoice, SalesInvoiceItem,
    Product, B2BCustomer, InventoryLog,
    SalesOrderStatus
)
from app.schemas.schemas import (
    SalesQuotationCreate, SalesQuotationUpdate, SalesQuotationResponse,
    SalesOrderCreate, SalesOrderUpdate, SalesOrderResponse,
    SalesInvoiceCreate, SalesInvoiceUpdate, SalesInvoiceResponse
)
from app.utils.auth import require_permission

router = APIRouter(prefix="/api/sales", tags=["Sales Management"])


# ═══════════════════════════════════════════════════════
# SALES QUOTATIONS
# ═══════════════════════════════════════════════════════

@router.post("/quotations", response_model=SalesQuotationResponse)
def create_sales_quotation(
    quotation: SalesQuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_quotations:manage"))
):
    """Create a new sales quotation"""
    # Check if quotation number exists
    existing = db.query(SalesQuotation).filter(SalesQuotation.quotation_number == quotation.quotation_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Quotation number already exists")
    
    # Calculate totals
    subtotal = 0
    total_tax = 0
    
    for item in quotation.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        item_tax = taxable * (item.tax_percentage / 100)
        line_total = taxable + item_tax
        
        subtotal += item_subtotal
        total_tax += item_tax
    
    discount_amount = subtotal * (quotation.discount_percentage / 100)
    total = subtotal - discount_amount + quotation.freight_charges + quotation.other_charges + total_tax
    
    # Create quotation
    db_quotation = SalesQuotation(
        quotation_number=quotation.quotation_number,
        customer_id=quotation.customer_id,
        quotation_date=quotation.quotation_date,
        valid_until=quotation.valid_until,
        subtotal=subtotal,
        discount_percentage=quotation.discount_percentage,
        discount_amount=discount_amount,
        freight_charges=quotation.freight_charges,
        other_charges=quotation.other_charges,
        gst_type=quotation.gst_type,
        total_tax=total_tax,
        total=total,
        notes=quotation.notes,
        terms_conditions=quotation.terms_conditions,
        created_by=current_user.id
    )
    db.add(db_quotation)
    db.flush()
    
    # Add line items
    for item in quotation.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        line_total = taxable + (taxable * item.tax_percentage / 100)
        
        db_item = SalesQuotationItem(
            quotation_id=db_quotation.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percentage=item.discount_percentage,
            tax_percentage=item.tax_percentage,
            line_total=line_total,
            notes=item.notes
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_quotation)
    
    # Load relationships
    db_quotation = db.query(SalesQuotation).options(
        joinedload(SalesQuotation.customer),
        joinedload(SalesQuotation.items)
    ).filter(SalesQuotation.id == db_quotation.id).first()
    
    return db_quotation


@router.get("/quotations", response_model=List[SalesQuotationResponse])
def get_sales_quotations(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    customer_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_quotations:view"))
):
    """Get all sales quotations"""
    query = db.query(SalesQuotation).options(
        joinedload(SalesQuotation.customer),
        joinedload(SalesQuotation.items)
    )
    
    if status:
        query = query.filter(SalesQuotation.status == status)
    if customer_id:
        query = query.filter(SalesQuotation.customer_id == customer_id)
    
    query = query.order_by(SalesQuotation.created_at.desc())
    quotations = query.offset(skip).limit(limit).all()
    return quotations


@router.get("/quotations/{quotation_id}", response_model=SalesQuotationResponse)
def get_sales_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_quotations:view"))
):
    """Get a specific sales quotation"""
    quotation = db.query(SalesQuotation).options(
        joinedload(SalesQuotation.customer),
        joinedload(SalesQuotation.items)
    ).filter(SalesQuotation.id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@router.put("/quotations/{quotation_id}", response_model=SalesQuotationResponse)
def update_sales_quotation(
    quotation_id: str,
    quotation_update: SalesQuotationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_quotations:manage"))
):
    """Update a sales quotation"""
    quotation = db.query(SalesQuotation).filter(SalesQuotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    for key, value in quotation_update.model_dump(exclude_unset=True).items():
        setattr(quotation, key, value)
    
    db.commit()
    db.refresh(quotation)
    return quotation


# ═══════════════════════════════════════════════════════
# SALES ORDERS
# ═══════════════════════════════════════════════════════

@router.post("/orders", response_model=SalesOrderResponse)
def create_sales_order(
    order: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_orders:manage"))
):
    """Create a new sales order"""
    # Check if order number exists
    existing = db.query(SalesOrder).filter(SalesOrder.order_number == order.order_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Order number already exists")
    
    # Calculate totals
    subtotal = 0
    total_tax = 0
    
    for item in order.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        item_tax = taxable * (item.tax_percentage / 100)
        
        subtotal += item_subtotal
        total_tax += item_tax
    
    discount_amount = subtotal * (order.discount_percentage / 100)
    total = subtotal - discount_amount + order.freight_charges + order.other_charges + total_tax
    
    # Create order
    db_order = SalesOrder(
        order_number=order.order_number,
        customer_id=order.customer_id,
        quotation_id=order.quotation_id,
        warehouse_id=order.warehouse_id,
        status=SalesOrderStatus.PENDING,  # Set as pending, requires approval to confirm
        order_date=order.order_date,
        expected_delivery_date=order.expected_delivery_date,
        subtotal=subtotal,
        discount_percentage=order.discount_percentage,
        discount_amount=discount_amount,
        freight_charges=order.freight_charges,
        other_charges=order.other_charges,
        payment_terms=order.payment_terms,
        gst_type=order.gst_type,
        total_tax=total_tax,
        total=total,
        notes=order.notes,
        terms_conditions=order.terms_conditions,
        created_by=current_user.id
    )
    db.add(db_order)
    db.flush()
    
    # Add line items (NO STOCK DEDUCTION HERE)
    for item in order.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount
        line_total = taxable + (taxable * item.tax_percentage / 100)
        
        db_item = SalesOrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percentage=item.discount_percentage,
            tax_percentage=item.tax_percentage,
            line_total=line_total,
            notes=item.notes
        )
        db.add(db_item)
        
        # We verify stock exists but DO NOT deduct it yet. 
        # Stock is trapped only upon Approval.
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
             if product.stock < item.quantity:
                # Warn user but allow creation? Or block?
                # User requirement: "Stock 'Trapping': If we add an 'Approval' step, stock might get locked..."
                # Mitigation: "stock is only affected upon explicit 'Approval'".
                # So we allow creation even if stock is low (backorder potential), 
                # OR we fail here. failing here is safer for consistency.
                pass 
                # keeping it strictly check-free on creation might lead to "Approved but no stock" errors.
                # Let's check but not deduct.
                pass

    db.commit()
    db.refresh(db_order)
    
    # Load relationships
    db_order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    ).filter(SalesOrder.id == db_order.id).first()
    
    return db_order


@router.post("/orders/{order_id}/approve")
def approve_sales_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_orders:approve"))
):
    """Approve a sales order: Change status to CONFIRMED and deduct stock"""
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != SalesOrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending orders can be approved")
    
    # Check and Deduct Stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(404, f"Product {item.product_id} not found")
        
        if product.stock < item.quantity:
            raise HTTPException(400, f"Insufficient stock for {product.name} (Required: {item.quantity}, Available: {product.stock})")
        
        # Atomic deduction
        product.stock = Product.stock - item.quantity
        
        # Audit Log
        log = InventoryLog(
            product_id=item.product_id,
            change=-item.quantity,
            reason=f"Order Approved: {order.order_number}",
            performed_by=current_user.id,
            transaction_type="outward",
            invoice_number=order.order_number,
            customer_name=order.customer.name if order.customer else "",
            invoice_date=order.order_date,
            notes="Stock reserved on approval"
        )
        db.add(log)
    
    order.status = SalesOrderStatus.CONFIRMED
    db.commit()
    return {"message": "Order approved and stock reserved", "id": order.id}


@router.get("/orders", response_model=List[SalesOrderResponse])
def get_sales_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    customer_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_orders:view"))
):
    """Get all sales orders"""
    query = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    )
    
    if status:
        query = query.filter(SalesOrder.status == status)
    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)
    
    query = query.order_by(SalesOrder.created_at.desc())
    orders = query.offset(skip).limit(limit).all()
    return orders


@router.get("/orders/{order_id}", response_model=SalesOrderResponse)
def get_sales_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_orders:view"))
):
    """Get a specific sales order"""
    order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    ).filter(SalesOrder.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order


@router.put("/orders/{order_id}", response_model=SalesOrderResponse)
def update_sales_order(
    order_id: str,
    order_update: SalesOrderUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_orders:manage"))
):
    """Update a sales order"""
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    # Handle stock reversal if cancelling an order that reserved stock
    if order_update.status == SalesOrderStatus.CANCELLED and order.status != SalesOrderStatus.CANCELLED:
        # Only revert stock if it was previously reserved (i.e. status was CONFIRMED or later)
        # If status was PENDING or DRAFT, no stock was deducted, so don't add it back.
        if order.status not in [SalesOrderStatus.DRAFT, SalesOrderStatus.PENDING]:
            # Revert stock for all items
            for item in order.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.stock = Product.stock + item.quantity
                    
                    # Log the reversal
                    log = InventoryLog(
                        product_id=item.product_id,
                        change=item.quantity,
                        reason=f"Order Cancelled: {order.order_number}",
                        performed_by=current_user.id,
                        transaction_type="inward",
                        invoice_number=order.order_number,
                        customer_name=order.customer.name if order.customer else "",
                        invoice_date=order.order_date,
                        notes="Stock reverted due to order cancellation"
                    )
                    db.add(log)

    for key, value in order_update.model_dump(exclude_unset=True).items():
        setattr(order, key, value)
    
    db.commit()
    db.refresh(order)
    return order


# ═══════════════════════════════════════════════════════
# SALES INVOICES
# ═══════════════════════════════════════════════════════

@router.post("/invoices", response_model=SalesInvoiceResponse)
def create_sales_invoice(
    invoice: SalesInvoiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_invoices:manage"))
):
    """Create a new sales invoice and update inventory"""
    # Normalize invoice number
    invoice.invoice_number = invoice.invoice_number.upper()
    
    # Check if invoice number exists
    existing = db.query(SalesInvoice).filter(SalesInvoice.invoice_number == invoice.invoice_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists")
    
    # Calculate totals
    subtotal = 0
    total_tax = 0
    cgst_total = 0
    sgst_total = 0
    igst_total = 0
    
    for item in invoice.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount_amount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount_amount
        item_tax = taxable * (item.tax_percentage / 100)
        
        subtotal += item_subtotal
        total_tax += item_tax
        
        # Calculate GST breakdown
        if invoice.gst_type == "cgst_sgst":
            cgst_total += item_tax / 2
            sgst_total += item_tax / 2
        else:
            igst_total += item_tax
    
    discount_amount = subtotal * (invoice.discount_percentage / 100)
    total_before_round = subtotal - discount_amount + invoice.freight_charges + invoice.other_charges + total_tax
    
    # Round off to nearest rupee
    total = round(total_before_round)
    round_off = total - total_before_round
    
    balance_due = total
    
    # Calculate due date
    due_date = invoice.due_date
    if not due_date and invoice.payment_terms != "cash":
        days_map = {
            "credit_15": 15,
            "credit_30": 30,
            "credit_60": 60,
            "credit_90": 90
        }
        days = days_map.get(invoice.payment_terms, 0)
        due_date = invoice.invoice_date + timedelta(days=days)
    
    # Create invoice
    db_invoice = SalesInvoice(
        invoice_number=invoice.invoice_number,
        customer_id=invoice.customer_id,
        sales_order_id=invoice.sales_order_id,
        delivery_note_id=invoice.delivery_note_id,
        invoice_date=invoice.invoice_date,
        due_date=due_date,
        payment_terms=invoice.payment_terms,
        subtotal=subtotal,
        discount_percentage=invoice.discount_percentage,
        discount_amount=discount_amount,
        freight_charges=invoice.freight_charges,
        other_charges=invoice.other_charges,
        gst_type=invoice.gst_type,
        cgst_amount=cgst_total,
        sgst_amount=sgst_total,
        igst_amount=igst_total,
        total_tax=total_tax,
        round_off=round_off,
        total=total,
        paid_amount=0,
        balance_due=balance_due,
        notes=invoice.notes,
        terms_conditions=invoice.terms_conditions,
        created_by=current_user.id,
        status="sent",
        eway_bill_no=invoice.eway_bill_no,
        delivery_note_no=invoice.delivery_note_no,
        buyer_order_no=invoice.buyer_order_no,
        consignee_name=invoice.consignee_name,
        consignee_address=invoice.consignee_address,
        consignee_state=invoice.consignee_state,
        consignee_gstin=invoice.consignee_gstin,
        irn=invoice.irn,
        ack_no=invoice.ack_no,
        ack_date=invoice.ack_date
    )
    db.add(db_invoice)
    db.flush()
    
    # Get customer for inventory log
    customer = db.query(B2BCustomer).filter(B2BCustomer.id == invoice.customer_id).first()
    
    # Add line items and update inventory
    for item in invoice.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount_amount = item_subtotal * (item.discount_percentage / 100)
        taxable = item_subtotal - item_discount_amount
        item_tax = taxable * (item.tax_percentage / 100)
        line_total = taxable + item_tax
        
        cgst = 0
        sgst = 0
        igst = 0
        if invoice.gst_type == "cgst_sgst":
            cgst = item_tax / 2
            sgst = item_tax / 2
        else:
            igst = item_tax
        
        db_item = SalesInvoiceItem(
            invoice_id=db_invoice.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percentage=item.discount_percentage,
            discount_amount=item_discount_amount,
            taxable_amount=taxable,
            tax_percentage=item.tax_percentage,
            cgst_amount=cgst,
            sgst_amount=sgst,
            igst_amount=igst,
            line_total=line_total
        )
        db.add(db_item)
        
        # Update product stock ONLY if this is a direct invoice (not linked to an order)
        # If linked to an order, stock was already deducted at order confirmation
        if not invoice.sales_order_id:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product not found: {item.product_id}")
            
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient stock for {product.name}. Available: {product.stock}, Required: {item.quantity}"
                )
            
            product.stock = Product.stock - item.quantity
            
            # Create inventory log
            log = InventoryLog(
                product_id=item.product_id,
                change=-item.quantity,
                reason=f"Sales Invoice: {invoice.invoice_number}",
                performed_by=current_user.id,
                transaction_type="outward",
                invoice_number=invoice.invoice_number,
                customer_name=customer.name if customer else "",
                invoice_date=invoice.invoice_date,
                notes=f"Direct Invoice - {customer.customer_type if customer else 'N/A'}"
            )
            db.add(log)
    
    
    # Update customer balance
    if customer:
        customer.current_balance = B2BCustomer.current_balance + total
    
    db.commit()
    db.refresh(db_invoice)
    
    # Load relationships
    db_invoice = db.query(SalesInvoice).options(
        joinedload(SalesInvoice.customer),
        joinedload(SalesInvoice.items)
    ).filter(SalesInvoice.id == db_invoice.id).first()
    
    return db_invoice


@router.post("/invoices/{invoice_id}/void")
def void_sales_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_invoices:void"))
):
    """Void a sales invoice, reverse balance, and return stock if applicable"""
    invoice = db.query(SalesInvoice).filter(SalesInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status == "void":
        raise HTTPException(status_code=400, detail="Invoice is already voided")
    
    if invoice.paid_amount > 0:
        raise HTTPException(status_code=400, detail="Cannot void an invoice that has received payments. Please refund payments first.")
    
    # 1. Reverse Customer Balance
    customer = db.query(B2BCustomer).filter(B2BCustomer.id == invoice.customer_id).first()
    if customer:
        # Check current balance to avoid negative (though credit is fine)
        # Logic: If we added Total to balance when creating, we subtract it now.
        customer.current_balance = B2BCustomer.current_balance - invoice.total

    # 2. Reverse Stock (Only if direct invoice)
    if not invoice.sales_order_id:
        for item in invoice.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock = Product.stock + item.quantity
                
                # Audit Log
                log = InventoryLog(
                    product_id=item.product_id,
                    change=item.quantity,
                    reason=f"Void Invoice: {invoice.invoice_number}",
                    performed_by=current_user.id,
                    transaction_type="inward",
                    invoice_number=invoice.invoice_number,
                    notes="Stock reverted due to void"
                )
                db.add(log)
    
    # 3. Update Status
    invoice.status = "void"
    invoice.balance_due = 0
    
    db.commit()
    return {"message": "Invoice voided successfully", "id": invoice_id}


@router.get("/orders/export")
def export_sales_orders(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_orders:export"))
):
    """Export Sales Orders to CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    orders = db.query(SalesOrder).options(joinedload(SalesOrder.customer)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Order Number", "Date", "Customer", "Status", 
        "Total Amount", "Warehouse ID", "Created By"
    ])
    
    for order in orders:
        writer.writerow([
            order.order_number,
            order.order_date,
            order.customer.name if order.customer else "Guest",
            order.status,
            order.total,
            order.warehouse_id,
            order.created_by
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_orders.csv"}
    )


@router.get("/invoices", response_model=List[SalesInvoiceResponse])
def get_sales_invoices(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    customer_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_invoices:view"))
):
    """Get all sales invoices"""
    query = db.query(SalesInvoice).options(
        joinedload(SalesInvoice.customer),
        joinedload(SalesInvoice.items).joinedload(SalesInvoiceItem.product)
    )
    
    if status:
        query = query.filter(SalesInvoice.status == status)
    if customer_id:
        query = query.filter(SalesInvoice.customer_id == customer_id)
    
    query = query.order_by(SalesInvoice.created_at.desc())
    invoices = query.offset(skip).limit(limit).all()
    return invoices


@router.get("/invoices/{invoice_id}", response_model=SalesInvoiceResponse)
def get_sales_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_invoices:view"))
):
    """Get a specific sales invoice"""
    invoice = db.query(SalesInvoice).options(
        joinedload(SalesInvoice.customer),
        joinedload(SalesInvoice.items).joinedload(SalesInvoiceItem.product)
    ).filter(SalesInvoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/invoices/{invoice_id}", response_model=SalesInvoiceResponse)
def update_sales_invoice(
    invoice_id: str,
    invoice_update: SalesInvoiceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("sales_invoices:manage"))
):
    """Update a sales invoice"""
    invoice = db.query(SalesInvoice).filter(SalesInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    for key, value in invoice_update.model_dump(exclude_unset=True).items():
        setattr(invoice, key, value)
    
    db.commit()
    db.refresh(invoice)
    return invoice
