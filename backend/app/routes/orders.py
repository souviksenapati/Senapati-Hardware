import math
import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.models import (
    Order, OrderItem, Cart, CartItem, Product, Address, Coupon, User,
    OrderStatus, PaymentStatus, PaymentMethod, DiscountType, InventoryLog
)
from app.schemas.schemas import (
    OrderCreate, OrderResponse, OrderStatusUpdate, OrderListResponse
)
from app.utils.auth import get_current_user, require_admin, require_staff_or_admin

router = APIRouter(prefix="/api/orders", tags=["Orders"])


def _gen_order_number():
    return "SH-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


@router.post("", response_model=OrderResponse)
def create_order(req: OrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product)
    ).filter(Cart.user_id == user.id).first()

    if not cart or not cart.items:
        raise HTTPException(400, "Cart is empty")

    # Resolve shipping address
    if req.address_id:
        addr = db.query(Address).filter(Address.id == req.address_id, Address.user_id == user.id).first()
        if addr:
            req.shipping_name = addr.full_name
            req.shipping_phone = addr.phone
            req.shipping_address1 = addr.address_line1
            req.shipping_address2 = addr.address_line2
            req.shipping_city = addr.city
            req.shipping_state = addr.state
            req.shipping_pincode = addr.pincode

    if not req.shipping_name:
        raise HTTPException(400, "Shipping address is required")

    # Calculate totals
    subtotal = 0
    order_items = []
    for ci in cart.items:
        if ci.product.stock < ci.quantity:
            raise HTTPException(400, f"Insufficient stock for {ci.product.name}")
        item_total = float(ci.product.price) * ci.quantity
        subtotal += item_total
        order_items.append(OrderItem(
            product_id=ci.product.id,
            product_name=ci.product.name,
            product_sku=ci.product.sku,
            price=float(ci.product.price),
            quantity=ci.quantity,
            total=item_total
        ))

    # Apply coupon
    discount = 0
    if req.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == req.coupon_code, Coupon.is_active == True).first()
        if coupon:
            now = datetime.now(timezone.utc)
            if coupon.valid_from <= now <= coupon.valid_until:
                if subtotal >= float(coupon.min_order_amount):
                    if coupon.usage_limit is None or coupon.used_count < coupon.usage_limit:
                        if coupon.discount_type == DiscountType.PERCENTAGE:
                            discount = subtotal * (float(coupon.discount_value) / 100)
                            if coupon.max_discount:
                                discount = min(discount, float(coupon.max_discount))
                        else:
                            discount = float(coupon.discount_value)
                        coupon.used_count += 1

    shipping = 0 if subtotal >= 500 else 50
    tax = round(subtotal * 0.18, 2)
    total = round(subtotal - discount + shipping + tax, 2)

    order = Order(
        order_number=_gen_order_number(),
        user_id=user.id,
        status=OrderStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        payment_method=PaymentMethod(req.payment_method),
        subtotal=subtotal,
        discount_amount=discount,
        shipping_charge=shipping,
        tax_amount=tax,
        total=total,
        coupon_code=req.coupon_code,
        shipping_name=req.shipping_name,
        shipping_phone=req.shipping_phone,
        shipping_address1=req.shipping_address1,
        shipping_address2=req.shipping_address2,
        shipping_city=req.shipping_city,
        shipping_state=req.shipping_state,
        shipping_pincode=req.shipping_pincode,
        notes=req.notes,
        items=order_items
    )
    db.add(order)

    # Deduct stock
    for ci in cart.items:
        ci.product.stock -= ci.quantity
        db.add(InventoryLog(
            product_id=ci.product.id,
            change=-ci.quantity,
            reason=f"Order {order.order_number}",
            performed_by=user.id
        ))

    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(order)
    return OrderResponse.model_validate(order)


@router.get("", response_model=OrderListResponse)
def my_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Order).options(joinedload(Order.items)).filter(Order.user_id == user.id)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OrderListResponse(orders=[OrderResponse.model_validate(o) for o in orders], total=total, page=page, page_size=page_size)


@router.get("/all", response_model=OrderListResponse)
def all_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    admin=Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Order).options(joinedload(Order.items))
    if status:
        q = q.filter(Order.status == status)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OrderListResponse(orders=[OrderResponse.model_validate(o) for o in orders], total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.user_id != user.id:
        raise HTTPException(403, "Access denied")
    return OrderResponse.model_validate(order)


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str, req: OrderStatusUpdate,
    admin=Depends(require_staff_or_admin), db: Session = Depends(get_db)
):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    order.status = OrderStatus(req.status)
    if req.tracking_number:
        order.tracking_number = req.tracking_number
    if req.status == "delivered":
        order.delivered_at = datetime.now(timezone.utc)
        order.payment_status = PaymentStatus.PAID

    db.commit()
    db.refresh(order)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.user_id != user.id:
        raise HTTPException(403, "Access denied")
    if order.status not in (OrderStatus.PENDING, OrderStatus.CONFIRMED):
        raise HTTPException(400, "Cannot cancel this order")

    order.status = OrderStatus.CANCELLED
    # Restore stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
            db.add(InventoryLog(
                product_id=product.id,
                change=item.quantity,
                reason=f"Order {order.order_number} cancelled",
                performed_by=user.id
            ))
    db.commit()
    return {"message": "Order cancelled"}
