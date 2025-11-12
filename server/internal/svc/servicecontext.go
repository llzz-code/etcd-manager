package svc

import (
    "path/filepath"

    "etcd-manager/server/internal/config"
    "etcd-manager/server/internal/etcd"
    "etcd-manager/server/internal/model"
)

type ServiceContext struct {
    Config  config.Config
    Store   *model.ConnectionStore
    Manager *etcd.Manager
}

func NewServiceContext(c config.Config) *ServiceContext {
    dataPath := c.DataPath
    if dataPath == "" {
        dataPath = "./data"
    }
    store := model.NewConnectionStore(filepath.Join(dataPath, "connections.json"))
    mgr := etcd.NewManager(store)
    return &ServiceContext{
        Config:  c,
        Store:   store,
        Manager: mgr,
    }
}