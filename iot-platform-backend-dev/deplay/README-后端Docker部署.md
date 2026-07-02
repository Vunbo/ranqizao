# iot-platform-backend Docker 部署说明

本文档适用于 `deplay/` 目录下的 Docker 部署文件。

## 服务器目录结构

```text
/srv/ranqizao/
`-- iot-platform-backend-dev/
    |-- deplay/
    |   |-- Dockerfile
    |   |-- Dockerfile.dockerignore
    |   |-- docker-compose.with-postgres.yml
    |   |-- docker-compose.without-postgres.yml
    |   |-- docker-compose.with-postgres-nginx.yml
    |   |-- backend.env.docker-postgres
    |   |-- backend.env.external-db
    |   |-- nginx.conf
    |   |-- nginx.docker.conf
    |   |-- deploy.sh
    |   `-- README-后端Docker部署.md
    |-- package.json
    |-- package-lock.json
    |-- src/
    `-- tsconfig.json
```

请在 `iot-platform-backend-dev` 项目根目录执行本文档中的 `docker compose` 命令。

## 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 后端镜像构建，**默认以生产模式启动**（`npm run start:prod`） |
| `Dockerfile.dockerignore` | 构建时排除 node_modules、本地 .env 文件等 |
| `docker-compose.with-postgres.yml` | 后端 + PostgreSQL 都通过 Docker 启动 |
| `docker-compose.without-postgres.yml` | 仅后端，连接外部 PostgreSQL |
| `docker-compose.with-postgres-nginx.yml` | 后端 + PostgreSQL + Nginx（80 端口） |
| `backend.env.docker-postgres` | 内置 PostgreSQL 模式的环境变量 |
| `backend.env.external-db` | 外部 PostgreSQL 模式的环境变量 |
| `nginx.conf` | 宿主机 Nginx 配置模板（非 Docker） |
| `nginx.docker.conf` | Docker 内部 Nginx 配置（供 compose 使用） |
| `deploy.sh` | 一键部署脚本 |

## 重要启动行为

后端启动时自动执行：

- 如果业务数据库不存在，自动创建数据库。
- 创建表和索引。
- 创建默认普通用户：`123@test.com / admin@123`。
- 创建默认运营后台管理员（由环境变量控制，回退 `admin / admin`）。

## 环境变量说明

### NODE_ENV

两个 `backend.env.*` 文件均已包含 `NODE_ENV=production`，确保 Docker 容器内以生产模式运行（Docker 镜像构建时不会复制 `.env.*` 文件，因此必须通过 `env_file` 注入）。

### 必填项

生产部署前至少修改以下值：

```env
JWT_SECRET=替换为高强度随机字符串
OPS_JWT_SECRET=替换为另一个不同的高强度随机字符串
OPS_ADMIN_USERNAME=生产管理员用户名
OPS_ADMIN_PASSWORD=生产管理员高强度密码
CORS_ORIGINS=具体的前端来源，多个用逗号分隔，不要使用 *
```

### 数据库密码

使用 `docker-postgres` 方案时，`POSTGRES_PASSWORD` 和 `PGPASSWORD` 必须保持一致。

### 第三方登录（可选）

```
WECHAT_MINI_APP_ID=
WECHAT_MINI_APP_SECRET=
WECHAT_APP_ID=
WECHAT_APP_SECRET=
GOOGLE_APP_WEB_CLIENT_ID=
```

## 三种部署模式

```bash
# 模式一：后端 + 内置 PostgreSQL（推荐单机部署）
bash deplay/deploy.sh

# 模式二：后端 + 外部 PostgreSQL（已有云数据库）
bash deplay/deploy.sh --without-postgres

# 模式三：后端 + 内置 PostgreSQL + Nginx（80 端口，方便直接访问）
bash deplay/deploy.sh --with-nginx
```

各模式对应的 compose 文件：

| 命令 | 包含服务 | 适用场景 |
|------|---------|---------|
| `deploy.sh` | postgres + backend | 单机部署，无域名 |
| `deploy.sh --without-postgres` | backend | 已有机房/云数据库 |
| `deploy.sh --with-nginx` | postgres + backend + nginx | 需要 80 端口直连，无域名 |

## 手动启动（不通过 deploy.sh）

## 健康检查

```bash
# 容器状态
docker compose -f deplay/docker-compose.with-postgres.yml ps

# 后端日志
docker compose -f deplay/docker-compose.with-postgres.yml logs -f iot-backend

# 数据库日志
docker compose -f deplay/docker-compose.with-postgres.yml logs -f postgres

# API 健康接口
curl http://127.0.0.1:3001/api/health
# 预期返回：{"ok":true,"database":"...","time":"..."}
```

## Nginx 反向代理（推荐）

后端默认监听 `3001` 端口，生产环境应通过 Nginx 反向代理暴露 `80/443`。

### 临时 IP 访问（无域名）

```bash
# 安装 Nginx
apt install nginx

# 复制配置
cp deplay/nginx.conf /etc/nginx/sites-available/ranqizao
ln -s /etc/nginx/sites-available/ranqizao /etc/nginx/sites-enabled/

# 测试并重载
nginx -t && systemctl reload nginx
```

### 正式域名 + HTTPS

1. 将 `server_name` 改为你的域名
2. 使用 Certbot 申请 Let's Encrypt 证书：

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 运营后台部署

```bash
cd iot-ops-web-dev

# 配置 API 地址
# 编辑 .env.production：
# VITE_API_BASE_URL=https://你的域名/api

# 构建
npm install
npm run build:prod

# 将 dist/ 目录上传到服务器，用 Nginx 托管
# 参考 deplay/nginx.conf 中被注释的 location / 块
```

## uni-app 部署

```bash
cd iot-uni-app

# 编辑 .env.production：
# VITE_API_BASE_URL=https://你的域名/api

# HBuilderX 中发行打包
# 或在 CLI 中构建
```

注意：真机和小程序环境不要使用 `localhost`。微信小程序需将后端域名加入 request 合法域名。

## 首次启动后的安全动作

- [ ] 修改了 `JWT_SECRET`、`OPS_JWT_SECRET` 等所有占位密钥
- [ ] 使用配置的生产管理员账号登录运营后台
- [ ] 确认没有使用回退默认账号 `admin / admin`
- [ ] 禁用或删除默认测试用户 `123@test.com`
- [ ] 将生产凭据记录到密码管理工具

## 数据库备份（推荐）

可添加定时任务每日备份：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点备份
0 3 * * * docker exec iot-postgres pg_dump -U postgres ai_iot_safety_stove_control > /srv/backups/db-$(date +\%Y\%m\%d).sql
```

## 端口说明

| 端口 | 用途 | 建议 |
|------|------|------|
| 80 | HTTP | 开（Nginx） |
| 443 | HTTPS | 开（Nginx） |
| 3001 | API | 不开，Nginx 反代到 127.0.0.1 |
| 5432 | PostgreSQL | 不开（Docker 内部） |
