package handler

import (
    "net/http"

    "github.com/zeromicro/go-zero/rest/httpx"

    "etcd-manager/server/internal/svc"
)

type addConnReq struct {
    Name      string   `json:"name"`
    Endpoints []string `json:"endpoints"`
    Username  string   `json:"username,optional"`
    Password  string   `json:"password,optional"`
}

type updateConnReq struct {
    ID        string   `json:"id"`
    Name      string   `json:"name,optional"`
    Endpoints []string `json:"endpoints,optional"`
    Username  string   `json:"username,optional"`
    Password  string   `json:"password,optional"`
}

func listConnections(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        httpx.OkJson(w, ctx.Store.List())
    }
}

func addConnection(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req addConnReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        // Validate connection name
        if err := validateConnectionName(req.Name); err != nil {
            BadRequest(w, err.Error())
            return
        }

        // Validate endpoints
        if len(req.Endpoints) == 0 {
            BadRequest(w, "at least one endpoint is required")
            return
        }
        for _, endpoint := range req.Endpoints {
            if err := validateEndpoint(endpoint); err != nil {
                BadRequest(w, err.Error())
                return
            }
        }

        conn, err := ctx.Store.Add(req.Name, req.Endpoints, req.Username, req.Password)
        if err != nil {
            InternalError(w, err)
            return
        }
        httpx.OkJson(w, conn)
    }
}

func updateConnection(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req updateConnReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        // Validate connection name if provided
        if req.Name != "" {
            if err := validateConnectionName(req.Name); err != nil {
                BadRequest(w, err.Error())
                return
            }
        }

        // Validate endpoints if provided
        if len(req.Endpoints) > 0 {
            for _, endpoint := range req.Endpoints {
                if err := validateEndpoint(endpoint); err != nil {
                    BadRequest(w, err.Error())
                    return
                }
            }
        }

        conn, err := ctx.Store.Update(req.ID, req.Name, req.Endpoints, req.Username, req.Password)
        if err != nil {
            InternalError(w, err)
            return
        }
        httpx.OkJson(w, conn)
    }
}

func deleteConnection(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        id := r.URL.Query().Get("id")
        if id == "" {
            httpx.WriteJson(w, http.StatusBadRequest, map[string]string{"message": "missing id"})
            return
        }
        _ = ctx.Manager.Disconnect(id)
        if err := ctx.Store.Remove(id); err != nil {
            httpx.Error(w, err)
            return
        }
        httpx.Ok(w)
    }
}

func connect(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        id := r.URL.Query().Get("id")
        if id == "" {
            httpx.WriteJson(w, http.StatusBadRequest, map[string]string{"message": "missing id"})
            return
        }
        if err := ctx.Manager.Connect(id); err != nil {
            _ = ctx.Store.SetStatus(id, "error")
            httpx.Error(w, err)
            return
        }
        conn, _ := ctx.Store.Get(id)
        httpx.OkJson(w, conn)
    }
}

func disconnect(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        id := r.URL.Query().Get("id")
        if id == "" {
            httpx.WriteJson(w, http.StatusBadRequest, map[string]string{"message": "missing id"})
            return
        }
        if err := ctx.Manager.Disconnect(id); err != nil {
            httpx.Error(w, err)
            return
        }
        conn, _ := ctx.Store.Get(id)
        httpx.OkJson(w, conn)
    }
}