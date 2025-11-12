package handler

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// ErrorResponse represents a structured error response
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// WriteError writes a structured error response with custom code, message, and details
func WriteError(w http.ResponseWriter, code int, message string, details string) {
	resp := ErrorResponse{
		Code:    code,
		Message: message,
		Details: details,
	}
	httpx.WriteJson(w, code, resp)
}

// BadRequest writes a 400 Bad Request error response
func BadRequest(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusBadRequest, message, "")
}

// NotFound writes a 404 Not Found error response
func NotFound(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusNotFound, message, "")
}

// InternalError writes a 500 Internal Server Error response with error details
func InternalError(w http.ResponseWriter, err error) {
	details := ""
	if err != nil {
		details = err.Error()
	}
	WriteError(w, http.StatusInternalServerError, "Internal server error", details)
}
