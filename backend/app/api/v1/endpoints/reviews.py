from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.session import get_db
from app.models.review import Review
from app.models.user import User
from app.models.appointment import Appointment
from app.models.store import Store
from app.models.review_reply import ReviewReply
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    StoreRatingResponse,
    ReviewAdminItem,
    ReviewAdminListResponse,
)
from app.api.deps import get_current_user, get_current_store_admin

router = APIRouter()
REVIEW_WINDOW_DAYS = 30


def _build_reply_payload(db: Session, review_id: int) -> Optional[dict]:
    reply = db.query(ReviewReply).filter(ReviewReply.review_id == review_id).first()
    if not reply:
        return None
    admin = db.query(User).filter(User.id == reply.admin_id).first()
    return {
        "id": reply.id,
        "content": reply.content,
        "admin_name": admin.username if admin else None,
        "created_at": reply.created_at.isoformat(),
        "updated_at": reply.updated_at.isoformat(),
    }


def _refresh_store_rating_summary(db: Session, store_id: int) -> None:
    stats = db.query(
        func.avg(Review.rating).label("average_rating"),
        func.count(Review.id).label("total_reviews"),
    ).filter(Review.store_id == store_id).first()
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        return
    store.rating = round(float(stats.average_rating or 0.0), 2)
    store.review_count = int(stats.total_reviews or 0)


def _validate_review_images(images: Optional[List[str]]) -> Optional[List[str]]:
    if images is None:
        return None
    cleaned = [str(item).strip() for item in images if str(item).strip()]
    if len(cleaned) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At most 5 review images are allowed",
        )
    return cleaned


@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建评价
    
    权限：需要认证，只能评价自己的已完成预约
    约束：一个预约只能评价一次
    """
    # 1. 检查预约是否存在
    appointment = db.query(Appointment).filter(Appointment.id == review_data.appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # 2. 检查预约是否属于当前用户
    if appointment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review your own appointments"
        )
    
    # 3. 检查预约状态是否为已完成
    if appointment.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review completed appointments"
        )
    
    # 4. 检查评价窗口是否过期
    appointment_dt = datetime.combine(appointment.appointment_date, appointment.appointment_time)
    if datetime.now() > appointment_dt + timedelta(days=REVIEW_WINDOW_DAYS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review window has expired"
        )

    # 5. 检查是否已经评价过
    existing_review = db.query(Review).filter(Review.appointment_id == review_data.appointment_id).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This appointment has already been reviewed"
        )
    
    # 6. 创建评价
    new_review = Review(
        user_id=current_user.id,
        store_id=appointment.store_id,
        appointment_id=review_data.appointment_id,
        rating=review_data.rating,
        comment=review_data.comment,
        images=_validate_review_images(review_data.images),
    )
    
    db.add(new_review)
    _refresh_store_rating_summary(db, appointment.store_id)
    db.commit()
    db.refresh(new_review)
    
    # 7. 构建响应（包含用户信息）
    response = ReviewResponse.from_orm(new_review)
    response.user_name = current_user.full_name or current_user.username
    response.user_avatar = current_user.avatar_url
    response.user_avatar_updated_at = current_user.updated_at
    response.images = new_review.images or []
    response.reply = None
    
    return response


@router.get("/admin", response_model=ReviewAdminListResponse)
def get_admin_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    store_id: Optional[int] = Query(None),
    replied: Optional[bool] = Query(None),
    rating: Optional[int] = Query(None, ge=1, le=5),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    后台评价列表（超级管理员/店铺管理员）
    """
    query = db.query(Review)

    # 权限范围：店铺管理员只能看自己店铺
    if not current_user.is_admin:
        query = query.filter(Review.store_id == current_user.store_id)
    elif store_id is not None:
        query = query.filter(Review.store_id == store_id)

    if rating is not None:
        query = query.filter(func.floor(Review.rating) == rating)

    if replied is True:
        query = query.filter(db.query(ReviewReply.id).filter(ReviewReply.review_id == Review.id).exists())
    elif replied is False:
        query = query.filter(~db.query(ReviewReply.id).filter(ReviewReply.review_id == Review.id).exists())

    if keyword:
        kw = f"%{keyword.strip()}%"
        query = query.join(User, User.id == Review.user_id).join(Appointment, Appointment.id == Review.appointment_id).filter(
            (User.username.ilike(kw)) |
            (User.full_name.ilike(kw)) |
            (Review.comment.ilike(kw)) |
            (Appointment.order_number.ilike(kw))
        )

    total = query.count()
    rows = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    store_map = {row.id: row.name for row in db.query(Store.id, Store.name).all()}
    user_map = {row.id: row for row in db.query(User.id, User.username, User.avatar_url, User.updated_at).all()}
    appt_map = {row.id: row.order_number for row in db.query(Appointment.id, Appointment.order_number).all()}

    items: List[ReviewAdminItem] = []
    for row in rows:
        user = user_map.get(row.user_id)
        payload = ReviewAdminItem.from_orm(row)
        payload.user_name = (user.full_name or user.username) if user else None
        payload.user_avatar = user.avatar_url if user else None
        payload.user_avatar_updated_at = user.updated_at if user else None
        payload.images = row.images or []
        payload.store_name = store_map.get(row.store_id)
        payload.order_number = appt_map.get(row.appointment_id)
        payload.reply = _build_reply_payload(db, row.id)
        payload.has_reply = payload.reply is not None
        items.append(payload)

    return ReviewAdminListResponse(total=total, skip=skip, limit=limit, items=items)


@router.get("/stores/{store_id}", response_model=List[ReviewResponse])
def get_store_reviews(
    store_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    获取店铺的评价列表
    
    权限：公开访问
    """
    reviews = db.query(Review).filter(
        Review.store_id == store_id
    ).order_by(
        Review.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # 填充用户信息和回复信息
    response_list = []
    for review in reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        review_response = ReviewResponse.from_orm(review)
        if user:
            review_response.user_name = user.full_name or user.username
            review_response.user_avatar = user.avatar_url
            review_response.user_avatar_updated_at = user.updated_at
        review_response.images = review.images or []
        
        # 获取回复信息
        review_response.reply = _build_reply_payload(db, review.id)
            
        response_list.append(review_response)
    
    return response_list


@router.get("/stores/{store_id}/rating", response_model=StoreRatingResponse)
def get_store_rating(
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    获取店铺的评分统计
    
    权限：公开访问
    """
    # 计算平均评分和总评价数
    stats = db.query(
        func.avg(Review.rating).label("average_rating"),
        func.count(Review.id).label("total_reviews")
    ).filter(
        Review.store_id == store_id
    ).first()
    
    average_rating = float(stats.average_rating) if stats.average_rating else 0.0
    total_reviews = stats.total_reviews or 0
    
    # 计算评分分布
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    
    if total_reviews > 0:
        distribution_query = db.query(
            func.floor(Review.rating).label("rating_floor"),
            func.count(Review.id).label("count")
        ).filter(
            Review.store_id == store_id
        ).group_by(
            func.floor(Review.rating)
        ).all()
        
        for rating_floor, count in distribution_query:
            rating_key = int(rating_floor)
            if 1 <= rating_key <= 5:
                rating_distribution[rating_key] = count
    
    return StoreRatingResponse(
        store_id=store_id,
        average_rating=round(average_rating, 2),
        total_reviews=total_reviews,
        rating_distribution=rating_distribution
    )


@router.get("/my-reviews", response_model=List[ReviewResponse])
def get_my_reviews(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户的评价列表
    
    权限：需要认证
    """
    reviews = db.query(Review).filter(
        Review.user_id == current_user.id
    ).order_by(
        Review.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # 填充用户信息和回复信息
    response_list = []
    for review in reviews:
        review_response = ReviewResponse.from_orm(review)
        review_response.user_name = current_user.full_name or current_user.username
        review_response.user_avatar = current_user.avatar_url
        review_response.user_avatar_updated_at = current_user.updated_at
        review_response.images = review.images or []
        
        # 获取回复信息
        review_response.reply = _build_reply_payload(db, review.id)
            
        response_list.append(review_response)
    
    return response_list


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新评价
    
    权限：需要认证，只能更新自己的评价
    """
    # 1. 查找评价
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # 2. 检查评价是否属于当前用户
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews"
        )
    
    # 3. 检查评价窗口是否过期
    appointment = review.appointment
    if appointment:
        appointment_dt = datetime.combine(appointment.appointment_date, appointment.appointment_time)
        if datetime.now() > appointment_dt + timedelta(days=REVIEW_WINDOW_DAYS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review window has expired"
            )

    # 4. 更新评价
    review.rating = review_data.rating
    review.comment = review_data.comment
    review.images = _validate_review_images(review_data.images)
    
    _refresh_store_rating_summary(db, review.store_id)
    db.commit()
    db.refresh(review)
    
    # 5. 构建响应
    response = ReviewResponse.from_orm(review)
    response.user_name = current_user.full_name or current_user.username
    response.user_avatar = current_user.avatar_url
    response.user_avatar_updated_at = current_user.updated_at
    response.images = review.images or []
    
    # 获取回复信息
    response.reply = _build_reply_payload(db, review.id)
    
    return response


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除评价
    
    权限：需要认证，只能删除自己的评价
    """
    # 1. 查找评价
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # 2. 检查评价是否属于当前用户
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    # 3. 删除评价
    store_id_for_refresh = review.store_id
    db.delete(review)
    _refresh_store_rating_summary(db, store_id_for_refresh)
    db.commit()
    
    return None
