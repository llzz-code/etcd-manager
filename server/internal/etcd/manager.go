package etcd

import (
    "context"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"

    "etcd-manager/server/internal/model"
)

type Manager struct {
    store *model.ConnectionStore
    // active clients by connection id
    clients map[string]*clientv3.Client
}

func NewManager(store *model.ConnectionStore) *Manager {
    return &Manager{
        store:   store,
        clients: make(map[string]*clientv3.Client),
    }
}

func (m *Manager) Client(id string) (*clientv3.Client, bool) {
    c, ok := m.clients[id]
    return c, ok
}

func (m *Manager) Connect(id string) error {
    conn, ok := m.store.Get(id)
    if !ok {
        return context.Canceled
    }
    // close existing
    if old, ok := m.clients[id]; ok && old != nil {
        _ = old.Close()
        delete(m.clients, id)
    }
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
    m.clients[id] = cli
    _ = m.store.SetStatus(id, "connected")
    return nil
}

func (m *Manager) Disconnect(id string) error {
    if cli, ok := m.clients[id]; ok && cli != nil {
        _ = cli.Close()
        delete(m.clients, id)
    }
    return m.store.SetStatus(id, "disconnected")
}