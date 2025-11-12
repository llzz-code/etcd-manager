package handler

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"

	"etcd-manager/server/internal/svc"
)

// HealthCheck handles health check requests
func HealthCheck(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := map[string]interface{}{
			"status": "ok",
		}

		// Add active connections count
		activeCount := svcCtx.Manager.ActiveCount()
		if activeCount > 0 {
			status["active_connections"] = activeCount
		}

		httpx.OkJson(w, status)
	}
}
