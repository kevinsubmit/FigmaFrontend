"""
Store Portfolio CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.store_portfolio import StorePortfolio
from app.schemas.store_portfolio import StorePortfolioCreate, StorePortfolioUpdate


def get_store_portfolio(
    db: Session,
    store_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[StorePortfolio]:
    """Get portfolio items for a store"""
    return db.query(StorePortfolio).filter(
        StorePortfolio.store_id == store_id
    ).order_by(
        StorePortfolio.display_order.asc(),
        StorePortfolio.created_at.desc()
    ).offset(skip).limit(limit).all()


def get_portfolio_item(db: Session, portfolio_id: int) -> Optional[StorePortfolio]:
    """Get a specific portfolio item"""
    return db.query(StorePortfolio).filter(StorePortfolio.id == portfolio_id).first()


def create_portfolio_item(
    db: Session,
    store_id: int,
    portfolio_data: StorePortfolioCreate
) -> StorePortfolio:
    """Create a new portfolio item"""
    portfolio = StorePortfolio(
        store_id=store_id,
        **portfolio_data.model_dump()
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


def update_portfolio_item(
    db: Session,
    portfolio_id: int,
    portfolio_data: StorePortfolioUpdate
) -> Optional[StorePortfolio]:
    """Update a portfolio item"""
    portfolio = get_portfolio_item(db, portfolio_id)
    if not portfolio:
        return None
    
    update_data = portfolio_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(portfolio, field, value)
    
    db.commit()
    db.refresh(portfolio)
    return portfolio


def delete_portfolio_item(db: Session, portfolio_id: int) -> bool:
    """Delete a portfolio item"""
    portfolio = get_portfolio_item(db, portfolio_id)
    if not portfolio:
        return False
    
    db.delete(portfolio)
    db.commit()
    return True


def get_portfolio_count(db: Session, store_id: int) -> int:
    """Get total count of portfolio items for a store"""
    return db.query(StorePortfolio).filter(
        StorePortfolio.store_id == store_id
    ).count()
