# Stage 1: Build Go backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY server/ ./server/
RUN cd server && CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o ../etcd-manager ./cmd/api

# Stage 2: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY web/react-app/package*.json ./
RUN npm ci
COPY web/react-app/ ./
RUN npm run build

# Stage 3: Runtime
FROM alpine:latest
RUN apk --no-cache add ca-certificates wget

# Create non-root user
RUN addgroup -g 1000 etcdmgr && \
    adduser -D -u 1000 -G etcdmgr etcdmgr

WORKDIR /app

# Copy binaries and static files
COPY --from=backend-builder /build/etcd-manager .
COPY --from=frontend-builder /build/dist ./static
COPY server/etc/etcmanager.yaml ./etc/

# Create data directory with correct permissions
RUN mkdir -p /app/data && \
    chown -R etcdmgr:etcdmgr /app

# Switch to non-root user
USER etcdmgr

EXPOSE 8888
VOLUME /app/data

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8888/health || exit 1

CMD ["./etcd-manager", "-f", "etc/etcmanager.yaml"]
