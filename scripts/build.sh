#!/bin/bash
set -e

echo "🚀 Building etcd-manager v1.0.0..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build backend
echo -e "${BLUE}📦 Building Go backend...${NC}"
cd server
go build -o ../bin/etcd-manager ./cmd/api
cd ..
echo -e "${GREEN}✓ Backend built${NC}"

# Build frontend
echo -e "${BLUE}🎨 Building React frontend...${NC}"
cd web/react-app
npm ci
npm run build
cd ../..
echo -e "${GREEN}✓ Frontend built${NC}"

# Create release directory
echo -e "${BLUE}📁 Creating release package...${NC}"
mkdir -p release/etcd-manager
cp bin/etcd-manager release/etcd-manager/
cp -r web/react-app/dist release/etcd-manager/static
cp server/etc/etcmanager.yaml release/etcd-manager/
echo "DataPath: ./data" >> release/etcd-manager/etcmanager.yaml

# Create tarball
cd release
tar -czf etcd-manager-v1.0.0-linux-amd64.tar.gz etcd-manager/
cd ..
echo -e "${GREEN}✓ Release package created: release/etcd-manager-v1.0.0-linux-amd64.tar.gz${NC}"

echo -e "${GREEN}🎉 Build complete!${NC}"
