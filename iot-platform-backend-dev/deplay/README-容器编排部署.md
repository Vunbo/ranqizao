# 宝塔生产环境容器编排部署

本方案只保留一套生产编排，将 PostgreSQL、后端和运维中台统一归入
`ranqizao` 项目：

```text
浏览器/App
    -> 宝塔 Nginx (域名和 HTTPS)
    -> 127.0.0.1:8080
    -> iot-ops-web (静态页面和 /api 反向代理)
    -> iot-backend:3001
    -> postgres:5432
```

宝塔负责公网 80/443、证书和域名；前端容器内的 Nginx 负责 SPA 静态文件和
Docker 网络内的 `/api` 转发，两者职责不同，不要删除前端容器的 Nginx。

## 一、服务器目录

通过宝塔文件管理或 Git 将两个项目放在同一个父目录，并保留以下结构：

```text
/www/wwwroot/ranqizao/
├── iot-platform-backend-dev/
│   ├── deplay/
│   │   ├── docker-compose.production.yml
│   │   ├── backend.env.production.template
│   │   ├── Dockerfile
│   │   ├── .env                         # 服务器创建，不提交 Git
│   │   └── README-容器编排部署.md
│   ├── package.json
│   └── src/
└── iot-ops-web-dev/
    ├── deplay/
    │   ├── Dockerfile
    │   └── nginx.conf
    ├── package.json
    └── src/
```

两个项目必须处于同一个 `ranqizao` 目录下。Compose 使用相对路径构建前端，
任意移动其中一个目录都会导致构建上下文不存在。

## 二、创建生产配置

在宝塔终端执行：

```bash
cd /www/wwwroot/ranqizao/iot-platform-backend-dev/deplay
cp backend.env.production.template .env
chmod 600 .env
vi .env
```

`.env` 同时供 Compose 变量替换和后端容器读取。至少修改：

- `CORS_ORIGINS`：运维中台及需要通过浏览器访问 API 的正式域名，多个域名用逗号分隔。
- `JWT_SECRET`、`OPS_JWT_SECRET`：两个不同的长随机字符串。
- `OPS_ADMIN_USERNAME`、`OPS_ADMIN_PASSWORD`：运维中台管理员账号密码。
- `PGPASSWORD`：PostgreSQL 强密码。
- 已启用功能对应的华为云 IoTDA、微信、Google、阿里云短信参数。

配置值中包含 `$`、`#` 或空格时，使用单引号包住完整值，例如
`PGPASSWORD='your$strong#password'`，避免 Compose 将其中内容当作变量或注释。

生成随机密钥可执行：

```bash
openssl rand -hex 32
```

华为云 IoTDA 开启时将 `HUAWEI_IOTDA_ENABLED=true`，并填写 endpoint、region、
AK、SK 和 project ID。`HUAWEI_IOTDA_CALLBACK_SECRET` 是项目接收 IoTDA 回调时
使用的共享密钥，不是华为云 AK/SK。

## 三、宝塔容器编排

1. 打开宝塔面板的“Docker”或“容器”插件。
2. 进入“容器编排”，选择“添加编排”。
3. 编排名称填写 `ranqizao`。
4. 工作目录选择：
   `/www/wwwroot/ranqizao/iot-platform-backend-dev/deplay`。
5. Compose 文件选择该目录下的 `docker-compose.production.yml`；如果面板要求
   粘贴内容，粘贴此文件完整内容，工作目录仍必须设置为上述目录。
6. 执行“创建并启动”或“构建镜像并启动”。

编排会生成三个服务：

| 服务 | 宿主机端口 | 说明 |
| --- | --- | --- |
| `iot-ops-web` | `127.0.0.1:8080` | 宝塔反向代理入口 |
| `iot-backend` | `127.0.0.1:3001` | 仅用于服务器本机诊断 |
| `postgres` | 不映射 | 只允许 Compose 内部网络访问 |

如宝塔版本没有“工作目录”选项，可在终端执行同一套编排：

```bash
cd /www/wwwroot/ranqizao/iot-platform-backend-dev/deplay
docker compose -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
```

如果拉取 `node`、`nginx` 或 `postgres` 镜像超时，先在宝塔 Docker 设置中配置
可用的镜像加速地址，再重新构建，不要修改业务 Dockerfile 为来历不明的镜像。

## 四、宝塔网站和 HTTPS

在宝塔“网站”中创建正式域名，申请并启用 HTTPS，然后添加反向代理：

```text
代理名称：ranqizao
目标 URL：http://127.0.0.1:8080
发送域名：$host
```

开启 WebSocket 支持。不要在 Compose 中再次映射宿主机 80/443，否则会与宝塔
Nginx 冲突。

运维中台和 API 使用同一域名时：

```text
https://你的域名/          -> 运维中台
https://你的域名/api/...   -> 后端 API
```

手机 App 的生产 API 地址可配置为 `https://你的域名/api`。若 App API 使用独立
域名，应在宝塔为该域名反向代理 `http://127.0.0.1:3001`，并保持接口路径中的
`/api` 不被删除。

## 五、部署验证

在服务器执行：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:8080/api/health
curl https://你的域名/api/health
```

三个请求都应返回 JSON，且 `ok` 为 `true`。在宝塔编排页面确认三个容器状态均为
`healthy`，再测试运维中台登录、设备列表、地图、IoTDA 设备影子和控制命令。

查看日志：

```bash
cd /www/wwwroot/ranqizao/iot-platform-backend-dev/deplay
docker compose -f docker-compose.production.yml logs -f iot-backend
docker compose -f docker-compose.production.yml logs -f iot-ops-web
```

所有容器均已配置日志轮转，单个日志文件最大 10 MB，最多保留 3 个文件。

## 六、更新、停止和备份

拉取新代码后重新构建：

```bash
cd /www/wwwroot/ranqizao/iot-platform-backend-dev/deplay
docker compose -f docker-compose.production.yml up -d --build
```

停止服务但保留数据库：

```bash
docker compose -f docker-compose.production.yml down
```

不要执行 `down -v`，该命令会删除 PostgreSQL 数据卷。数据库备份示例：

```bash
mkdir -p /www/backup/ranqizao
docker compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U postgres ai_iot_safety_stove_control \
  > /www/backup/ranqizao/db-$(date +%Y%m%d-%H%M%S).sql
```

`.env`、数据库密码、AK/SK、短信密钥不得提交 Git或发送到公开位置。仓库中的
`backend.env.production.template` 只能保留字段名和占位值。
