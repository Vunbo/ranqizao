# 服务器上线检查清单

本清单用于生产环境上线前和首次上线过程中逐项确认。

## 1. 服务器基础检查

- [ ] 服务器时区和时间同步正确。
- [ ] Docker 和 Docker Compose 已安装且可用。
- [ ] 必要目录已经存在，并符合当前部署结构：
  - [ ] `iot-platform-backend-dev/`
  - [ ] `iot-platform-backend-dev/deplay/`
  - [ ] `iot-ops-web-dev/`
- [ ] 域名或公网 IP 已准备好。
- [ ] 如果使用 HTTPS，TLS 证书方案已准备好。

## 2. 选择后端部署模式

- [ ] 只选择一种部署模式：
  - [ ] `deplay/docker-compose.external-db.yml`
  - [ ] `deplay/docker-compose.with-postgres.yml`
- [ ] 如果使用外部 PostgreSQL：
  - [ ] `deplay/backend.env.external-db` 已填写真实配置。
  - [ ] `PGDATABASE` 已存在，或 `PGUSER` 有创建数据库的权限。
- [ ] 如果使用 Docker 内置 PostgreSQL：
  - [ ] `deplay/backend.env.docker-postgres` 已填写真实配置。
  - [ ] `POSTGRES_PASSWORD` 和 `PGPASSWORD` 都已经替换，并且两者一致。

## 3. 后端必填环境变量

- [ ] `JWT_SECRET` 已替换为高强度随机值。
- [ ] `OPS_JWT_SECRET` 已替换为另一个不同的高强度随机值。
- [ ] `OPS_ADMIN_USERNAME` 已设置为生产管理员用户名。
- [ ] `OPS_ADMIN_PASSWORD` 已设置为高强度生产密码。
- [ ] `CORS_ORIGINS` 已设置为准确的前端来源，不是 `*`。
- [ ] `API_HOST=0.0.0.0`。
- [ ] `API_PORT=3001`。

## 4. 第三方登录配置

- [ ] 如果启用微信小程序登录：
  - [ ] `WECHAT_MINI_APP_ID` 已设置。
  - [ ] `WECHAT_MINI_APP_SECRET` 已设置。
- [ ] 如果启用微信 App 登录：
  - [ ] `WECHAT_APP_ID` 已设置。
  - [ ] `WECHAT_APP_SECRET` 已设置。
- [ ] 如果启用 Google App 登录：
  - [ ] `GOOGLE_APP_WEB_CLIENT_ID` 已设置。
- [ ] 服务器出站网络允许 HTTPS 访问：
  - [ ] `api.weixin.qq.com`。
  - [ ] `openidconnect.googleapis.com`。

## 5. 运营后台部署

- [ ] `iot-ops-web-dev/.env` 或构建环境变量已设置：
  - [ ] `VITE_API_BASE_URL=https://your-api-domain/api`。
- [ ] 已在 `iot-ops-web-dev/` 中执行 `npm install`。
- [ ] 已在 `iot-ops-web-dev/` 中执行 `npm run build`。
- [ ] 静态产物 `iot-ops-web-dev/dist/` 已部署到 Web 服务器。
- [ ] 由于运营后台使用 `BrowserRouter`，Web 服务器已配置 SPA 路由回退：
  - [ ] 未命中的路由返回 `index.html`。

## 6. uni-app / 小程序运行配置

- [ ] `iot-uni-app/.env` 同时设置：
  - [ ] `VUE_APP_API_BASE_URL=https://your-api-domain/api`。
  - [ ] `VITE_API_BASE_URL=https://your-api-domain/api`。
- [ ] 真机或小程序配置中没有使用 `localhost`。
- [ ] 如果使用小程序：
  - [ ] 后端域名已加入 request 合法域名。
  - [ ] 生产域名按平台要求使用 HTTPS。
- [ ] 如果使用 App 登录流程：
  - [ ] 微信 App 回调或应用配置与发布包一致。
  - [ ] Google 登录配置与发布包一致。

## 7. 网络和安全

- [ ] 优先只通过 Nginx 或 Caddy 暴露 `80/443`。
- [ ] 如果临时直连后端，只开放 `3001/tcp`。
- [ ] 已检查系统防火墙规则。
- [ ] 已检查云安全组规则。
- [ ] PostgreSQL `5432` 没有对公网暴露，除非确实有必要。
- [ ] 反向代理已将 `/api` 转发到后端 `127.0.0.1:3001`。

## 8. 启动前校验

- [ ] 在项目根目录执行 compose 配置校验：

```bash
docker compose -f deplay/docker-compose.external-db.yml config
docker compose -f deplay/docker-compose.with-postgres.yml config
```

- [ ] 确认不会误启动未选择的部署模式。
- [ ] 确认后端环境变量文件中没有保留占位值。

## 9. 首次启动

- [ ] 在项目根目录启动选定的后端部署栈：

```bash
docker compose -f deplay/docker-compose.external-db.yml up -d --build
```

或：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml up -d --build
```

- [ ] 检查容器状态：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml ps
```

- [ ] 检查后端日志：

```bash
docker compose -f deplay/docker-compose.with-postgres.yml logs -f iot-backend
```

- [ ] 健康接口返回成功：

```bash
curl http://127.0.0.1:3001/api/health
```

## 10. 启动后的安全动作

- [ ] 使用配置好的生产运营管理员账号登录运营后台。
- [ ] 确认没有使用回退账号 `admin / admin`。
- [ ] 确认默认普通用户 `123@test.com` 已禁用、删除或重置密码。
- [ ] 将生产凭据记录到安全的密码管理工具中。

## 11. 功能冒烟测试

- [ ] 运营后台登录正常。
- [ ] 运营首页汇总数据加载正常。
- [ ] 设备列表加载正常。
- [ ] 设备详情页可以打开。
- [ ] 告警页面加载正常。
- [ ] 指令页面加载正常。
- [ ] 用户端 App 可以使用预期登录方式登录。
- [ ] 如果启用小程序，小程序可以登录。
- [ ] 可以新增并绑定设备。
- [ ] 绑定设备后位置信息已保存。
- [ ] 运营首页或设备视图能展示正确的设备位置或分布。

## 12. 位置数据专项验证

- [ ] 从 App 或小程序绑定一台新设备。
- [ ] 确认后端收到 `location` 数据。
- [ ] 确认数据库 `devices.location` 包含：
  - [ ] `latitude`。
  - [ ] `longitude`。
  - [ ] `province`。
  - [ ] `city`。
  - [ ] `district` 或可用地址。
- [ ] 确认运营后台能基于已保存位置展示设备分布。
- [ ] 如果旧设备位置数据不完整，制定一次性补全计划。

## 13. 数据和备份

- [ ] 数据库备份策略已确定。
- [ ] 如果使用 Docker 内置 PostgreSQL，数据卷备份策略已确定。
- [ ] 运营后台构建产物备份方式，或可重复构建路径已确认。
- [ ] 回滚方案已经写明。

## 14. 上线放行条件

- [ ] 没有遗留占位密钥。
- [ ] 没有公开可用的弱默认账号。
- [ ] 健康检查全部通过。
- [ ] 核心登录流程通过。
- [ ] 设备绑定流程通过。
- [ ] 设备位置流程通过。
- [ ] 运营后台可通过公网域名访问。
- [ ] 上线后可以查看监控，或至少可以持续查看日志。
