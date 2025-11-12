package handler

import (
	"strings"
	"testing"
)

func TestValidateEndpoint(t *testing.T) {
	tests := []struct {
		name      string
		endpoint  string
		wantError bool
		errorMsg  string
	}{
		// Valid cases
		{
			name:      "valid http endpoint",
			endpoint:  "http://localhost:2379",
			wantError: false,
		},
		{
			name:      "valid https endpoint",
			endpoint:  "https://etcd.example.com:2379",
			wantError: false,
		},
		{
			name:      "valid endpoint with IP",
			endpoint:  "http://192.168.1.100:2379",
			wantError: false,
		},
		{
			name:      "valid endpoint with path",
			endpoint:  "http://example.com:2379/path",
			wantError: false,
		},
		// Invalid cases
		{
			name:      "empty endpoint",
			endpoint:  "",
			wantError: true,
			errorMsg:  "endpoint cannot be empty",
		},
		{
			name:      "invalid scheme - ftp",
			endpoint:  "ftp://example.com:2379",
			wantError: true,
			errorMsg:  "endpoint must use http or https scheme",
		},
		{
			name:      "missing scheme",
			endpoint:  "example.com:2379",
			wantError: true,
			errorMsg:  "endpoint must use http or https scheme",
		},
		{
			name:      "missing host",
			endpoint:  "http://",
			wantError: true,
			errorMsg:  "endpoint must include a host",
		},
		{
			name:      "invalid URL format",
			endpoint:  "http://[invalid",
			wantError: true,
			errorMsg:  "invalid endpoint URL format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateEndpoint(tt.endpoint)
			if tt.wantError {
				if err == nil {
					t.Errorf("validateEndpoint() expected error but got nil")
					return
				}
				if tt.errorMsg != "" && !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("validateEndpoint() error = %v, want error containing %v", err, tt.errorMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateEndpoint() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestValidateKey(t *testing.T) {
	tests := []struct {
		name      string
		key       string
		wantError bool
		errorMsg  string
	}{
		// Valid cases
		{
			name:      "valid simple key",
			key:       "/config",
			wantError: false,
		},
		{
			name:      "valid nested key",
			key:       "/app/settings/database",
			wantError: false,
		},
		{
			name:      "valid key with special chars",
			key:       "/data/user-123_test",
			wantError: false,
		},
		{
			name:      "valid key at max length",
			key:       "/" + strings.Repeat("a", 1023),
			wantError: false,
		},
		// Invalid cases
		{
			name:      "empty key",
			key:       "",
			wantError: true,
			errorMsg:  "key cannot be empty",
		},
		{
			name:      "key not starting with slash",
			key:       "config",
			wantError: true,
			errorMsg:  "key must start with '/'",
		},
		{
			name:      "key exceeds max length",
			key:       "/" + strings.Repeat("a", 1024),
			wantError: true,
			errorMsg:  "key exceeds maximum length",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateKey(tt.key)
			if tt.wantError {
				if err == nil {
					t.Errorf("validateKey() expected error but got nil")
					return
				}
				if tt.errorMsg != "" && !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("validateKey() error = %v, want error containing %v", err, tt.errorMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateKey() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestValidateValue(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
		errorMsg  string
	}{
		// Valid cases
		{
			name:      "empty value",
			value:     "",
			wantError: false,
		},
		{
			name:      "small value",
			value:     "test value",
			wantError: false,
		},
		{
			name:      "value with JSON",
			value:     `{"key": "value", "number": 123}`,
			wantError: false,
		},
		{
			name:      "value at max size (1MB)",
			value:     strings.Repeat("a", 1048576),
			wantError: false,
		},
		// Invalid cases
		{
			name:      "value exceeds max size",
			value:     strings.Repeat("a", 1048577),
			wantError: true,
			errorMsg:  "value size",
		},
		{
			name:      "large value exceeds max",
			value:     strings.Repeat("test ", 300000), // ~1.4MB
			wantError: true,
			errorMsg:  "exceeds maximum",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateValue(tt.value)
			if tt.wantError {
				if err == nil {
					t.Errorf("validateValue() expected error but got nil")
					return
				}
				if tt.errorMsg != "" && !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("validateValue() error = %v, want error containing %v", err, tt.errorMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateValue() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestValidateConnectionName(t *testing.T) {
	tests := []struct {
		name      string
		connName  string
		wantError bool
		errorMsg  string
	}{
		// Valid cases
		{
			name:      "valid simple name",
			connName:  "prod",
			wantError: false,
		},
		{
			name:      "valid name with hyphen",
			connName:  "prod-etcd",
			wantError: false,
		},
		{
			name:      "valid name with underscore",
			connName:  "prod_cluster_01",
			wantError: false,
		},
		{
			name:      "valid name with numbers",
			connName:  "cluster123",
			wantError: false,
		},
		{
			name:      "valid name mixed case",
			connName:  "Prod-Cluster_01",
			wantError: false,
		},
		{
			name:      "valid name at max length",
			connName:  strings.Repeat("a", 50),
			wantError: false,
		},
		// Invalid cases
		{
			name:      "empty name",
			connName:  "",
			wantError: true,
			errorMsg:  "connection name cannot be empty",
		},
		{
			name:      "name exceeds max length",
			connName:  strings.Repeat("a", 51),
			wantError: true,
			errorMsg:  "exceeds maximum length",
		},
		{
			name:      "name with space",
			connName:  "prod cluster",
			wantError: true,
			errorMsg:  "invalid character",
		},
		{
			name:      "name with special char - dot",
			connName:  "prod.cluster",
			wantError: true,
			errorMsg:  "invalid character",
		},
		{
			name:      "name with special char - slash",
			connName:  "prod/cluster",
			wantError: true,
			errorMsg:  "invalid character",
		},
		{
			name:      "name with special char - at sign",
			connName:  "prod@cluster",
			wantError: true,
			errorMsg:  "invalid character",
		},
		{
			name:      "name with Chinese characters",
			connName:  "生产集群",
			wantError: true,
			errorMsg:  "invalid character",
		},
		{
			name:      "name starting with hyphen",
			connName:  "-prod",
			wantError: false, // Actually valid according to our rules
		},
		{
			name:      "name with emoji",
			connName:  "prod🚀",
			wantError: true,
			errorMsg:  "invalid character",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateConnectionName(tt.connName)
			if tt.wantError {
				if err == nil {
					t.Errorf("validateConnectionName() expected error but got nil")
					return
				}
				if tt.errorMsg != "" && !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("validateConnectionName() error = %v, want error containing %v", err, tt.errorMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateConnectionName() unexpected error = %v", err)
				}
			}
		})
	}
}

// Benchmark tests to ensure validation performance
func BenchmarkValidateEndpoint(b *testing.B) {
	endpoint := "http://localhost:2379"
	for i := 0; i < b.N; i++ {
		_ = validateEndpoint(endpoint)
	}
}

func BenchmarkValidateKey(b *testing.B) {
	key := "/app/config/database/connection"
	for i := 0; i < b.N; i++ {
		_ = validateKey(key)
	}
}

func BenchmarkValidateValue(b *testing.B) {
	value := strings.Repeat("test", 100)
	for i := 0; i < b.N; i++ {
		_ = validateValue(value)
	}
}

func BenchmarkValidateConnectionName(b *testing.B) {
	name := "prod-cluster-01"
	for i := 0; i < b.N; i++ {
		_ = validateConnectionName(name)
	}
}

// Test edge cases for character validation
func TestIsAlphanumericOrAllowed(t *testing.T) {
	tests := []struct {
		name string
		r    rune
		want bool
	}{
		{"lowercase letter", 'a', true},
		{"uppercase letter", 'Z', true},
		{"digit", '5', true},
		{"hyphen", '-', true},
		{"underscore", '_', true},
		{"space", ' ', false},
		{"dot", '.', false},
		{"slash", '/', false},
		{"at sign", '@', false},
		{"Chinese char", '中', false},
		{"emoji", '🚀', false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isAlphanumericOrAllowed(tt.r); got != tt.want {
				t.Errorf("isAlphanumericOrAllowed(%c) = %v, want %v", tt.r, got, tt.want)
			}
		})
	}
}
