"""
Technician CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.technician import Technician
from app.schemas.technician import TechnicianCreate, TechnicianUpdate


def get_technician(db: Session, technician_id: int) -> Optional[Technician]:
    """Get technician by ID"""
    return db.query(Technician).filter(Technician.id == technician_id).first()


def get_technicians(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None
) -> List[Technician]:
    """Get list of technicians with optional filters"""
    query = db.query(Technician).filter(Technician.is_active == 1)
    
    if store_id:
        query = query.filter(Technician.store_id == store_id)
    
    return query.offset(skip).limit(limit).all()


def get_store_technicians(db: Session, store_id: int) -> List[Technician]:
    """Get all technicians for a specific store"""
    return db.query(Technician).filter(
        Technician.store_id == store_id,
        Technician.is_active == 1
    ).all()


def create_technician(db: Session, technician: TechnicianCreate) -> Technician:
    """Create new technician"""
    db_technician = Technician(**technician.dict())
    db.add(db_technician)
    db.commit()
    db.refresh(db_technician)
    return db_technician


def update_technician(
    db: Session,
    technician_id: int,
    technician: TechnicianUpdate
) -> Optional[Technician]:
    """Update technician"""
    db_technician = get_technician(db, technician_id)
    if not db_technician:
        return None
    
    update_data = technician.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_technician, field, value)
    
    db.commit()
    db.refresh(db_technician)
    return db_technician


def delete_technician(db: Session, technician_id: int) -> bool:
    """Delete technician"""
    db_technician = get_technician(db, technician_id)
    if not db_technician:
        return False
    
    db.delete(db_technician)
    db.commit()
    return True
