package model

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "encoding/json"
    "errors"
    "fmt"
    "io"
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
    path      string
    secretKey []byte
    mu        sync.RWMutex
    list      []Connection
}

func NewConnectionStore(path string, secretKey []byte) *ConnectionStore {
    cs := &ConnectionStore{
        path:      path,
        secretKey: secretKey,
    }
    _ = cs.load()
    return cs
}

// encrypt encrypts plaintext using AES-256-GCM and returns base64-encoded ciphertext.
func (c *ConnectionStore) encrypt(plaintext string) (string, error) {
    if plaintext == "" {
        return "", nil
    }

    block, err := aes.NewCipher(c.secretKey)
    if err != nil {
        return "", fmt.Errorf("failed to create cipher: %w", err)
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", fmt.Errorf("failed to create GCM: %w", err)
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", fmt.Errorf("failed to generate nonce: %w", err)
    }

    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decrypt decrypts base64-encoded ciphertext using AES-256-GCM.
func (c *ConnectionStore) decrypt(ciphertext string) (string, error) {
    if ciphertext == "" {
        return "", nil
    }

    data, err := base64.StdEncoding.DecodeString(ciphertext)
    if err != nil {
        return "", fmt.Errorf("failed to decode base64: %w", err)
    }

    block, err := aes.NewCipher(c.secretKey)
    if err != nil {
        return "", fmt.Errorf("failed to create cipher: %w", err)
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", fmt.Errorf("failed to create GCM: %w", err)
    }

    nonceSize := gcm.NonceSize()
    if len(data) < nonceSize {
        return "", errors.New("ciphertext too short")
    }

    nonce, encryptedData := data[:nonceSize], data[nonceSize:]
    plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
    if err != nil {
        return "", fmt.Errorf("failed to decrypt: %w", err)
    }

    return string(plaintext), nil
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

    // Decrypt passwords
    for i := range list {
        if list[i].Password != "" {
            decrypted, err := c.decrypt(list[i].Password)
            if err != nil {
                return fmt.Errorf("failed to decrypt password for connection %s: %w", list[i].ID, err)
            }
            list[i].Password = decrypted
        }
    }

    c.list = list
    return nil
}

func (c *ConnectionStore) save() error {
    // Create a copy with encrypted passwords
    encrypted := make([]Connection, len(c.list))
    for i, conn := range c.list {
        encrypted[i] = conn
        if conn.Password != "" {
            encryptedPass, err := c.encrypt(conn.Password)
            if err != nil {
                return fmt.Errorf("failed to encrypt password for connection %s: %w", conn.ID, err)
            }
            encrypted[i].Password = encryptedPass
        }
    }

    // Marshal to JSON
    data, err := json.MarshalIndent(encrypted, "", "  ")
    if err != nil {
        return fmt.Errorf("failed to marshal connections: %w", err)
    }

    // Atomic write: write to temp file then rename
    tmpPath := c.path + ".tmp"
    if err := os.WriteFile(tmpPath, data, 0600); err != nil {
        return fmt.Errorf("failed to write temp file: %w", err)
    }

    // Atomic rename (POSIX guarantees atomicity)
    if err := os.Rename(tmpPath, c.path); err != nil {
        _ = os.Remove(tmpPath) // Clean up temp file on error
        return fmt.Errorf("failed to rename temp file: %w", err)
    }

    return nil
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
            if len(endpoints) > 0 {
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