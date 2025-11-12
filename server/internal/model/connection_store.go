package model

import (
    "encoding/json"
    "errors"
    "os"
    "path/filepath"
    "sync"
    "time"
    "github.com/google/uuid"
)

type Connection struct {
    ID        string   `json:"id"`
    Name      string   `json:"name"`
    Endpoints []string `json:"endpoints"`
    Username  string   `json:"username,omitempty"`
    Password  string   `json:"password,omitempty"`
    Status    string   `json:"status"` // connected, disconnected, error
    UpdatedAt int64    `json:"updatedAt"`
}

type ConnectionStore struct {
    path string
    mu   sync.RWMutex
    list []Connection
}

func NewConnectionStore(path string) *ConnectionStore {
    cs := &ConnectionStore{path: path}
    _ = cs.load()
    return cs
}

func (c *ConnectionStore) load() error {
    c.mu.Lock()
    defer c.mu.Unlock()
    _ = os.MkdirAll(filepath.Dir(c.path), 0o755)
    f, err := os.Open(c.path)
    if err != nil {
        if errors.Is(err, os.ErrNotExist) {
            c.list = []Connection{}
            return c.save()
        }
        return err
    }
    defer f.Close()
    var list []Connection
    if err := json.NewDecoder(f).Decode(&list); err != nil {
        return err
    }
    c.list = list
    return nil
}

func (c *ConnectionStore) save() error {
    tmp := c.list
    f, err := os.Create(c.path)
    if err != nil {
        return err
    }
    defer f.Close()
    enc := json.NewEncoder(f)
    enc.SetIndent("", "  ")
    return enc.Encode(tmp)
}

func (c *ConnectionStore) List() []Connection {
    c.mu.RLock()
    defer c.mu.RUnlock()
    out := make([]Connection, len(c.list))
    copy(out, c.list)
    return out
}

func (c *ConnectionStore) Get(id string) (Connection, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    for _, v := range c.list {
        if v.ID == id {
            return v, true
        }
    }
    return Connection{}, false
}

func (c *ConnectionStore) Add(name string, endpoints []string, username, password string) (Connection, error) {
    c.mu.Lock()
    defer c.mu.Unlock()
    conn := Connection{
        ID:        uuid.NewString(),
        Name:      name,
        Endpoints: endpoints,
        Username:  username,
        Password:  password,
        Status:    "disconnected",
        UpdatedAt: time.Now().Unix(),
    }
    c.list = append(c.list, conn)
    return conn, c.save()
}

func (c *ConnectionStore) Update(id string, name string, endpoints []string, username, password string) (Connection, error) {
    c.mu.Lock()
    defer c.mu.Unlock()
    for i, v := range c.list {
        if v.ID == id {
            if name != "" {
                v.Name = name
            }
            if endpoints != nil && len(endpoints) > 0 {
                v.Endpoints = endpoints
            }
            if username != "" {
                v.Username = username
            }
            if password != "" {
                v.Password = password
            }
            v.UpdatedAt = time.Now().Unix()
            c.list[i] = v
            if err := c.save(); err != nil {
                return Connection{}, err
            }
            return v, nil
        }
    }
    return Connection{}, os.ErrNotExist
}

func (c *ConnectionStore) Remove(id string) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    for i, v := range c.list {
        if v.ID == id {
            c.list = append(c.list[:i], c.list[i+1:]...)
            return c.save()
        }
    }
    return os.ErrNotExist
}

func (c *ConnectionStore) SetStatus(id, status string) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    for i, v := range c.list {
        if v.ID == id {
            v.Status = status
            v.UpdatedAt = time.Now().Unix()
            c.list[i] = v
            return c.save()
        }
    }
    return os.ErrNotExist
}