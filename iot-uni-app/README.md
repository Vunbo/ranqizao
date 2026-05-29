# iot-uni-app

AI 安全灶 uni-app 前端工程。

## 当前结构

- `pages/`：uni-app 页面入口
- `components/`：当前业务与通用组件
- `services/`：请求、远端服务与会话能力
- `config/`：运行时配置入口
- `static/`：静态资源

## 环境配置

uni-app 统一只保留三套正式环境文件：

- `.env.development`
- `.env.test`
- `.env.production`

当前运行时配置统一由 `config/runtime.js` 读取，优先级如下：

1. `VITE_*`
2. `VUE_APP_*`

关键变量：

- `VITE_API_BASE_URL`
- `VUE_APP_API_BASE_URL`
- `VITE_MINI_PROGRAM_LOGIN_PATH`
- `VITE_WECHAT_APP_LOGIN_PATH`
- `VITE_BIND_WECHAT_APP_PATH`
- `VITE_GOOGLE_APP_LOGIN_PATH`
- `VITE_BIND_GOOGLE_APP_PATH`

## 约束

- 真机调试不要使用 `localhost`
- 统一通过 `config/runtime.js` 读取环境配置
- 页面与组件中禁止写死 API 地址

## 运行与发布

开发环境：

- 使用 HBuilderX 运行到浏览器、模拟器或真机
- 真机请使用局域网 IP、测试域名或可访问的公网地址

测试环境：

- 测试包读取 `.env.test`

生产环境：

- 正式发布读取 `.env.production`
