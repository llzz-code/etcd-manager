package handler

import (
    "net/http"

    "github.com/zeromicro/go-zero/rest"

    "etcd-manager/server/internal/svc"
)

func RegisterHandlers(server *rest.Server, ctx *svc.ServiceContext) {
    // Health check
    server.AddRoute(rest.Route{
        Method:  http.MethodGet,
        Path:    "/health",
        Handler: HealthCheck(ctx),
    })

    // Connections
    server.AddRoute(rest.Route{Method: http.MethodGet, Path: "/api/connections", Handler: listConnections(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPost, Path: "/api/connections", Handler: addConnection(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPut, Path: "/api/connections", Handler: updateConnection(ctx)})
    // Use query param id to avoid path var parsing issues
    server.AddRoute(rest.Route{Method: http.MethodDelete, Path: "/api/connections", Handler: deleteConnection(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPost, Path: "/api/connections/connect", Handler: connect(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPost, Path: "/api/connections/disconnect", Handler: disconnect(ctx)})

    // KV
    server.AddRoute(rest.Route{Method: http.MethodGet, Path: "/api/kv/list", Handler: listKeys(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodGet, Path: "/api/kv", Handler: getKey(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPut, Path: "/api/kv", Handler: putKey(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPost, Path: "/api/kv", Handler: createKey(ctx)})
    // Use query param for key to support keys containing '/'
    server.AddRoute(rest.Route{Method: http.MethodDelete, Path: "/api/kv", Handler: deleteKey(ctx)})
    server.AddRoute(rest.Route{Method: http.MethodPost, Path: "/api/kv/rename", Handler: renameKey(ctx)})

    // Static files (frontend)
    server.AddRoute(rest.Route{
        Method:  http.MethodGet,
        Path:    "/",
        Handler: http.FileServer(http.Dir("static")).ServeHTTP,
    })
}