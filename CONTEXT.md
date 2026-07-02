# ranqizao 领域模型

> IoT 智能烹饪设备平台，包含 C 端用户 App（UniApp）、运营管理后台 Web（React）、后端 API（Express/TS）。
>
> 本文件只记录领域术语，不涉及实现细节。

---

## 核心概念

### 设备 (Device)

实物 IoT 智能烹饪设备，例如智能灶具。每个设备唯一对应一条库存记录。

### 设备状态（派生，非存储）

基于最后心跳时间判断，规则由业务定义：

- `online` — 最后心跳在 **5 分钟内**
- `offline` — 最后心跳超过 **5 分钟**或无心跳记录
- `locked` — 在线 + 已被运营管理员锁定
- `alert` — 在线 + 未锁定 + 传感器异常（燃气 ≥ 0.1 / 烟雾 ≥ 10 / 振动）
- `normal` — 在线 + 未锁定 + 无异常传感器读数

> **业务规则**: 离线阈值为 5 分钟。此阈值适用于全平台，在所有设备状态判定中一致使用。

- **点火状态**: `on` / `off`
- **阀门状态**: `open` / `closed`
- **归属关系**: 每个设备有且仅有一个 Owner（C 端用户）

### 库存记录 (DeviceInventory)

出厂设备库存。每台库存的 `status` 为 `available` → `bound`（绑定到设备后）→ `disabled`（禁用）。

### 用户 (User)

C 端用户，通过 8 位 `shortUid` 对外标识。一个用户可以拥有多个设备，加入多个家庭。

### 管理员 (Admin User)

运营后台操作人员，通过用户名+密码登录，JWT 鉴权。角色分为 `super_admin`、`ops_admin`、`ops_viewer`。

### 身份 (AuthIdentity)

用户的认证凭据。一个用户可绑定多个身份，包括：
- `email_password` — 邮箱+密码
- `phone_sms` — 手机号+短信验证码
- `wechat_app` — 微信 App OAuth
- `wechat_mini_program` — 微信小程序
- `google_app` — Google OAuth

> **API 版本说明**: 当前后端认证路由为 `/auth/*`（Express 版本），  
> 新 Flutter App 文档中规划的路径为 `/api/v1/auth/*`。后续 API 统一后需对齐。

---

## 家庭与设备可见性

### 家庭 (Home)

用户创建的家庭空间。一个用户可以创建多个家庭，每个家庭有独立名称（同一用户下不可重名）。

- **家庭 Owner**: 创建该家庭的用户，可管理家庭设备关联和成员
- **家庭成员**: 被加入的用户，可查看家庭关联的所有设备
- **家庭设备关联** (HomeDeviceLink): 将 Owner 名下的设备关联到家庭

### 设备可见性规则

用户能看到某台设备的条件（或关系）：
1. 该用户是设备的 **Owner**
2. 该用户被 **直接共享** 了该设备（DeviceShare）
3. 该用户所在的 **家庭** 关联了该设备

### 共享 (DeviceShare)

设备 Owner 将设备共享给另一个用户。被共享者获得 `view` + `control` 权限，不能改名、不能删除、不能再次分享。

---

## 商户体系

### 商户入驻申请 (MerchantApplication)

用户提交的商户入驻申请。生命周期：
- `pending` → 运营管理员审核
  - `approved` → 创建商户档案
  - `rejected` → 不创建商户档案

### 商户档案 (MerchantProfile)

审核通过后生成的商户记录。状态 `active` / `disabled`。

### 入驻级别

- `operations_center` — 运营中心
- `district_agent` — 区代理

### 入驻落地页 (MerchantPage)

运营后台管理的 C 端展示页。分为 `draft`（草稿）和 `published`（已发布）两个版本。

---

## 监控与运维

### 告警 (Alert)

设备触发的警告记录。生命周期：
- `pending` → 待处理（初始状态）
  - `resolved` — 管理员确认解决
  - `false_positive` — 管理员标记为误报

**告警级别**: `critical` / `high` / `normal`

### 控制指令 (DeviceCommand)

用户或管理员向设备下发的控制操作。指令类型：

| 指令 | 说明 | 触发端 |
|------|------|--------|
| `fire-on` | 开火 | C端 App |
| `fire-off` | 关火 | C端 App |
| `power-set` | 火力调节 | C端 App |
| `lock_device` | 锁定设备 | 运营后台 |
| `unlock_device` | 解锁设备 | 运营后台 |
| `ignite` | 点火（运营端） | 运营后台 |
| `shutdown` | 关机 | 运营后台 |

**指令执行状态**: `pending` → `success` / `failed` / `timeout`

> **注意**: C 端控制路径为 `/api/v1/devices/:id/commands/{fire-on|fire-off|power-set}`，  
> 运营端控制路径为 `/ops/devices/:id/control`。两套路径对应不同端的功能。

### 指令审计 (CommandAudit)

运营管理员向设备下发控制指令的审计记录，记录每次操作的指令类型、操作人、执行结果。  
C 端 App 也有独立的控制记录查询（通过 `GET /api/v1/devices/:id/commands`），两者共用同一审计表。

### 操作日志 (OperationLog)

设备和系统**被动产生**的事件记录，包括传感器数据变化、指令执行触发的日志等。

### 绑定事件 (DeviceBindingEvent)

记录设备**归属关系**的变更事件，包括：
- 用户绑定设备
- 用户解绑设备
- 设备分享

### 仪表盘 (Dashboard)

运营后台首页，显示设备总数、在线/离线/告警数、今日新增、活跃告警数。支持按国家/省/市下钻的地图视图。

---

## 配置体系

### 运营配置 (OpsConfig)

运营后台管理系统配置，按类型分类：
- `templates` — 消息模板（通知文案、渠道、变量）
- `alert-rules` — 告警规则（触发条件、严重级别、动作）
- `risk-rules` — 风险规则（阈值、持续时长、处置动作）

> **API 路由**: 后端对应 `/ops/configs/templates`、`/ops/configs/alert-rules`、`/ops/configs/risk-rules`。  
> 路由中的 `risk-rules` 为规范命名，术语统一为 `risk`（前端 `ConfigTab` 类型）。

---

## 不应使用的术语

| 避免使用 | 原因 | 应使用 |
|---------|------|--------|
| `threshold`（配置类型） | 与数据库 `risk_rules` 和前端 `risk` 不一致 | `risk-rules` / `risk` |
| `threshold_expression` | 它是风险规则的一个属性，不是配置分类名 | 风险阈值表达式 |

## 已知的不一致性（待对齐）

| 问题 | 当前实现 | 新文档规划 |
|------|---------|-----------|
| 设备在线状态 | 二进制 `online: boolean` | 三态 `ONLINE / WEAK / OFFLINE` |
| API 前缀 | `/auth/*`、`/devices/*` 等 | `/api/v1/auth/*`、`/api/v1/devices/*` |
| C 端远程控制路径 | 未实现 | `/api/v1/devices/:id/commands/{fire-on\|fire-off\|power-set}` |
| 设备型号字段名 | `product_model` | `model`
