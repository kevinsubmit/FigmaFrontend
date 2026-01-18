.PHONY: docker-up docker-down docker-logs

docker-up:
\tdocker compose up --build

docker-down:
\tdocker compose down

docker-logs:
\tdocker compose logs -f
