"""
API v1 router
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, stores, services, appointments, technicians, store_hours, technician_unavailable, notifications, reviews

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
