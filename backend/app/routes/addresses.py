from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Address, User
from app.schemas.schemas import AddressCreate, AddressResponse
from app.utils.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])


@router.get("", response_model=List[AddressResponse])
def list_addresses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Address).filter(Address.user_id == user.id).all()


@router.post("", response_model=AddressResponse)
def add_address(req: AddressCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    addr = Address(user_id=user.id, **req.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(address_id: str, req: AddressCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(404, "Address not found")
    if req.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    for field, value in req.model_dump().items():
        setattr(addr, field, value)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/{address_id}")
def delete_address(address_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(404, "Address not found")
    db.delete(addr)
    db.commit()
    return {"message": "Address deleted"}
