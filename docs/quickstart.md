# Quickstart (Mac)

Goal: from zero to running in <= 15 minutes.

## Option A: One-click with Docker (recommended)

1) Install Docker Desktop.
2) From repo root, run:

```bash
docker compose up --build
```

3) Open:
- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/api/docs

Notes:
- Backend env uses `backend/.env.example` by default in Docker Compose.
- Database runs in container `nailsdash-db` (MySQL 8).

## Option B: Local dev (no Docker)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open:
- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/api/docs
