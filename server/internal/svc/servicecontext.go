package svc

import (
    "crypto/rand"
    "encoding/base64"
    "os"
    "path/filepath"

    "etcd-manager/server/internal/config"
    "etcd-manager/server/internal/etcd"
    "etcd-manager/server/internal/model"

    "github.com/zeromicro/go-zero/core/logx"
)

type ServiceContext struct {
    Config  config.Config
    Store   *model.ConnectionStore
    Manager *etcd.Manager
}

func NewServiceContext(c config.Config) *ServiceContext {
    dataPath := c.DataPath
    if dataPath == "" {
        dataPath = "./data"
    }

    // Initialize secret key for encryption
    var secretKey []byte
    if c.SecretKey != "" {
        // Use key from config
        decoded, err := base64.StdEncoding.DecodeString(c.SecretKey)
        if err != nil {
            logx.Errorf("Invalid SecretKey in config (must be base64): %v", err)
            logx.Info("Generating new random secret key")
            secretKey = generateSecretKey()
        } else if len(decoded) != 32 {
            logx.Errorf("Invalid SecretKey length (must be 32 bytes, got %d)", len(decoded))
            logx.Info("Generating new random secret key")
            secretKey = generateSecretKey()
        } else {
            secretKey = decoded
            logx.Info("Using secret key from config")
        }
    } else {
        // Try environment variable
        envKey := os.Getenv("ETCD_MANAGER_SECRET_KEY")
        if envKey != "" {
            decoded, err := base64.StdEncoding.DecodeString(envKey)
            if err != nil {
                logx.Errorf("Invalid ETCD_MANAGER_SECRET_KEY (must be base64): %v", err)
                logx.Info("Generating new random secret key")
                secretKey = generateSecretKey()
            } else if len(decoded) != 32 {
                logx.Errorf("Invalid ETCD_MANAGER_SECRET_KEY length (must be 32 bytes, got %d)", len(decoded))
                logx.Info("Generating new random secret key")
                secretKey = generateSecretKey()
            } else {
                secretKey = decoded
                logx.Info("Using secret key from ETCD_MANAGER_SECRET_KEY environment variable")
            }
        } else {
            // Generate random key
            secretKey = generateSecretKey()
            logx.Infof("Generated new secret key: %s", base64.StdEncoding.EncodeToString(secretKey))
            logx.Info("IMPORTANT: Save this key to preserve access to encrypted passwords after restart")
            logx.Info("Set ETCD_MANAGER_SECRET_KEY environment variable or add SecretKey to config")
        }
    }

    store := model.NewConnectionStore(filepath.Join(dataPath, "connections.json"), secretKey)
    mgr := etcd.NewManager(store)

    return &ServiceContext{
        Config:  c,
        Store:   store,
        Manager: mgr,
    }
}

// generateSecretKey generates a random 32-byte key for AES-256
func generateSecretKey() []byte {
    key := make([]byte, 32)
    if _, err := rand.Read(key); err != nil {
        logx.Errorf("Failed to generate random key: %v", err)
        // Fallback to a deterministic key (not recommended for production)
        logx.Error("WARNING: Using fallback deterministic key - NOT SECURE!")
        return []byte("insecure-fallback-key-32bytes!!")
    }
    return key
}