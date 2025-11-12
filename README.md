# etcd-manager

一个轻量级、用户友好的 etcd 集群管理工具，带有 Web UI。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- 连接管理 - 轻松管理多个 etcd 集群
- 树形浏览 - 层次化展示键值结构
- Monaco 编辑器 - 类似 VS Code 的编辑体验，支持语法高亮
- 安全存储 - 使用 AES-256-GCM 加密保存连接密码
- Docker 部署 - 使用 Docker Compose 一键部署
- 现代 UI - 基于 React 18 和 Ant Design 5 构建
- 响应式布局 - 支持不同屏幕尺寸自适应

## 快速开始

### 使用 Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/yourusername/etcd-manager.git
cd etcd-manager

# 启动完整服务栈（etcd + etcd-manager）
docker-compose up -d

# 访问 Web UI
open http://localhost:8888
```

### 二进制部署

**前置要求：**
- Go 1.22+
- Node.js 20+

```bash
# 构建
./scripts/build.sh

# 解压发布包
cd release
tar -xzf etcd-manager-v1.0.0-linux-amd64.tar.gz
cd etcd-manager

# 运行
./etcd-manager -f etcmanager.yaml

# 访问 Web UI
open http://localhost:8888
```

## 使用说明

### 1. 添加连接

1. 进入 **Connections** 页面
2. 填写连接信息:
   - Name: `dev-etcd`
   - Endpoints: `http://localhost:2379`
   - Username/Password (可选)
3. 点击 **Create Connection** 按钮

### 2. 连接到 etcd

1. 点击连接卡片上的 **Connect** 按钮
2. 等待状态徽章变为绿色

### 3. 浏览键值

1. 导航到 **Explorer** 页面
2. 从顶部下拉菜单选择连接
3. 展开目录树浏览键值

### 4. 编辑键值

1. 在树中点击一个键
2. 在 Monaco 编辑器中编辑内容
3. 点击 **Save** 按钮（或按 Ctrl+S）

## 配置

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ETCD_MANAGER_SECRET_KEY` | 加密密钥（base64，32字节） | 自动生成 |
| `CORS_ORIGIN` | 允许的 CORS 来源 | `*` |
| `LOG_LEVEL` | 日志级别（info/error） | `info` |
| `DATA_PATH` | 数据目录路径 | `./data` |

### 配置文件

编辑 `etc/etcmanager.yaml`：

```yaml
Name: etcd-manager
Host: 0.0.0.0
Port: 8888
DataPath: ./data
SecretKey: <你的32字节base64密钥>
```

## 架构

```
┌─────────────┐
│   浏览器     │
│  (React UI) │
└──────┬──────┘
       │ HTTP
┌──────▼──────┐
│  Go-Zero    │
│  API 服务器  │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│etcd │ │ JSON│
│     │ │ 文件 │
└─────┘ └─────┘
```

**后端：** Go + go-zero
**前端：** React 18 + Ant Design 5 + Monaco Editor
**存储：** 本地 JSON 文件（AES-256-GCM 加密）

## 开发

### 后端

```bash
cd server
go run cmd/api/main.go -f etc/etcmanager.yaml
```

### 前端

```bash
cd web/react-app
npm install
npm run dev
```

### 运行测试

```bash
# 后端测试
cd server
go test ./... -v

# 前端测试（待完成）
cd web/react-app
npm test
```

## 安全性

- 密码静态加密存储（AES-256-GCM）
- 所有端点的输入验证
- CORS 保护
- 非 root 用户运行 Docker 容器
- 安全的密钥管理

## 开发路线图

### v1.5 (2025 Q1)
- [ ] 暗色主题
- [ ] 快捷键支持
- [ ] 搜索/过滤键值
- [ ] 操作撤销

### v2.0 (2025 Q2)
- [ ] Watch 功能（实时更新）
- [ ] 批量导入/导出
- [ ] 操作审计日志
- [ ] 多用户认证

## 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支
3. 提交 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [go-zero](https://go-zero.dev/) - 优秀的 Go 微服务框架
- [Ant Design](https://ant.design/) - 漂亮的 React UI 库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 强大的代码编辑器
- [etcd](https://etcd.io/) - 可靠的分布式键值存储
