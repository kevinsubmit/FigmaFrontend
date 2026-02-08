# Dev Update - 2026-02-08 (Service Config Closure)

## Scope
Implemented MVP closure for service configuration:
1. Super admin manages service catalog.
2. Store admin assigns catalog services with store-specific price and duration.
3. H5 storefront reads store-level active services for booking.

## Backend
- Unified service payload validation:
  - `price > 0`
  - `duration_minutes > 0`
- Added response compatibility field:
  - `name_snapshot`
- Switched store service assignment to upsert/reactivate behavior for same `store_id + catalog_id`.
- Changed service remove behavior to soft deactivate (`is_active = 0`) instead of hard delete.
- Added/kept endpoint compatibility aliases:
  - `GET /api/v1/services/store/{store_id}`
  - `POST /api/v1/services/store/{store_id}`
  - `PATCH /api/v1/services/store/{store_id}/{service_id}`
  - `DELETE /api/v1/services/store/{store_id}/{service_id}`
- Tightened appointment creation checks:
  - service exists
  - service belongs to selected store
  - service is active

## Admin Dashboard
- Switched service APIs to new store route contract (`/services/store/...`).
- Switched catalog list loading to `/services/admin/catalog`.
- Store detail services UX update:
  - `Added` for active catalog items
  - `Re-Add` for previously deactivated items
  - `Deactivate` action for active services

## H5 Frontend
- Updated service fetch to use `/api/v1/services/store/{storeId}`.
- Synced service typing with backend contract fields:
  - `catalog_id`, `name_snapshot`, `is_active`, `category`, `updated_at`

## Validation
- Backend python compile checks passed.
- Admin dashboard production build passed.
- H5 frontend production build passed.

## Notes
- This update keeps backward-compatible aliases where possible.
- Runtime/local files are intentionally excluded from commit.
