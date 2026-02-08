# Appointments Development Summary (2026-02-08)

## Scope
This update delivers a full appointments-management enhancement across admin dashboard, H5 booking flow, and backend validation.

## Admin Dashboard
- Rebuilt `/admin/appointments` into a scheduling-focused page:
  - date navigation + day/week switch
  - timeline + table dual view
  - right-side detail drawer
  - status actions (confirmed/completed/cancelled)
- Added filtering and search:
  - keyword search (name/phone/service)
  - order number search
  - service filter (now from service catalog)
  - staff filter
  - store-name search (super admin only)
- Added grouped table display for high-concurrency time slots:
  - group by `date + start time`
  - show concurrent booking count
  - expand/collapse by group
- Updated bottom tab label:
  - `ORDERS` -> `APPOINTMENTS`
- Added order number display in appointment detail drawer.
- Added top date picker input to jump directly to a specific date.

## Service Source Normalization
- Admin appointments page service filter now reads from super-admin service catalog.
- Backend store services query now only returns catalog-linked services (`catalog_id IS NOT NULL`) so H5 uses store-configured catalog services only.

## H5 Time Validation Fixes
- Fixed local date handling bug (UTC date conversion issue) that allowed past-time bookings in certain time zones.
- Added client-side guard in booking submit flow to reject past times.
- Updated reschedule date minimum logic to use local date instead of UTC date string split.

## Backend Guardrails
- Added hard validation in appointments API to reject past datetime on:
  - create appointment
  - reschedule appointment
- Extended notes/reschedule permissions so store admins can operate appointments within their own store.

## Changed Files
- `admin-dashboard/src/pages/AppointmentsList.tsx`
- `admin-dashboard/src/layout/BottomTabs.tsx`
- `admin-dashboard/src/api/appointments.ts`
- `frontend/src/components/StoreDetails.tsx`
- `frontend/src/components/AppointmentDetailsDialog.tsx`
- `backend/app/api/v1/endpoints/appointments.py`
- `backend/app/crud/service.py`
- `docs/appointments_updates_2026-02-08.md`

## Validation
- `admin-dashboard`: build passed (`npm run build`)
- `frontend`: build passed (`npm run build`)
- `backend`: python syntax checks passed for modified endpoints/crud files
