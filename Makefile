.PHONY: docker-up docker-down docker-logs security-smoke

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

security-smoke:
	@if [ -z "$$ADMIN_PHONE" ] || [ -z "$$ADMIN_PASSWORD" ]; then \
		echo "Usage: ADMIN_PHONE=... ADMIN_PASSWORD=... make security-smoke"; \
		exit 1; \
	fi
	@backend/venv311/bin/python scripts/security_smoke.py
