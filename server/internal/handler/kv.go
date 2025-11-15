package handler

import (
    "fmt"
    "net/http"
    "strings"

    "github.com/zeromicro/go-zero/rest/httpx"
    clientv3 "go.etcd.io/etcd/client/v3"

    "etcd-manager/server/internal/svc"
)

type listReq struct {
    ConnID string `form:"connId"`
    Prefix string `form:"prefix"`
    IncludeTTL bool `form:"includeTTL"`
}

type keyItem struct {
    Key   string `json:"key"`
    Value string `json:"value,omitempty"`
    IsDir bool   `json:"isDir"`
    TTL   int64  `json:"ttl"`
}

type listResp struct {
    Prefix   string    `json:"prefix"`
    Children []keyItem `json:"children"`
}

type getReq struct {
    ConnID string `form:"connId"`
    Key    string `form:"key"`
}

type putReq struct {
    ConnID string `json:"connId"`
    Key    string `json:"key"`
    Value  string `json:"value"`
    TTL    int64  `json:"ttl"`
}

type renameReq struct {
    ConnID string `json:"connId"`
    From   string `json:"from"`
    To     string `json:"to"`
    Overwrite bool   `json:"overwrite"`
}

type batchDeleteReq struct {
    ConnID string   `json:"connId"`
    Keys   []string `json:"keys"`
}

type copyReq struct {
    ConnID string `json:"connId"`
    From   string `json:"from"`
    To     string `json:"to"`
    Overwrite bool `json:"overwrite"`
}

type keyRevision struct {
    Revision    int64  `json:"revision"`
    Value       string `json:"value"`
    ModRevision int64  `json:"modRevision"`
    CreateTime  int64  `json:"createTime"`
    Version     int64  `json:"version"`
}

type getHistoryReq struct {
    ConnID string `form:"connId"`
    Key    string `form:"key"`
    Limit  int    `form:"limit,default=10"`
}

type rollbackReq struct {
    ConnID   string `json:"connId"`
    Key      string `json:"key"`
    Revision int64  `json:"revision"`
}

func listKeys(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req listReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }
        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            httpx.WriteJson(w, http.StatusBadRequest, map[string]string{"message": "invalid connId or not connected"})
            return
        }
        prefix := req.Prefix
        if prefix == "" {
            prefix = "/"
        }
        if !strings.HasSuffix(prefix, "/") {
            prefix += "/"
        }
        resp, err := cli.Get(r.Context(), prefix, clientv3.WithPrefix())
        if err != nil {
            httpx.Error(w, err)
            return
        }
        // Build immediate children map
        type child struct{
            isDir bool
            value string
            lease int64
        }
        children := map[string]child{}
        for _, kv := range resp.Kvs {
            k := string(kv.Key)
            if !strings.HasPrefix(k, prefix) {
                continue
            }
            remain := strings.TrimPrefix(k, prefix)
            seg := remain
            if idx := strings.Index(remain, "/"); idx >= 0 {
                seg = remain[:idx]
            }
            // If the remain contains '/', then seg is a dir
            isDir := strings.Contains(remain, "/")
            v := ""
            if !isDir {
                v = string(kv.Value)
            }
            children[seg] = child{isDir: isDir, value: v, lease: int64(kv.Lease)}
        }
        out := make([]keyItem, 0, len(children))
        for name, c := range children {
            ttl := int64(0)
            if req.IncludeTTL && !c.isDir && c.lease > 0 {
                lt, err := cli.TimeToLive(r.Context(), clientv3.LeaseID(c.lease))
                if err == nil && lt.TTL > 0 {
                    ttl = lt.TTL
                }
            }
            ki := keyItem{
                Key:   prefix + name,
                Value: c.value,
                IsDir: c.isDir,
                TTL:   ttl,
            }
            out = append(out, ki)
        }
        httpx.OkJson(w, listResp{Prefix: prefix, Children: out})
    }
}

func getKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req getReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }
        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            httpx.WriteJson(w, http.StatusBadRequest, map[string]string{"message": "invalid connId or not connected"})
            return
        }
        resp, err := cli.Get(r.Context(), req.Key)
        if err != nil {
            httpx.Error(w, err)
            return
        }
        if len(resp.Kvs) == 0 {
            httpx.WriteJson(w, http.StatusNotFound, map[string]string{"message": "key not found"})
            return
        }
        // Try to fetch TTL from lease if present
        ttl := int64(0)
        if resp.Kvs[0].Lease > 0 {
            lt, err := cli.TimeToLive(r.Context(), clientv3.LeaseID(resp.Kvs[0].Lease))
            if err == nil && lt.TTL > 0 {
                ttl = lt.TTL
            }
        }
        httpx.OkJson(w, keyItem{Key: req.Key, Value: string(resp.Kvs[0].Value), IsDir: false, TTL: ttl})
    }
}

func putKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req putReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        // Validate key format
        if err := validateKey(req.Key); err != nil {
            BadRequest(w, err.Error())
            return
        }

        // Validate value size
        if err := validateValue(req.Value); err != nil {
            BadRequest(w, err.Error())
            return
        }

        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }
        // handle TTL by lease
        var opts []clientv3.OpOption
        if req.TTL > 0 {
            lr, err := cli.Grant(r.Context(), req.TTL)
            if err != nil {
                InternalError(w, err)
                return
            }
            opts = append(opts, clientv3.WithLease(lr.ID))
        }
        _, err := cli.Put(r.Context(), req.Key, req.Value, opts...)
        if err != nil {
            InternalError(w, err)
            return
        }
        httpx.Ok(w)
    }
}

func createKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req putReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        // Validate key format
        if err := validateKey(req.Key); err != nil {
            BadRequest(w, err.Error())
            return
        }

        // Validate value size
        if err := validateValue(req.Value); err != nil {
            BadRequest(w, err.Error())
            return
        }

        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }

        // Use transaction to ensure key does not exist
        cmps := []clientv3.Cmp{
            clientv3.Compare(clientv3.CreateRevision(req.Key), "=", 0),
        }

        var opts []clientv3.OpOption
        if req.TTL > 0 {
            lr, err := cli.Grant(r.Context(), req.TTL)
            if err != nil {
                InternalError(w, err)
                return
            }
            opts = append(opts, clientv3.WithLease(lr.ID))
        }

        txn := cli.Txn(r.Context()).If(cmps...).Then(
            clientv3.OpPut(req.Key, req.Value, opts...),
        )
        tResp, err := txn.Commit()
        if err != nil {
            InternalError(w, err)
            return
        }

        if !tResp.Succeeded {
            httpx.WriteJson(w, http.StatusConflict, map[string]string{"message": "key already exists"})
            return
        }

        httpx.Ok(w)
    }
}

func deleteKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Use query param to allow keys with '/'
        key := r.URL.Query().Get("key")
        connID := r.URL.Query().Get("connId")

        // Validate key format
        if key == "" {
            BadRequest(w, "key parameter is required")
            return
        }
        if err := validateKey(key); err != nil {
            BadRequest(w, err.Error())
            return
        }

        cli, ok := ctx.Manager.Client(connID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }
        _, err := cli.Delete(r.Context(), key)
        if err != nil {
            InternalError(w, err)
            return
        }
        httpx.Ok(w)
    }
}

func renameKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req renameReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }
        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            httpx.WriteJson(w, http.StatusBadRequest, map[string]string{"message": "invalid connId or not connected"})
            return
        }
        // Prefetch source for value and lease
        gr, err := cli.Get(r.Context(), req.From)
        if err != nil {
            httpx.Error(w, err)
            return
        }
        if len(gr.Kvs) == 0 {
            httpx.WriteJson(w, http.StatusNotFound, map[string]string{"message": "source key not found"})
            return
        }
        kv := gr.Kvs[0]
        val := string(kv.Value)

        var putOpts []clientv3.OpOption
        if kv.Lease > 0 {
            putOpts = append(putOpts, clientv3.WithLease(clientv3.LeaseID(kv.Lease)))
        }
        // Atomic Txn: source must exist; destination must not exist unless overwrite
        cmps := []clientv3.Cmp{clientv3.Compare(clientv3.CreateRevision(req.From), ">", 0)}
        if !req.Overwrite {
            cmps = append(cmps, clientv3.Compare(clientv3.CreateRevision(req.To), "=", 0))
        }
        txn := cli.Txn(r.Context()).If(cmps...).Then(
            clientv3.OpPut(req.To, val, putOpts...),
            clientv3.OpDelete(req.From),
        )
        tResp, err := txn.Commit()
        if err != nil {
            httpx.Error(w, err)
            return
        }
        if !tResp.Succeeded {
            msg := "destination exists"
            if req.Overwrite {
                msg = "source missing or conflict"
            }
            httpx.WriteJson(w, http.StatusConflict, map[string]string{"message": msg})
            return
        }
        httpx.Ok(w)
    }
}

func batchDeleteKeys(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req batchDeleteReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        if len(req.Keys) == 0 {
            BadRequest(w, "keys array is required and cannot be empty")
            return
        }

        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }

        // Build transaction with all delete operations
        var ops []clientv3.Op
        for _, key := range req.Keys {
            if err := validateKey(key); err != nil {
                BadRequest(w, "invalid key: "+key)
                return
            }
            ops = append(ops, clientv3.OpDelete(key))
        }

        // Execute all deletes in a transaction (atomic)
        txn := cli.Txn(r.Context()).Then(ops...)
        _, err := txn.Commit()
        if err != nil {
            InternalError(w, err)
            return
        }

        httpx.OkJson(w, map[string]int{"deleted": len(req.Keys)})
    }
}

func copyKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req copyReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        if err := validateKey(req.From); err != nil {
            BadRequest(w, "invalid source key: "+err.Error())
            return
        }
        if err := validateKey(req.To); err != nil {
            BadRequest(w, "invalid destination key: "+err.Error())
            return
        }

        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }

        // Fetch source key
        gr, err := cli.Get(r.Context(), req.From)
        if err != nil {
            InternalError(w, err)
            return
        }
        if len(gr.Kvs) == 0 {
            httpx.WriteJson(w, http.StatusNotFound, map[string]string{"message": "source key not found"})
            return
        }

        kv := gr.Kvs[0]
        val := string(kv.Value)

        var putOpts []clientv3.OpOption
        if kv.Lease > 0 {
            putOpts = append(putOpts, clientv3.WithLease(clientv3.LeaseID(kv.Lease)))
        }

        // Atomic copy: destination must not exist unless overwrite is true
        cmps := []clientv3.Cmp{clientv3.Compare(clientv3.CreateRevision(req.From), ">", 0)}
        if !req.Overwrite {
            cmps = append(cmps, clientv3.Compare(clientv3.CreateRevision(req.To), "=", 0))
        }

        txn := cli.Txn(r.Context()).If(cmps...).Then(
            clientv3.OpPut(req.To, val, putOpts...),
        )
        tResp, err := txn.Commit()
        if err != nil {
            InternalError(w, err)
            return
        }

        if !tResp.Succeeded {
            msg := "destination exists"
            if req.Overwrite {
                msg = "source missing"
            }
            httpx.WriteJson(w, http.StatusConflict, map[string]string{"message": msg})
            return
        }

        httpx.Ok(w)
    }
}

func getKeyHistory(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req getHistoryReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        if req.Limit <= 0 || req.Limit > 100 {
            req.Limit = 10
        }

        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }

        // Get current key to find latest revision
        currentResp, err := cli.Get(r.Context(), req.Key)
        if err != nil {
            InternalError(w, err)
            return
        }
        if len(currentResp.Kvs) == 0 {
            httpx.WriteJson(w, http.StatusNotFound, map[string]string{"message": "key not found"})
            return
        }

        currentKv := currentResp.Kvs[0]
        currentRev := currentKv.ModRevision

        // Collect history by querying past revisions
        var history []keyRevision
        history = append(history, keyRevision{
            Revision:    currentRev,
            Value:       string(currentKv.Value),
            ModRevision: currentKv.ModRevision,
            CreateTime:  currentKv.CreateRevision,
            Version:     currentKv.Version,
        })

        // Try to fetch older revisions (may fail if compacted)
        for i := 1; i < req.Limit; i++ {
            rev := currentRev - int64(i)
            if rev < currentKv.CreateRevision {
                break
            }

            resp, err := cli.Get(r.Context(), req.Key, clientv3.WithRev(rev))
            if err != nil || len(resp.Kvs) == 0 {
                // Likely compacted or key didn't exist at this revision
                continue
            }

            kv := resp.Kvs[0]
            // Only add if value actually changed
            if len(history) == 0 || string(kv.Value) != history[len(history)-1].Value {
                history = append(history, keyRevision{
                    Revision:    rev,
                    Value:       string(kv.Value),
                    ModRevision: kv.ModRevision,
                    CreateTime:  kv.CreateRevision,
                    Version:     kv.Version,
                })
            }
        }

        httpx.OkJson(w, map[string]interface{}{
            "key":     req.Key,
            "history": history,
            "note":    "history may be incomplete if etcd has compacted old revisions",
        })
    }
}

func rollbackKey(ctx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req rollbackReq
        if err := httpx.Parse(r, &req); err != nil {
            httpx.Error(w, err)
            return
        }

        if err := validateKey(req.Key); err != nil {
            BadRequest(w, err.Error())
            return
        }

        cli, ok := ctx.Manager.Client(req.ConnID)
        if !ok {
            BadRequest(w, "invalid connId or not connected")
            return
        }

        // Fetch value at the specified revision
        resp, err := cli.Get(r.Context(), req.Key, clientv3.WithRev(req.Revision))
        if err != nil {
            InternalError(w, err)
            return
        }
        if len(resp.Kvs) == 0 {
            httpx.WriteJson(w, http.StatusNotFound, map[string]string{
                "message": "key not found at specified revision (may be compacted)",
            })
            return
        }

        oldValue := string(resp.Kvs[0].Value)

        // Write the old value as a new version (this is not a true rollback, but creates new revision)
        _, err = cli.Put(r.Context(), req.Key, oldValue)
        if err != nil {
            InternalError(w, err)
            return
        }

        httpx.OkJson(w, map[string]string{
            "message": "successfully rolled back to revision",
            "revision": fmt.Sprintf("%d", req.Revision),
            "value":   oldValue,
        })
    }
}