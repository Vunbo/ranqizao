# 宝塔容器编排部署

## 1. 失败原因

旧编排使用了 `${PGPASSWORD:?...}`。宝塔在创建编排时先解析 Compose 变量，
此时尚未读取服务的 `env_file`，所以容器还没有创建就报
`PGPASSWORD is missing`。

新编排 `compose.yaml`：

- 不使用 `${PGPASSWORD}` 等 Compose 解析期变量。
- 通过绝对路径显式读取后端 `.env.production`。
- PostgreSQL 和后端复用同一组 `PG*` 配置，数据库密码只维护一份。
- 数据库、后端和运维中台统一属于 `ranqizao` 编排。
- PostgreSQL 只在 Docker 内部网络开放，不映射公网端口。
- 后端和运维中台只绑定服务器本机，公网入口由宝塔 Nginx 提供。

## 2. 服务器目录

代码必须保持以下目录结构：

```text
/www/wwwroot/ranqizao/
├── iot-platform-backend-dev/
│   ├── deploy/
│   │   ├── compose.yaml
│   │   ├── production.env.example
│   │   ├── Dockerfile
│   │   └── README.md
│   ├── package.json
│   └── src/
└── iot-ops-web-dev/
    ├── deploy/
    │   ├── Dockerfile
    │   └── nginx.conf
    ├── package.json
    └── src/
```

如果服务器代码不在 `/www/wwwroot/ranqizao`，必须同步修改
`compose.yaml` 顶部的 `backend-context`、`ops-web-context` 和
`production-env`。

## 3. 创建生产配置

先在服务器执行：

```bash
cd /www/wwwroot/ranqizao/iot-platform-backend-dev
cp deploy/production.env.example .env.production
chmod 600 .env.production
vi .env.production
```

必须修改 `CORS_ORIGINS`、两个 JWT 密钥、运维管理员密码和数据库密码。建议分别
执行三次以下命令生成数据库和 JWT 密钥：

```bash
openssl rand -hex 32
```

使用十六进制密钥可以避免 `$`、`#`、引号等字符被环境文件解释。

如果需要华为云 IoTDA、阿里云短信、微信或 Google 登录，继续填写对应参数并将
功能开关改为 `true`。真实 `.env.production` 已被 Git 忽略，不得提交。

然后检查 `compose.yaml` 顶部路径是否与服务器一致：

```yaml
x-deploy-config:
  backend-context: &backend-context /www/wwwroot/ranqizao/iot-platform-backend-dev
  ops-web-context: &ops-web-context /www/wwwroot/ranqizao/iot-ops-web-dev
  production-env: &production-env /www/wwwroot/ranqizao/iot-platform-backend-dev/.env.production
```

创建编排前确认生产配置存在：

```bash
test -s /www/wwwroot/ranqizao/iot-platform-backend-dev/.env.production && echo 配置文件已就绪
```

如果没有输出“配置文件已就绪”，不要在宝塔创建编排。

## 4. 在宝塔创建编排

1. 打开宝塔面板的“Docker”插件。
2. 进入“容器编排”，点击“添加编排”。
3. 编排名称填写 `ranqizao`。
4. 将 `compose.yaml` 的完整内容粘贴到编排内容中。
5. 点击创建并等待镜像构建完成。

新方案使用绝对构建路径和显式 `env_file` 路径，因此不依赖宝塔保存 YAML 的
内部目录，也不要求宝塔自动发现 Compose 默认 `.env`。

创建后应看到：

| 服务 | 状态 | 用途 |
| --- | --- | --- |
| `postgres` | healthy | PostgreSQL 数据库 |
| `iot-backend` | healthy | 后端 API |
| `iot-ops-web` | healthy | 运维中台网页 |

## 5. 配置宝塔网站

在宝塔“网站”中添加运维中台域名并申请 HTTPS 证书，然后添加反向代理：

```text
目标 URL：http://127.0.0.1:8080
发送域名：$host
WebSocket：开启
```

不要再映射 Docker 的 80 或 443 端口，避免与宝塔 Nginx 冲突。

访问关系：

```text
https://你的域名/          -> 运维中台
https://你的域名/api/...   -> 后端 API
```

App 生产 API 地址使用 `https://你的域名/api`。

## 6. 验证和排错

服务器执行：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:8080/api/health
curl https://你的域名/api/health
```

三个请求都应返回包含 `"ok":true` 的 JSON。

查看容器状态和日志：

```bash
docker compose -f /www/wwwroot/ranqizao/iot-platform-backend-dev/deploy/compose.yaml ps
docker compose -f /www/wwwroot/ranqizao/iot-platform-backend-dev/deploy/compose.yaml logs -f iot-backend
docker compose -f /www/wwwroot/ranqizao/iot-platform-backend-dev/deploy/compose.yaml logs -f iot-ops-web
```

如果镜像拉取超时，在宝塔 Docker 设置中配置可用的镜像加速地址后重新构建。

## 7. 更新和备份

更新代码后在宝塔编排中选择重新构建，或执行：

```bash
docker compose -f /www/wwwroot/ranqizao/iot-platform-backend-dev/deploy/compose.yaml up -d --build
```

停止服务但保留数据库：

```bash
docker compose -f /www/wwwroot/ranqizao/iot-platform-backend-dev/deploy/compose.yaml down
```

禁止执行 `down -v`，否则会删除 PostgreSQL 数据卷。备份数据库：

```bash
mkdir -p /www/backup/ranqizao
docker compose -f /www/wwwroot/ranqizao/iot-platform-backend-dev/deploy/compose.yaml \
  exec -T postgres pg_dump -U postgres ai_iot_safety_stove_control \
  > /www/backup/ranqizao/db-$(date +%Y%m%d-%H%M%S).sql
```
