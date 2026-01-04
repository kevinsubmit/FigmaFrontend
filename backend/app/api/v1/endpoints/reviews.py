from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.db.session import get_db
from app.models.review import Review
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse, StoreRatingResponse
from app.api.deps import get_current_user

router = APIRouter()


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
    
    # 4. 检查是否已经评价过
    existing_review = db.query(Review).filter(Review.appointment_id == review_data.appointment_id).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This appointment has already been reviewed"
        )
    
    # 5. 创建评价
    new_review = Review(
        user_id=current_user.id,
        store_id=appointment.store_id,
        appointment_id=review_data.appointment_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    # 6. 构建响应（包含用户信息）
    response = ReviewResponse.from_orm(new_review)
    response.user_name = current_user.username
    response.user_avatar = current_user.avatar_url
    
    return response


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
    
    # 填充用户信息
    response_list = []
    for review in reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        review_response = ReviewResponse.from_orm(review)
        if user:
            review_response.user_name = user.username
            review_response.user_avatar = user.avatar_url
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
    
    # 填充用户信息
    response_list = []
    for review in reviews:
        review_response = ReviewResponse.from_orm(review)
        review_response.user_name = current_user.username
        review_response.user_avatar = current_user.avatar_url
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
    
    # 3. 更新评价
    review.rating = review_data.rating
    review.comment = review_data.comment
    
    db.commit()
    db.refresh(review)
    
    # 4. 构建响应
    response = ReviewResponse.from_orm(review)
    response.user_name = current_user.username
    response.user_avatar = current_user.avatar_url
    
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
    db.delete(review)
    db.commit()
    
    return None
