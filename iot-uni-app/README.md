# iot-uni-app

AI 安全灶项目的 uni-app 前端工程。

## 目录结构

```text
.
├─ common/
│  └─ constants/     # 全局常量、存储键
├─ components/       # 可复用 UI 与功能组件
│  └─ app/           # 页面级应用壳层组件
├─ config/           # 运行时配置与环境配置
├─ pages/            # uni-app 页面入口
├─ scripts/          # 本地维护脚本、资源生成脚本
├─ services/
│  ├─ http/          # 通用请求层
│  ├─ remote/        # 真实后端服务模块
│  └─ session/       # 会话持久化相关
└─ static/           # 静态资源
```

## 环境配置

后端地址统一在 `config/runtime.js` 中管理。

读取优先级：

1. `.env` 中的环境变量：`VITE_API_BASE_URL`
2. `.env` 中的环境变量：`VUE_APP_API_BASE_URL`
3. `config/runtime.js` 中的默认值

当前配置文件约定：

- `.env`：前端实际运行配置
- `.env.example`：配置模板

示例：

```env
VITE_API_BASE_URL=http://192.168.1.100:3001/api
VUE_APP_API_BASE_URL=http://192.168.1.100:3001/api
VUE_APP_MINI_PROGRAM_LOGIN_PATH=/auth/mini-program/login
VUE_APP_WECHAT_APP_LOGIN_PATH=/auth/wechat/app/login
VUE_APP_BIND_WECHAT_APP_PATH=/auth/bind/wechat/app
```

注意：

- 真机 `App` 或微信小程序调试时不要使用 `localhost`
- 请改为电脑局域网 IP 或正式域名
- 若未配置 `API_BASE_URL`，前端将直接报错，不再回退到 `localhost`

## 小程序登录接口

微信小程序登录由前端先调用 `uni.login` 获取 `code`，再将 `code` 提交给后端接口换取统一登录态。

前端相关配置：

- `VUE_APP_API_BASE_URL`
- `VUE_APP_MINI_PROGRAM_LOGIN_PATH`

默认接口路径：

```text
/auth/mini-program/login
```

前端最终请求地址：

```text
{VUE_APP_API_BASE_URL}{VUE_APP_MINI_PROGRAM_LOGIN_PATH}
```

例如：

```text
https://api.example.com/api/auth/mini-program/login
```

请求体：

```json
{
  "code": "wx-login-code"
}
```

后端成功响应约定：

```json
{
  "token": "jwt-token",
  "user": {
    "userId": "uuid",
    "uid": "8位短UID",
    "email": "user@example.com",
    "displayName": "用户名",
    "photoURL": null
  }
}
```

## 服务层约束

组件层不要直接请求后端接口。

统一通过 `services/gateway.js` 对外提供应用层调用入口。

内部职责划分如下：

- `services/remote/*`：真实后端请求
- `services/session/*`：会话持久化
- `services/http/*`：底层请求封装

当前工程已移除本地 demo 数据层与前端伪造业务数据逻辑，业务数据统一由后端接口提供。

## 页面结构

`pages/index/index.vue` 只保留 uni-app 页面入口职责，保持尽量轻量。

实际应用壳层逻辑位于：

- `components/app/AppContainer.vue`

这样做的目的是让页面入口文件只负责页面注册与挂载，避免业务状态和交互逻辑全部堆在 page 文件里。

## 业务边界

本项目定位为正式前端：

- 页面展示、交互控制、用户操作流转由前端负责
- 认证、家庭、设备、共享、设备状态与日志等业务数据由后端接口提供
- 前端不再维护本地演示业务数据

当前保留的“扫码绑定设备”仅指前端交互流程的模拟，最终设备数据仍通过后端接口创建和查询。

## 图标资源

`components/ui/AppIcon.vue` 通过读取 `static/icons/` 下的 SVG 文件渲染图标。

如需重新生成图标资源，可执行：

```bash
node scripts/generate-icons.mjs
```
