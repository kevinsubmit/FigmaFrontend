# FAQ

## 1) MySQL port 3306 already in use
Stop local MySQL or change the host port in `docker-compose.yml`.

## 2) Backend cannot connect to DB
Check `DATABASE_URL` in `backend/.env` (local) or `backend/.env.example` (Docker).

## 3) Frontend API calls fail with CORS
Ensure backend `CORS_ORIGINS` includes `http://localhost:5173` in `backend/.env`.

## 4) Uploads fail or go to a wrong path
Set `UPLOAD_DIR` in `backend/.env` and ensure the path is writable.

## 5) Docker build is slow
First build pulls images and installs dependencies; subsequent runs should be faster.
