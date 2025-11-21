.PHONY: help build build-multiarch push dev down clean logs

# Variables
IMAGE_NAME := hapope/etcd-manager
TAG := latest
PLATFORMS := linux/amd64,linux/arm64

help:
	@echo "Available commands:"
	@echo "  make build            - Build Docker image for current platform"
	@echo "  make build-multiarch  - Build multi-architecture image (amd64 + arm64) and push to Docker Hub"
	@echo "  make push             - Push current platform image to Docker Hub"
	@echo "  make dev              - Start services with docker-compose"
	@echo "  make down             - Stop all services"
	@echo "  make clean            - Remove containers, volumes and local images"
	@echo "  make logs             - Show logs from all services"
	@echo "  make logs-etcd        - Show logs from etcd service"
	@echo "  make logs-manager     - Show logs from etcd-manager service"

build:
	@echo "Building Docker image for current platform..."
	docker build -t $(IMAGE_NAME):$(TAG) .

build-multiarch:
	@echo "Building multi-architecture Docker image..."
	docker buildx build \
		--platform $(PLATFORMS) \
		-t $(IMAGE_NAME):$(TAG) \
		--push \
		.
	@echo "Multi-architecture image pushed successfully!"

push:
	@echo "Pushing Docker image to Docker Hub..."
	docker push $(IMAGE_NAME):$(TAG)

dev:
	@echo "Starting services..."
	docker compose down
	docker compose pull
	docker compose up -d
	@echo "Services started! Access at http://localhost:8888"

down:
	@echo "Stopping services..."
	docker compose down

clean:
	@echo "Cleaning up..."
	docker compose down -v
	docker rmi $(IMAGE_NAME):$(TAG) 2>/dev/null || true
	@echo "Cleanup complete!"

logs:
	docker compose logs -f

logs-etcd:
	docker compose logs -f etcd

logs-manager:
	docker compose logs -f etcd-manager

# Development helpers
.PHONY: rebuild redeploy
rebuild: build-multiarch dev

redeploy: down dev
