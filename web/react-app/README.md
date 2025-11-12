# etcd-manager React Frontend

A modern, production-ready React application for managing etcd clusters with an intuitive UI.

## Features Implemented

### 1. Connection Management
- **Add/Edit/Delete Connections**: Full CRUD operations for etcd connections
- **Real-time Status**: Visual indicators (Connected/Disconnected/Error)
- **Authentication Support**: Optional username/password for secured clusters
- **Multi-endpoint**: Support for multiple etcd endpoints per connection
- **Persistent Storage**: Connections are saved with encrypted passwords

### 2. Explorer (Key-Value Browser)
- **Tree Navigation**: Hierarchical view of etcd keys using `/` delimiter
- **Lazy Loading**: Children nodes load on-demand for performance
- **Monaco Editor**: Professional code editor with syntax highlighting
- **Format Detection**: Auto-detects JSON, YAML, or plain text
- **Unsaved Changes Warning**: Prevents accidental data loss
- **Delete Confirmation**: Safety prompts for destructive operations

### 3. State Management
- **Zustand Stores**: Lightweight and performant state management
- **Connection Store**: Manages connection list and current selection
- **Editor Store**: Handles key content, dirty state, and format

### 4. UI/UX Features
- **Ant Design Components**: Modern, accessible UI components
- **Responsive Layout**: Works on desktop and tablet
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages with toast notifications
- **Empty States**: Helpful placeholders when no data exists

## Tech Stack

- **React 19.2.0**: Latest React with modern hooks
- **TypeScript**: Full type safety across the codebase
- **Ant Design 5.15.0**: Enterprise-class UI components
- **Zustand 4.5.0**: Simple and fast state management
- **Monaco Editor**: VS Code's editor for web
- **Axios**: HTTP client with interceptors
- **React Router 6.22.0**: Client-side routing
- **Vite**: Fast build tool and dev server

## Project Structure

```
src/
├── api/                    # API client layer
│   ├── client.ts          # Axios instance with interceptors
│   ├── connections.ts     # Connection API methods
│   ├── kv.ts              # Key-Value API methods
│   └── index.ts           # Exports
├── components/            # Reusable components
│   ├── Layout/
│   │   ├── Header.tsx     # Top navigation with connection selector
│   │   └── Sidebar.tsx    # Side menu
│   └── ErrorBoundary.tsx  # Error boundary component
├── pages/                 # Route pages
│   ├── Connections/
│   │   ├── index.tsx      # Main connections page
│   │   ├── ConnectionList.tsx  # List with actions
│   │   └── ConnectionForm.tsx  # Add connection form
│   └── Explorer/
│       ├── index.tsx      # Main explorer page
│       ├── TreePanel.tsx  # Tree navigation
│       └── EditorPanel.tsx # Monaco editor
├── store/                 # Zustand state stores
│   ├── connectionStore.ts # Connection management state
│   └── editorStore.ts     # Editor state
├── types/                 # TypeScript type definitions
│   ├── connection.ts      # Connection types
│   └── kv.ts              # Key-Value types
├── utils/                 # Helper functions
│   └── format.ts          # Formatting utilities
├── App.tsx                # Root component with routing
└── main.tsx               # Entry point

```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
cd web/react-app
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Production Build

Build for production:

```bash
npm run build
```

Output will be in `dist/` directory.

### Environment Variables

Create `.env.development` for local development:

```env
VITE_API_BASE_URL=http://localhost:8888/api
```

## API Integration

The frontend integrates with the etcd-manager backend API:

### Connection Endpoints
- `GET /api/connections/list` - List all connections
- `POST /api/connections/add` - Create connection
- `POST /api/connections/update` - Update connection
- `DELETE /api/connections/delete` - Delete connection
- `POST /api/connections/connect` - Connect to etcd
- `POST /api/connections/disconnect` - Disconnect from etcd

### Key-Value Endpoints
- `GET /api/kv/list` - List keys with prefix
- `GET /api/kv` - Get key value
- `POST /api/kv/put` - Create/update key
- `DELETE /api/kv` - Delete key

## Code Quality

### Type Safety
- Full TypeScript coverage
- Strict type checking enabled
- No `any` types in production code

### Error Handling
- API errors caught and displayed via toast notifications
- Validation errors shown inline in forms
- Network errors handled gracefully

### Performance
- Lazy loading for tree nodes
- Optimized re-renders with Zustand selectors
- Code splitting ready (see build warning)

## User Workflows

### Add and Connect to etcd

1. Navigate to "Connections" page
2. Fill in connection details (name, endpoints, optional auth)
3. Click "Create Connection"
4. Click "Connect" button on the new connection
5. Connection status changes to green "Connected"

### Browse and Edit Keys

1. Select a connected connection from the header dropdown
2. Navigate to "Explorer" page
3. Tree displays root-level keys
4. Click folder icon to expand directories
5. Click key to load content in editor
6. Edit content in Monaco editor
7. Click "Save" to persist changes

### Delete a Key

1. Load key in editor
2. Click "Delete" button
3. Confirm deletion in modal
4. Key is removed from tree and etcd

## Known Limitations

- Bundle size is large due to Monaco Editor (~1MB gzipped)
  - Future: Consider code splitting or alternative lightweight editor
- No real-time updates (requires manual refresh)
  - Future: Add WebSocket support for live updates
- No key creation in tree (must use editor)
  - Future: Add context menu with "New Key" option

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Contributing

Please follow the existing code style:
- Use functional components with hooks
- Use Zustand for global state
- Use Ant Design components
- Write TypeScript with strict mode
- Handle errors gracefully
