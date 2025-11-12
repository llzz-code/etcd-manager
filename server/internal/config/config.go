package config

import (
    "github.com/zeromicro/go-zero/rest"
)

// Config defines the application configuration.
type Config struct {
    rest.RestConf
    // Path to persist connections data
    DataPath string `json:"dataPath,omitempty"`
    // Secret key for encrypting passwords (base64-encoded, 32 bytes)
    // If not provided, will be loaded from ETCD_MANAGER_SECRET_KEY env var
    // or auto-generated on first run
    SecretKey string `json:"secretKey,omitempty"`
    // Allow CORS origins, comma-separated
    CorsOrigins []string `json:"corsOrigins,omitempty"`
}