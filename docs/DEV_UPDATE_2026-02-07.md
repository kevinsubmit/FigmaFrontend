# Dev Update - 2026-02-07

## Scope
This update focuses on the H5 storefront data consistency, admin store management workflow, and upload security hardening.

## Backend
- Added and integrated store admin application flow APIs.
- Added service catalog model/API support for super admin managed service templates.
- Added store portfolio APIs for owner uploads.
- Updated portfolio upload validation to accept image uploads safely.
- Hardened image upload rules to only allow `jpg/jpeg/png` formats.

## Admin Dashboard (H5)
- Refined store detail structure with three tabs:
  - `Services`
  - `Portfolio`
  - `Information`
- Added service catalog management page for super admin.
- Added store admin application pages:
  - register
  - my application / submit for review
  - super admin review list
- Added portfolio image upload and list management in store detail page.
- Upload controls now explicitly show accepted formats (`JPG/JPEG/PNG`).

## Customer H5 Frontend
- Services store cards now fetch and display rating/review values from rating API data.
- Store card sorting by reviews now uses API rating values (instead of static seeded fields).
- Store card storefront images are aligned with store image APIs.

## Security / Validation
- Store portfolio upload endpoint now enforces extension + MIME checks.
- Generic image upload endpoint now enforces extension + MIME checks.
- Accepted formats are now strictly:
  - `jpg`
  - `jpeg`
  - `png`

## Notes
- Runtime/local files (`.env`, `pid`, `log`, local DB, build artifacts) are intentionally excluded from commit.
