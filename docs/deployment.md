# Deployment Guide

## Docker Deployment (Production)

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Single Container

```bash
# Pull or build image
docker build -t etcd-manager:v1.0.0 .

# Run with volume mount
docker run -d \
  --name etcd-manager \
  -p 8888:8888 \
  -v /var/lib/etcd-manager:/app/data \
  -e ETCD_MANAGER_SECRET_KEY=<your-base64-key> \
  etcd-manager:v1.0.0
```

### Docker Compose (Recommended)

```bash
# Create .env file
echo "SECRET_KEY=$(openssl rand -base64 32)" > .env

# Start services
docker-compose up -d

# Check health
docker-compose ps
docker-compose logs -f etcd-manager
```

### Environment Configuration

Create `.env` file:

```bash
SECRET_KEY=<generate-with-openssl-rand-base64-32>
CORS_ORIGIN=https://etcd-manager.example.com
LOG_LEVEL=error
```

## Binary Deployment

### Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/etcd-manager.git
cd etcd-manager

# Run build script
chmod +x scripts/build.sh
./scripts/build.sh

# Extract release
cd release
tar -xzf etcd-manager-v1.0.0-linux-amd64.tar.gz
cd etcd-manager
```

### Systemd Service

Create `/etc/systemd/system/etcd-manager.service`:

```ini
[Unit]
Description=etcd Manager Web UI
After=network.target

[Service]
Type=simple
User=etcdmgr
WorkingDirectory=/opt/etcd-manager
ExecStart=/opt/etcd-manager/etcd-manager -f /opt/etcd-manager/etcmanager.yaml
Restart=on-failure
RestartSec=5s

Environment=ETCD_MANAGER_SECRET_KEY=<your-key>

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable etcd-manager
sudo systemctl start etcd-manager
sudo systemctl status etcd-manager
```

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name etcd-manager.example.com;

    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Health Checks

```bash
# Check health endpoint
curl http://localhost:8888/health

# Expected response
{"status":"ok","active_connections":2}
```

## Backup and Restore

### Backup Connection Data

```bash
# Docker
docker cp etcd-manager:/app/data/connections.json ./backup/

# Binary
cp /opt/etcd-manager/data/connections.json ./backup/
```

### Restore

```bash
# Docker
docker cp ./backup/connections.json etcd-manager:/app/data/

# Binary
cp ./backup/connections.json /opt/etcd-manager/data/
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs etcd-manager

# Common issues:
# 1. Port 8888 already in use
# 2. Missing secret key
# 3. Volume permission denied
```

### Frontend 404 Errors

Ensure static files are copied:
```bash
docker exec etcd-manager ls -la /app/static
```

### Connection Fails to etcd

```bash
# Test etcd connectivity
docker exec etcd-manager wget -O- http://etcd:2379/health
```

## Production Checklist

Before deploying to production:

- [ ] Generate secure random 32-byte secret key: `openssl rand -base64 32`
- [ ] Set environment variables securely (use secrets management)
- [ ] Configure reverse proxy (Nginx/HAProxy) with HTTPS
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy for `data/connections.json`
- [ ] Test disaster recovery (restore from backup)
- [ ] Enable Docker health checks
- [ ] Configure resource limits (CPU, memory)
- [ ] Set up log aggregation (ELK, Splunk, etc.)

## Scaling Considerations

### Stateless API Server

The etcd-manager API is stateless - all state is stored in `data/connections.json`. You can run multiple instances:

```yaml
services:
  etcd-manager-1:
    # ... configuration ...
    volumes:
      - shared-data:/app/data

  etcd-manager-2:
    # ... configuration ...
    volumes:
      - shared-data:/app/data

volumes:
  shared-data:
    driver: local
```

### Storage

Use a shared file system (NFS, EBS, etc.) for `data/` directory to ensure consistency across multiple instances.

## Security Best Practices

1. **Secret Key Management**
   - Store secret key in secure vault (Vault, AWS Secrets Manager, etc.)
   - Rotate keys periodically
   - Never commit to version control

2. **Network Security**
   - Use HTTPS/TLS in production
   - Restrict API access to trusted networks
   - Use VPN for remote access

3. **Access Control**
   - Run as non-root user (etcdmgr)
   - Restrict file permissions on data directory (mode 0700)
   - Use strong passwords for etcd clusters

4. **Monitoring**
   - Monitor API response times
   - Alert on high error rates
   - Track connection attempts
   - Monitor disk usage for data directory

## Performance Tuning

### API Server

- **Keep-alive**: Enabled (go-zero default)
- **Timeout**: 5s for etcd operations
- **Connection pooling**: Reuses etcd client connections
- **Max requests**: Configure based on load

### Frontend

- **Caching**: Static assets cached by browser
- **Compression**: Gzip enabled (configure in reverse proxy)
- **CDN**: Serve static assets from CDN for geographic distribution

## Rollback Procedure

If deployment fails:

```bash
# Docker
docker-compose down
docker-compose up -d <previous-version>

# Binary
systemctl stop etcd-manager
/opt/etcd-manager-old/etcd-manager -f /opt/etcd-manager-old/etcmanager.yaml &
```

## Version Upgrade

Backward compatibility is maintained between patch versions. Before upgrading:

1. Backup `data/connections.json`
2. Test on staging environment
3. Verify API responses after upgrade
4. Test browser compatibility
