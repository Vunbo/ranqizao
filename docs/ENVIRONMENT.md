# Environment Plan

## 目标

三个项目统一使用开发、测试、生产三套环境：

- `development`
- `test`
- `production`

## 项目与环境文件

### iot-platform-backend-dev

- `.env.development`
- `.env.test`
- `.env.production`

读取入口：

- `src/config/env.ts`

### iot-uni-app

- `.env.development`
- `.env.test`
- `.env.production`

读取入口：

- `config/runtime.js`

### iot-ops-web-dev

- `.env.development`
- `.env.test`
- `.env.production`

读取入口：

- `src/lib/runtime.ts`

## 推荐环境映射

### 开发环境

- Backend API：`http://本机局域网IP:3001/api`
- Ops Web：本地 `vite` 开发服务器
- Uni App：HBuilderX 真机调试

### 测试环境

- Backend API：`https://test-api.example.com/api`
- Ops Web：`https://test-ops.example.com`
- Uni App：测试包 / 体验版

### 生产环境

- Backend API：`https://api.example.com/api`
- Ops Web：`https://ops.example.com`
- Uni App：正式包 / 正式小程序

## 执行约束

- 不允许在业务代码中直接读取环境变量
- 不允许在页面、组件、服务中写死 API 地址
- 环境差异统一在配置入口层处理
