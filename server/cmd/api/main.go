package main

import (
    "flag"
    "fmt"

    "github.com/zeromicro/go-zero/core/conf"
    "github.com/zeromicro/go-zero/rest"

    "etcd-manager/server/internal/config"
    "etcd-manager/server/internal/handler"
    "etcd-manager/server/internal/svc"
)

var configFile = flag.String("f", "etc/etcmanager.yaml", "the config file")

func main() {
    flag.Parse()

    var c config.Config
    conf.MustLoad(*configFile, &c)

    server := rest.MustNewServer(c.RestConf, rest.WithCors())
    defer server.Stop()

    ctx := svc.NewServiceContext(c)
    handler.RegisterHandlers(server, ctx)

    fmt.Printf("Starting server at %s:%d...\n", c.Host, c.Port)
    server.Start()
}