"""
API v1 router
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, stores, services, appointments, technicians, store_hours, technician_unavailable, notifications, reviews, upload, review_replies, users, store_portfolio, store_holidays, points, coupons, referrals

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(stores.router, prefix="/stores", tags=["Stores"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(technicians.router, prefix="/technicians", tags=["Technicians"])
api_router.include_router(store_hours.router, prefix="/stores", tags=["Store Hours"])
api_router.include_router(technician_unavailable.router, prefix="/technicians", tags=["Technician Unavailable"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(review_replies.router, prefix="/review-replies", tags=["Review Replies"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(store_portfolio.router, prefix="/stores/portfolio", tags=["Store Portfolio"])
api_router.include_router(store_holidays.router, prefix="/stores/holidays", tags=["Store Holidays"])
api_router.include_router(points.router, prefix="/points", tags=["Points"])
api_router.include_router(coupons.router, prefix="/coupons", tags=["Coupons"])
api_router.include_router(referrals.router, prefix="/referrals", tags=["Referrals"])
