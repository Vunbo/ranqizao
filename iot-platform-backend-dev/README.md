# iot-platform-backend-dev

物联网平台后端服务，面向 App、小程序和运维中台提供统一接口。

## 目录

- `src/app`：应用装配与服务启动
- `src/config`：环境变量与运行时配置读取
- `src/database`：数据库连接、初始化与迁移相关逻辑
- `src/modules`：按业务模块划分的路由与服务
- `src/shared`：跨模块共享能力

## 环境配置

后端统一只保留三套正式环境文件：

- `.env.development`
- `.env.test`
- `.env.production`

`src/config/env.ts` 会按 `NODE_ENV` 读取对应的 `.env.{NODE_ENV}` 文件。

## 启动方式

开发环境：

```bash
npm run dev
```

测试环境：

```bash
npm run start:test
```

生产环境：

```bash
npm run start:prod
```

本地类型检查：

```bash
npm run typecheck
```

## 核心环境变量

- `NODE_ENV`
- `API_HOST` / `API_PORT`
- `CORS_ORIGINS`
- `JWT_SECRET`
- `OPS_JWT_SECRET`
- `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD`
- `PGDATABASE` / `PGADMIN_DATABASE`
- `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET`
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET`
- `GOOGLE_APP_WEB_CLIENT_ID`

## 约束

- 业务代码不得直接读取 `process.env`
- 统一通过 `src/config/env.ts` 获取配置
- 环境切换只通过 `.env.development`、`.env.test`、`.env.production` 完成
