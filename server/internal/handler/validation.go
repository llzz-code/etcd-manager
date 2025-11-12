package handler

import (
	"fmt"
	"net/url"
	"strings"
	"unicode/utf8"
)

const (
	maxKeyLength     = 1024      // Maximum key length in characters
	maxValueSize     = 1048576   // Maximum value size: 1MB in bytes
	maxConnectionName = 50        // Maximum connection name length
)

// validateEndpoint validates that the endpoint URL is properly formatted
// and uses http or https scheme
func validateEndpoint(endpoint string) error {
	if endpoint == "" {
		return fmt.Errorf("endpoint cannot be empty")
	}

	// Parse URL to validate format
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return fmt.Errorf("invalid endpoint URL format: %w", err)
	}

	// Check scheme
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("endpoint must use http or https scheme, got: %s", parsed.Scheme)
	}

	// Check host is present
	if parsed.Host == "" {
		return fmt.Errorf("endpoint must include a host")
	}

	return nil
}

// validateKey validates etcd key format
// Keys must start with '/' and not exceed maximum length
func validateKey(key string) error {
	if key == "" {
		return fmt.Errorf("key cannot be empty")
	}

	if !strings.HasPrefix(key, "/") {
		return fmt.Errorf("key must start with '/'")
	}

	// Check length (in runes/characters, not bytes)
	if utf8.RuneCountInString(key) > maxKeyLength {
		return fmt.Errorf("key exceeds maximum length of %d characters", maxKeyLength)
	}

	return nil
}

// validateValue validates etcd value size
// Values must not exceed 1MB
func validateValue(value string) error {
	// Check size in bytes
	size := len(value)
	if size > maxValueSize {
		return fmt.Errorf("value size %d bytes exceeds maximum of %d bytes (1MB)", size, maxValueSize)
	}

	return nil
}

// validateConnectionName validates connection name format
// Names must be non-empty, max 50 characters, and contain only alphanumeric characters, hyphens, and underscores
func validateConnectionName(name string) error {
	if name == "" {
		return fmt.Errorf("connection name cannot be empty")
	}

	// Check length
	nameLen := utf8.RuneCountInString(name)
	if nameLen > maxConnectionName {
		return fmt.Errorf("connection name exceeds maximum length of %d characters", maxConnectionName)
	}

	// Check allowed characters: alphanumeric, hyphen, underscore
	for _, r := range name {
		if !isAlphanumericOrAllowed(r) {
			return fmt.Errorf("connection name contains invalid character '%c', only alphanumeric, '-', and '_' allowed", r)
		}
	}

	return nil
}

// isAlphanumericOrAllowed checks if a rune is alphanumeric, hyphen, or underscore
func isAlphanumericOrAllowed(r rune) bool {
	return (r >= 'a' && r <= 'z') ||
		(r >= 'A' && r <= 'Z') ||
		(r >= '0' && r <= '9') ||
		r == '-' ||
		r == '_'
}
