"""
Dashboard schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime


class DashboardRealtimeNotificationServiceItem(BaseModel):
    id: int
    appointment_id: int
    service_id: int
    service_name: str | None = None
    amount: float
    is_primary: bool = False



class DashboardSummaryResponse(BaseModel):
    today_appointments: int
    today_revenue: float
    active_customers_week: int
    avg_ticket_week: float
    avg_ticket_change_pct: float
    scope: str
    store_id: int | None = None


class DashboardRealtimeNotificationItem(BaseModel):
    id: int
    appointment_id: int
    store_id: int
    store_name: str | None = None
    customer_name: str
    service_name: str
    service_items: list[DashboardRealtimeNotificationServiceItem] = Field(default_factory=list)
    appointment_date: str
    appointment_time: str
    title: str
    message: str
    created_at: datetime


class DashboardRealtimeNotificationListResponse(BaseModel):
    total: int
    items: list[DashboardRealtimeNotificationItem]
