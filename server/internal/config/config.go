package config

import (
    "github.com/zeromicro/go-zero/rest"
)

// Config defines the application configuration.
type Config struct {
    rest.RestConf
    // Path to persist connections data
    DataPath string `json:"dataPath,optional"`
    // Allow CORS origins, comma-separated
    CorsOrigins []string `json:"corsOrigins,optional"`
}