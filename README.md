# etcd-manager

A lightweight, user-friendly etcd cluster management tool with web UI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Connection Management - Manage multiple etcd clusters with ease
- Tree Browser - Hierarchical visualization of key-value structure
- Monaco Editor - VS Code-like editing experience with syntax highlighting
- Secure Storage - AES-256-GCM encryption for connection passwords
- Docker Ready - One-command deployment with Docker Compose
- Modern UI - Built with React 18 and Ant Design 5

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/etcd-manager.git
cd etcd-manager

# Start the entire stack (etcd + etcd-manager)
docker-compose up -d

# Access the UI
open http://localhost:8888
```

### Binary Deployment

**Prerequisites:**
- Go 1.22+
- Node.js 20+

```bash
# Build
./scripts/build.sh

# Extract release
cd release
tar -xzf etcd-manager-v1.0.0-linux-amd64.tar.gz
cd etcd-manager

# Run
./etcd-manager -f etcmanager.yaml

# Access the UI
open http://localhost:8888
```

## Usage

### 1. Add Connection

1. Navigate to **Connections** page
2. Fill in connection details:
   - Name: `dev-etcd`
   - Endpoints: `http://localhost:2379`
   - Username/Password (optional)
3. Click **Create Connection**

### 2. Connect to etcd

1. Click **Connect** button on the connection card
2. Wait for status badge to turn green

### 3. Browse Keys

1. Navigate to **Explorer** page
2. Select the connection from header dropdown
3. Expand directory tree to browse keys

### 4. Edit Key Values

1. Click on a key in the tree
2. Edit content in Monaco Editor
3. Click **Save** button (Ctrl+S)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ETCD_MANAGER_SECRET_KEY` | Encryption key (base64, 32 bytes) | Auto-generated |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `LOG_LEVEL` | Logging level (info/error) | `info` |
| `DATA_PATH` | Data directory path | `./data` |

### Configuration File

Edit `etc/etcmanager.yaml`:

```yaml
Name: etcd-manager
Host: 0.0.0.0
Port: 8888
DataPath: ./data
SecretKey: <your-32-byte-base64-key>
```

## Architecture

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │ HTTP
┌──────▼──────┐
│  Go-Zero    │
│  API Server │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│etcd │ │ JSON│
│     │ │ File│
└─────┘ └─────┘
```

**Backend:** Go + go-zero
**Frontend:** React 18 + Ant Design 5 + Monaco Editor
**Storage:** Local JSON file with AES-256-GCM encryption

## Development

### Backend

```bash
cd server
go run cmd/api/main.go -f etc/etcmanager.yaml
```

### Frontend

```bash
cd web/react-app
npm install
npm run dev
```

### Run Tests

```bash
# Backend tests
cd server
go test ./... -v

# Frontend tests (future)
cd web/react-app
npm test
```

## Security

- Passwords encrypted at rest (AES-256-GCM)
- Input validation on all endpoints
- CORS protection
- Non-root Docker user
- Secure secret key management

## Roadmap

### v1.5 (Q1 2025)
- [ ] Dark theme
- [ ] Keyboard shortcuts
- [ ] Search/filter keys
- [ ] Operation undo

### v2.0 (Q2 2025)
- [ ] Watch functionality (real-time updates)
- [ ] Batch import/export
- [ ] Operation audit logs
- [ ] Multi-user authentication

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit with structured messages (`/commit-as-prompt`)
4. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [go-zero](https://go-zero.dev/) - Excellent Go microservice framework
- [Ant Design](https://ant.design/) - Beautiful React UI library
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [etcd](https://etcd.io/) - Reliable distributed key-value store
