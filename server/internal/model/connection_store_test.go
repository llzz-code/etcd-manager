package model

import (
    "crypto/rand"
    "encoding/json"
    "os"
    "path/filepath"
    "strings"
    "sync"
    "testing"
    "time"
)

// TestEncryptDecryptRoundTrip verifies encrypt/decrypt round-trip works correctly
func TestEncryptDecryptRoundTrip(t *testing.T) {
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    store := &ConnectionStore{secretKey: secretKey}

    tests := []struct {
        name      string
        plaintext string
    }{
        {"normal password", "mySecretPassword123!"},
        {"empty string", ""},
        {"unicode characters", "密码测试🔐"},
        {"special chars", "p@ssw0rd!#$%^&*()"},
        {"long password", strings.Repeat("a", 1000)},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            encrypted, err := store.encrypt(tt.plaintext)
            if err != nil {
                t.Fatalf("encrypt failed: %v", err)
            }

            if tt.plaintext == "" {
                if encrypted != "" {
                    t.Errorf("expected empty encrypted string for empty input, got %q", encrypted)
                }
                return
            }

            // Verify encrypted is different from plaintext
            if encrypted == tt.plaintext {
                t.Errorf("encrypted text should differ from plaintext")
            }

            // Decrypt
            decrypted, err := store.decrypt(encrypted)
            if err != nil {
                t.Fatalf("decrypt failed: %v", err)
            }

            if decrypted != tt.plaintext {
                t.Errorf("expected %q, got %q", tt.plaintext, decrypted)
            }
        })
    }
}

// TestEncryptDecryptDifferentKeys verifies that different keys produce different ciphertexts
func TestEncryptDecryptDifferentKeys(t *testing.T) {
    key1 := make([]byte, 32)
    key2 := make([]byte, 32)
    rand.Read(key1)
    rand.Read(key2)

    store1 := &ConnectionStore{secretKey: key1}
    store2 := &ConnectionStore{secretKey: key2}

    plaintext := "secret"

    encrypted1, _ := store1.encrypt(plaintext)
    encrypted2, _ := store2.encrypt(plaintext)

    // Different keys should produce different ciphertexts
    if encrypted1 == encrypted2 {
        t.Error("different keys should produce different ciphertexts")
    }

    // Decrypting with wrong key should fail
    _, err := store2.decrypt(encrypted1)
    if err == nil {
        t.Error("expected decryption with wrong key to fail")
    }
}

// TestSaveLoadPreservesData verifies save/load preserves all connection data
func TestSaveLoadPreservesData(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := &ConnectionStore{
        path:      storePath,
        secretKey: secretKey,
    }

    // Add connections
    conn1, _ := store.Add("test1", []string{"localhost:2379"}, "user1", "pass1")
    conn2, _ := store.Add("test2", []string{"localhost:2380", "localhost:2381"}, "user2", "")
    conn3, _ := store.Add("test3", []string{"localhost:2382"}, "", "pass3")

    // Create new store instance (simulates restart)
    store2 := NewConnectionStore(storePath, secretKey)

    // Verify all connections loaded
    list := store2.List()
    if len(list) != 3 {
        t.Fatalf("expected 3 connections, got %d", len(list))
    }

    // Verify connection 1
    found1, ok := store2.Get(conn1.ID)
    if !ok {
        t.Fatal("connection 1 not found")
    }
    if found1.Name != "test1" || found1.Username != "user1" || found1.Password != "pass1" {
        t.Errorf("connection 1 data mismatch: %+v", found1)
    }

    // Verify connection 2 (no password)
    found2, ok := store2.Get(conn2.ID)
    if !ok {
        t.Fatal("connection 2 not found")
    }
    if found2.Name != "test2" || len(found2.Endpoints) != 2 {
        t.Errorf("connection 2 data mismatch: %+v", found2)
    }

    // Verify connection 3 (no username)
    found3, ok := store2.Get(conn3.ID)
    if !ok {
        t.Fatal("connection 3 not found")
    }
    if found3.Password != "pass3" {
        t.Errorf("connection 3 password mismatch")
    }
}

// TestPasswordEncryptedInFile verifies passwords are not stored in plaintext
func TestPasswordEncryptedInFile(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := NewConnectionStore(storePath, secretKey)

    password := "secret123"
    _, err := store.Add("test", []string{"localhost:2379"}, "user", password)
    if err != nil {
        t.Fatalf("failed to add connection: %v", err)
    }

    // Read raw file content
    data, err := os.ReadFile(storePath)
    if err != nil {
        t.Fatalf("failed to read file: %v", err)
    }

    content := string(data)

    // Verify plaintext password is NOT in file
    if strings.Contains(content, password) {
        t.Error("plaintext password found in storage file")
    }

    // Verify file contains base64-encoded data
    var connections []Connection
    if err := json.Unmarshal(data, &connections); err != nil {
        t.Fatalf("failed to parse JSON: %v", err)
    }

    if len(connections) != 1 {
        t.Fatalf("expected 1 connection, got %d", len(connections))
    }

    // Password field should be encrypted (base64-encoded)
    if connections[0].Password == password {
        t.Error("password in file matches plaintext")
    }

    if connections[0].Password == "" {
        t.Error("password field is empty")
    }
}

// TestAtomicWrite verifies atomic write behavior
func TestAtomicWrite(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := NewConnectionStore(storePath, secretKey)

    // Add initial connections
    store.Add("test1", []string{"localhost:2379"}, "", "")
    store.Add("test2", []string{"localhost:2380"}, "", "")

    // Verify temp file is cleaned up after save
    tmpPath := storePath + ".tmp"
    if _, err := os.Stat(tmpPath); !os.IsNotExist(err) {
        t.Error("temp file should not exist after save")
    }

    // Verify original file exists
    if _, err := os.Stat(storePath); err != nil {
        t.Errorf("original file should exist: %v", err)
    }
}

// TestConcurrentAccess verifies thread-safety
func TestConcurrentAccess(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := NewConnectionStore(storePath, secretKey)

    var wg sync.WaitGroup
    numGoroutines := 10
    numOperations := 100

    // Concurrent writes
    wg.Add(numGoroutines)
    for i := 0; i < numGoroutines; i++ {
        go func(id int) {
            defer wg.Done()
            for j := 0; j < numOperations; j++ {
                name := time.Now().String()
                store.Add(name, []string{"localhost:2379"}, "user", "pass")
            }
        }(i)
    }

    // Concurrent reads
    wg.Add(numGoroutines)
    for i := 0; i < numGoroutines; i++ {
        go func() {
            defer wg.Done()
            for j := 0; j < numOperations; j++ {
                store.List()
            }
        }()
    }

    wg.Wait()

    // Verify all connections were saved
    list := store.List()
    expected := numGoroutines * numOperations
    if len(list) != expected {
        t.Errorf("expected %d connections, got %d", expected, len(list))
    }
}

// TestMissingDirectoryCreation verifies auto-creation of data directory
func TestMissingDirectoryCreation(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    // Use nested directory that doesn't exist
    storePath := filepath.Join(tempDir, "nested", "dir", "connections.json")

    store := NewConnectionStore(storePath, secretKey)

    // Add connection
    _, err := store.Add("test", []string{"localhost:2379"}, "", "")
    if err != nil {
        t.Fatalf("failed to add connection: %v", err)
    }

    // Verify directory was created
    if _, err := os.Stat(filepath.Dir(storePath)); err != nil {
        t.Errorf("directory should be auto-created: %v", err)
    }
}

// TestRestartPreservesData verifies data persists across restarts
func TestRestartPreservesData(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")

    // First instance
    store1 := NewConnectionStore(storePath, secretKey)
    conn1, _ := store1.Add("persistent-test", []string{"localhost:2379"}, "admin", "secret")

    // Simulate restart by creating new instance
    store2 := NewConnectionStore(storePath, secretKey)

    found, ok := store2.Get(conn1.ID)
    if !ok {
        t.Fatal("connection not found after restart")
    }

    if found.Name != "persistent-test" || found.Password != "secret" {
        t.Errorf("data mismatch after restart: %+v", found)
    }

    // Update connection
    store2.Update(conn1.ID, "updated-name", nil, "newuser", "newsecret")

    // Third restart
    store3 := NewConnectionStore(storePath, secretKey)
    found3, _ := store3.Get(conn1.ID)

    if found3.Name != "updated-name" || found3.Username != "newuser" || found3.Password != "newsecret" {
        t.Errorf("updated data not preserved: %+v", found3)
    }
}

// TestFilePermissions verifies file is created with secure permissions
func TestFilePermissions(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := NewConnectionStore(storePath, secretKey)

    store.Add("test", []string{"localhost:2379"}, "", "")

    info, err := os.Stat(storePath)
    if err != nil {
        t.Fatalf("failed to stat file: %v", err)
    }

    // Verify file permissions are 0600 (owner read/write only)
    mode := info.Mode().Perm()
    if mode != 0600 {
        t.Errorf("expected file permissions 0600, got %o", mode)
    }
}

// TestCorruptedJSON verifies handling of corrupted JSON
func TestCorruptedJSON(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")

    // Write corrupted JSON
    os.MkdirAll(filepath.Dir(storePath), 0755)
    os.WriteFile(storePath, []byte("{ corrupted json"), 0600)

    // Should fail to load
    store := &ConnectionStore{
        path:      storePath,
        secretKey: secretKey,
    }

    err := store.load()
    if err == nil {
        t.Error("expected error when loading corrupted JSON")
    }
}

// TestDecryptInvalidCiphertext verifies handling of invalid ciphertext
func TestDecryptInvalidCiphertext(t *testing.T) {
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    store := &ConnectionStore{secretKey: secretKey}

    tests := []struct {
        name       string
        ciphertext string
    }{
        {"invalid base64", "not-valid-base64!@#"},
        {"too short", "YWJj"}, // "abc" in base64, too short for GCM
        {"random data", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo="}, // valid base64 but invalid ciphertext
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := store.decrypt(tt.ciphertext)
            if err == nil {
                t.Error("expected decryption to fail for invalid ciphertext")
            }
        })
    }
}

// TestUpdateConnection verifies update preserves encryption
func TestUpdateConnection(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := NewConnectionStore(storePath, secretKey)

    conn, _ := store.Add("test", []string{"localhost:2379"}, "user1", "pass1")

    // Update password
    _, err := store.Update(conn.ID, "", nil, "", "newpass")
    if err != nil {
        t.Fatalf("update failed: %v", err)
    }

    // Verify password is encrypted in file
    data, _ := os.ReadFile(storePath)
    content := string(data)

    if strings.Contains(content, "newpass") {
        t.Error("new password found in plaintext in file")
    }

    // Verify decryption works
    found, _ := store.Get(conn.ID)
    if found.Password != "newpass" {
        t.Errorf("expected password 'newpass', got %q", found.Password)
    }
}

// TestRemoveConnection verifies removal and persistence
func TestRemoveConnection(t *testing.T) {
    tempDir := t.TempDir()
    secretKey := make([]byte, 32)
    rand.Read(secretKey)

    storePath := filepath.Join(tempDir, "connections.json")
    store := NewConnectionStore(storePath, secretKey)

    conn1, _ := store.Add("test1", []string{"localhost:2379"}, "", "")
    conn2, _ := store.Add("test2", []string{"localhost:2380"}, "", "")

    // Remove first connection
    err := store.Remove(conn1.ID)
    if err != nil {
        t.Fatalf("remove failed: %v", err)
    }

    // Verify removed
    _, ok := store.Get(conn1.ID)
    if ok {
        t.Error("connection should be removed")
    }

    // Verify other connection still exists
    _, ok = store.Get(conn2.ID)
    if !ok {
        t.Error("other connection should still exist")
    }

    // Restart and verify persistence
    store2 := NewConnectionStore(storePath, secretKey)
    list := store2.List()

    if len(list) != 1 {
        t.Errorf("expected 1 connection after restart, got %d", len(list))
    }

    if list[0].ID != conn2.ID {
        t.Error("wrong connection persisted")
    }
}
