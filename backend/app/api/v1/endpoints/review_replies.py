"""
Review Reply endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.review import Review
from app.models.review_reply import ReviewReply
from app.schemas.review_reply import ReviewReplyCreate, ReviewReplyUpdate, ReviewReplyResponse

router = APIRouter()


@router.post("/", response_model=ReviewReplyResponse, status_code=status.HTTP_201_CREATED)
def create_review_reply(
    reply_data: ReviewReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建评价回复
    
    权限：需要认证，只有店铺管理员可以回复该店铺的评价
    """
    # 1. 检查评价是否存在
    review = db.query(Review).filter(Review.id == reply_data.review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # 2. 检查当前用户是否是该店铺的管理员
    if not current_user.is_admin and current_user.store_id != review.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reply to reviews of your store"
        )
    
    # 3. 检查该评价是否已有回复
    existing_reply = db.query(ReviewReply).filter(ReviewReply.review_id == reply_data.review_id).first()
    if existing_reply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This review already has a reply"
        )
    
    # 4. 创建回复
    new_reply = ReviewReply(
        review_id=reply_data.review_id,
        admin_id=current_user.id,
        content=reply_data.content
    )
    
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    
    # 5. 构建响应
    response = ReviewReplyResponse.from_orm(new_reply)
    response.admin_name = current_user.username
    
    return response


@router.put("/{reply_id}", response_model=ReviewReplyResponse)
def update_review_reply(
    reply_id: int,
    reply_data: ReviewReplyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新评价回复
    
    权限：需要认证，只能更新自己的回复
    """
    # 1. 查找回复
    reply = db.query(ReviewReply).filter(ReviewReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # 2. 检查回复是否属于当前用户
    if not current_user.is_admin and reply.admin_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own replies"
        )
    
    # 3. 更新回复
    reply.content = reply_data.content
    
    db.commit()
    db.refresh(reply)
    
    # 4. 构建响应
    response = ReviewReplyResponse.from_orm(reply)
    admin = db.query(User).filter(User.id == reply.admin_id).first()
    response.admin_name = admin.username if admin else current_user.username
    
    return response


@router.delete("/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review_reply(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除评价回复
    
    权限：需要认证，只能删除自己的回复
    """
    # 1. 查找回复
    reply = db.query(ReviewReply).filter(ReviewReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # 2. 检查回复是否属于当前用户
    if not current_user.is_admin and reply.admin_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own replies"
        )
    
    # 3. 删除回复
    db.delete(reply)
    db.commit()
    
    return None


@router.get("/review/{review_id}", response_model=ReviewReplyResponse)
def get_review_reply(
    review_id: int,
    db: Session = Depends(get_db)
):
    """
    获取评价的回复
    
    权限：公开访问
    """
    reply = db.query(ReviewReply).filter(ReviewReply.review_id == review_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # 获取管理员信息
    admin = db.query(User).filter(User.id == reply.admin_id).first()
    
    response = ReviewReplyResponse.from_orm(reply)
    if admin:
        response.admin_name = admin.username
    
    return response
