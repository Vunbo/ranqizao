# iot-platform-backend-dev

物联网平台后端 MVP 开发项目，为 App、小程序与运维中台提供统一接口。

- 当前采用 Express + PostgreSQL
- 保持前后端分离，聚焦认证、设备、家庭、共享等核心业务接口
- 配置集中收敛到 `src/config/env.ts`，当前统一从根目录 `.env.example` 读取

## 配置方式

后端当前只读取项目根目录下的：

- `.env.example`

不再区分开发 / 生产 / 本地多套环境示例文件。

核心配置项说明：

- `API_PORT`：后端服务端口
- `CORS_ORIGINS`：允许访问的前端来源，多个地址用英文逗号分隔
- `JWT_SECRET`：登录态签名密钥
- `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD`：数据库连接信息
- `PGDATABASE`：业务数据库名称
- `PGADMIN_DATABASE`：建库时连接的管理库名称，通常是 `postgres`
- `WECHAT_MINI_APP_ID`：微信小程序 AppID
- `WECHAT_MINI_APP_SECRET`：微信小程序 AppSecret

## 小程序登录接口约定

后端已提供微信小程序登录接口：

```text
POST /auth/mini-program/login
```

请求体：

```json
{
  "code": "wx-login-code"
}
```

成功响应：

```json
{
  "token": "jwt-token",
  "user": {
    "userId": "uuid",
    "uid": "8位短UID",
    "email": "wx_xxx@mini-program.local",
    "displayName": "微信用户xxxx",
    "photoURL": null
  }
}
```

说明：

- 前端先调用 `uni.login` 获取 `code`
- 后端调用微信 `jscode2session`
- 后端按 `openid / unionid` 查找或创建用户
- 后端最终返回与邮箱登录一致的 `token + user` 结构

部署前必须配置：

- `WECHAT_MINI_APP_ID`
- `WECHAT_MINI_APP_SECRET`

如果未配置这两个环境变量，小程序登录接口会返回服务不可用错误。

## 手机号验证码说明

当前后端已提供：

- `POST /auth/phone/send-code`
- `POST /auth/phone/login`
- `POST /auth/bind/phone/send-code`
- `POST /auth/bind/phone`

当前实现状态：

- 开发环境下会在服务端日志输出验证码
- 开发环境接口响应会返回 `debugCode` 方便联调
- 生产环境下不会返回 `debugCode`

注意：

- 当前代码已完成手机号验证码登录/绑定的业务链路与数据结构
- 但生产环境短信下发通道仍需接入正式短信服务商

## 设备扫码绑定接口约定

后端已预留正式的设备扫码绑定接口，前端当前可以继续保留模拟扫码流程，后续联调时直接切换到以下接口：

### 1. 扫码识别设备

```text
POST /api/devices/bind/scan
```

请求体：

```json
{
  "qrCode": "STOVE-QR-001"
}
```

响应示例：

```json
{
  "bindStatus": "available",
  "inventory": {
    "id": "inventory-id",
    "qrCode": "STOVE-QR-001",
    "serialNumber": "SN-AI-STOVE-001",
    "productModel": "AI 安全灶 Pro",
    "firmwareVersion": "1.0.0",
    "status": "available"
  }
}
```

`bindStatus` 可能取值：

- `available`：可绑定
- `already_bound`：已被其他账号绑定
- `already_bound_to_current_user`：已被当前账号绑定

### 2. 提交绑定设备

```text
POST /api/devices/bind
```

请求体：

```json
{
  "qrCode": "STOVE-QR-001",
  "name": "厨房主灶",
  "location": {
    "latitude": 31.2304,
    "longitude": 121.4737,
    "address": "上海市黄浦区"
  },
  "wifiSsid": "Home-WiFi"
}
```

说明：

- 当前后端会完成绑定关系落库
- `wifiSsid` 当前仅作接口预留字段，后续可扩展配网审计或设备激活流程
- 绑定流程使用数据库事务，确保设备记录、库存状态、绑定审计日志同时成功或同时回滚
- 设备删除时会自动释放库存状态回到 `available`，并写入解绑审计日志

## 目录说明

- `src/app`：应用装配与服务启动
- `src/config`：环境变量读取与运行配置整理
- `src/database`：数据库连接、建库建表、默认种子数据
- `src/modules/auth`：邮箱注册登录、微信小程序登录、获取当前用户
- `src/modules/devices`：设备列表、编辑、日志、共享
- `src/modules/homes`：家庭列表、成员管理、设备关联
- `src/shared`：鉴权中间件、错误处理等公共能力

## 启动

```bash
npm run dev
```

## 类型检查

```bash
npm run typecheck
```
