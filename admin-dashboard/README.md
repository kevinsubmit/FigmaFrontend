# NailsDash Admin (H5)

## Setup

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3100
```

## Login

- URL: `http://localhost:3100/admin/login`
- Use an admin account (super admin or store admin).

## Notes

- Backend base URL uses `VITE_ADMIN_API_BASE_URL` or `VITE_API_BASE_URL`.
- Update backend `CORS_ORIGINS` to include `http://localhost:3100` for local access.
