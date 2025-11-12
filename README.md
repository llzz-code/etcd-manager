# etcd-manager

一个简洁的etcd管理工具，支持：
- 管理etcd连接（新增、修改、删除、连接/断开）
- 目录树样式浏览key-value（按前缀查看）
- 便捷编辑key/value（新增、修改、删除），支持TTL

后端：Go + go-zero
前端：React + Vue（建议采用微前端方式，React作为主应用，Vue用于树形编辑模块）

## 开发

### 后端启动

```bash
cd server
go run ./cmd/api -f etc/etcmanager.yaml
```

默认监听 http://localhost:8888

### API（示例）
- GET /api/connections
- POST /api/connections { name, endpoints[], username?, password? }
- PUT /api/connections { id, name?, endpoints?, username?, password? }
- DELETE /api/connections/:id
- POST /api/connections/:id/connect
- POST /api/connections/:id/disconnect

- GET /api/kv/list?connId=...&prefix=/
- GET /api/kv?connId=...&key=/path/to/key
- PUT /api/kv { connId, key, value, ttl? }
- POST /api/kv { connId, key, value, ttl? }
- DELETE /api/kv/:key?connId=...

## 前端规划
- React主应用：连接管理、搜索、编辑器壳层、布局和主题
- Vue微应用：目录树、键值编辑面板（JSON/YAML/plain），通过qiankun或Web Components嵌入

请确认是否采用“React为主 + Vue微前端”的方式。如果倾向只用一种框架，也可切换为纯React或纯Vue实现。