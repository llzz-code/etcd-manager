package etcd

import (
    "context"
    "sync"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"

    "etcd-manager/server/internal/model"
)

type Manager struct {
    store *model.ConnectionStore
    // active clients by connection id
    clients map[string]*clientv3.Client
    mu      sync.RWMutex
}

func NewManager(store *model.ConnectionStore) *Manager {
    return &Manager{
        store:   store,
        clients: make(map[string]*clientv3.Client),
    }
}

func (m *Manager) Client(id string) (*clientv3.Client, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    c, ok := m.clients[id]
    return c, ok
}

// ActiveCount returns the number of active etcd connections
func (m *Manager) ActiveCount() int {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return len(m.clients)
}

func (m *Manager) Connect(id string) error {
    conn, ok := m.store.Get(id)
    if !ok {
        return context.Canceled
    }

    m.mu.Lock()
    // close existing
    if old, ok := m.clients[id]; ok && old != nil {
        _ = old.Close()
        delete(m.clients, id)
    }
    m.mu.Unlock()

    cfg := clientv3.Config{
        Endpoints:   conn.Endpoints,
        DialTimeout: 5 * time.Second,
    }
    if conn.Username != "" || conn.Password != "" {
        cfg.Username = conn.Username
        cfg.Password = conn.Password
    }
    cli, err := clientv3.New(cfg)
    if err != nil {
        _ = m.store.SetStatus(id, "error")
        return err
    }
    // quick health check
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()
    _, err = cli.Get(ctx, "__health__")
    if err != nil {
        _ = cli.Close()
        _ = m.store.SetStatus(id, "error")
        return err
    }

    m.mu.Lock()
    m.clients[id] = cli
    m.mu.Unlock()

    _ = m.store.SetStatus(id, "connected")
    return nil
}

func (m *Manager) Disconnect(id string) error {
    m.mu.Lock()
    if cli, ok := m.clients[id]; ok && cli != nil {
        _ = cli.Close()
        delete(m.clients, id)
    }
    m.mu.Unlock()

    return m.store.SetStatus(id, "disconnected")
}