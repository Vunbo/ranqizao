# iot-platform-backend Docker 部署说明

本文档适用于 `deplay` 已经迁移到 `iot-platform-backend-dev` 项目内部后的目录结构。

推荐在服务器上保持以下结构：

```text
/srv/ranqizao/
`-- iot-platform-backend-dev/
    |-- deplay/
    |   |-- Dockerfile
    |   |-- Dockerfile.dockerignore
    |   |-- docker-compose.external-db.yml
    |   |-- docker-compose.with-postgres.yml
    |   |-- backend.env.external-db
    |   `-- backend.env.docker-postgres
    |-- package.json
    |-- package-lock.json
    |-- src/
    `-- tsconfig.json
```

请在 `iot-platform-backend-dev` 项目根目录执行本文档中的 `docker compose` 命令。

如果服务器目录不同，需要同步检查 compose 文件中的这些字段：

- `build.context`
- `build.dockerfile`
- `env_file`

当前 compose 配置为：

```yaml
build:
  context: ..
  dockerfile: deplay/Dockerfile
```

这是因为 compose 文件位于 `iot-platform-backend-dev/deplay/`，后端构建上下文需要指向项目根目录 `iot-platform-backend-dev/`。

## 文件说明

- `Dockerfile`
  后端镜像构建文件。
- `Dockerfile.dockerignore`
  Dockerfile 专用忽略文件，避免把 `node_modules`、本地日志、部署密钥文件等内容发送到 Docker 构建上下文。
- `docker-compose.external-db.yml`
  已有外部 PostgreSQL 时使用。
- `docker-compose.with-postgres.yml`
  后端和 PostgreSQL 都通过 Docker 启动时使用。
- `backend.env.external-db`
  外部 PostgreSQL 模式使用的环境变量文件。
- `backend.env.docker-postgres`
  Docker 内置 PostgreSQL 模式使用的环境变量文件。
- `.dockerignore`
  旧布局下的构建忽略文件。当前 Dockerfile 位于 `deplay/` 内，Docker 会优先使用 `Dockerfile.dockerignore`。

## 重要启动行为

当前后端启动逻辑会自动执行以下操作：

- 如果业务数据库不存在，会尝试创建数据库。
- 创建表和索引。
- 创建默认普通用户：`123@test.com / admin@123`。
- 创建默认运营后台管理员。如果运营后台环境变量缺失，会回退到 `admin / admin`。

生产部署前至少需要完成以下事项：

- 修改 `JWT_SECRET`。
- 修改 `OPS_JWT_SECRET`。
- 修改 `OPS_ADMIN_USERNAME`。
- 修改 `OPS_ADMIN_PASSWORD`。
- 不要使用 `CORS_ORIGINS=*`。
- 首次启动后禁用、删除或重置默认普通用户 `123@test.com`。

## 方案一：使用外部 PostgreSQL

如果服务器上已有 PostgreSQL，或使用云数据库、托管数据库，推荐使用该方案。

### 1. 修改环境变量文件

编辑 `deplay/backend.env.external-db`，重点修改：

```env
CORS_ORIGINS=https://ops.example.com,https://app.example.com
JWT_SECRET=replace-with-a-strong-random-jwt-secret
OPS_JWT_SECRET=replace-with-another-strong-random-ops-jwt-secret
OPS_ADMIN_USERNAME=ops_admin
OPS_ADMIN_PASSWORD=replace-with-a-strong-admin-password
PGHOST=replace-with-your-postgres-host
PGUSER=replace-with-your-postgres-user
PGPASSWORD=replace-with-your-postgres-password
```

### 2. 确认数据库权限

后端启动时会先连接 `PGADMIN_DATABASE`，再检查 `PGDATABASE` 是否存在。

因此需要满足以下任一条件：

- `PGUSER` 有创建数据库的权限。
- 已经手动创建好 `PGDATABASE`。

如果托管 PostgreSQL 账号没有 `CREATE DATABASE` 权限，请先手动创建业务数据库。

### 3. 启动

在 `iot-platform-backend-dev` 项目根目录执行：

```bash
docker compose -f deplay/docker-compose.external-db.yml up -d --build
```

## 方案二：后端和 PostgreSQL 一起运行

如果是单台服务器部署，且 PostgreSQL 不需要对公网暴露，推荐使用该方案。

### 1. 修改环境变量文件

编辑 `deplay/backend.env.docker-postgres`，重点修改：

```env
CORS_ORIGINS=https://ops.example.com,https://app.example.com
JWT_SECRET=replace-with-a-strong-random-jwt-secret
OPS_JWT_SECRET=replace-with-another-strong-random-ops-jwt-secret
OPS_ADMIN_USERNAME=ops_admin
OPS_ADMIN_PASSWORD=replace-with-a-strong-admin-password
POSTGRES_PASSWORD=replace-with-a-strong-postgres-password
PGPASSWORD=replace-with-a-strong-postgres-password
```

注意：`POSTGRES_PASSWORD` 和 `PGPASSWORD` 必须保持一致。

### 2. 启动

在 `iot-platform-backend-dev` 项目根目录执行：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml up -d --build
```

补充说明：

- PostgreSQL 默认不再向宿主机暴露 `5432` 端口。
- 如果确实需要宿主机直连 PostgreSQL，可以临时给 `postgres` 服务添加 `ports: - "5432:5432"`。
- PostgreSQL 已配置健康检查，后端会等待 PostgreSQL 健康后再启动。

## 健康检查

查看容器状态：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml ps
```

或：

```bash
docker compose -f deplay/docker-compose.external-db.yml ps
```

查看后端日志：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml logs -f iot-backend
```

查看数据库日志：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml logs -f postgres
```

检查 API 健康接口：

```bash
curl http://127.0.0.1:3001/api/health
```

## 前端 API 配置

### 运营后台：`iot-ops-web-dev`

```env
VITE_API_BASE_URL=https://api.example.com/api
```

### uni-app / 小程序：`iot-uni-app`

需要同时设置：

```env
VUE_APP_API_BASE_URL=https://api.example.com/api
VITE_API_BASE_URL=https://api.example.com/api
```

注意：

- 真机和小程序环境不要使用 `localhost`。
- 应使用公网域名、公网 IP，或真机可访问的局域网 IP。
- 微信小程序生产环境访问后端时，需要把后端域名加入微信公众平台的 request 合法域名。

## 端口和反向代理

最简单的方式是直接开放 `3001/tcp`，但生产环境更推荐：

- 只开放 `80/443`。
- 使用 Nginx 或 Caddy 反向代理到 `127.0.0.1:3001`。
- 所有前端统一通过一个 HTTPS API 域名访问后端。

如果暂时不使用反向代理，至少需要：

- 在云安全组开放 `3001/tcp`。
- 在系统防火墙开放 `3001/tcp`。

## 如果将 compose 文件复制到项目根目录

如果后续把 compose 文件从 `deplay/` 复制到 `iot-platform-backend-dev` 项目根目录，可以把构建路径简化为：

```yaml
build:
  context: .
  dockerfile: deplay/Dockerfile
env_file:
  - ./deplay/backend.env.external-db
```

或：

```yaml
build:
  context: .
  dockerfile: deplay/Dockerfile
env_file:
  - ./deplay/backend.env.docker-postgres
```
