package handler

import (
    "net/http"
    "os"
    "path/filepath"
)

// SPAHandler serves the Single Page Application
// It serves static files directly and falls back to index.html for SPA routes
func SPAHandler(staticDir string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        path := r.URL.Path

        // Build full file path
        fullPath := filepath.Join(staticDir, path)

        // Check if file exists
        info, err := os.Stat(fullPath)
        if os.IsNotExist(err) || info.IsDir() {
            // File doesn't exist or is a directory, serve index.html for SPA routing
            indexPath := filepath.Join(staticDir, "index.html")
            http.ServeFile(w, r, indexPath)
            return
        }

        // File exists, serve it directly
        http.ServeFile(w, r, fullPath)
    }
}
