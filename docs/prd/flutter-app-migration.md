# PRD: Flutter App 迁移（iot-app-flutter）

> 状态: `ready-for-agent` · 创建日期: 2026-06-21  
> 关联: 开发文档 `01-App开发文档.md` · 领域模型 `CONTEXT.md`

---

## Problem Statement

当前 C 端 App 使用 HBuilder/uni-app（Vue2）开发，在嵌入 H5 商城页面时遇到无法解决的原生层级冲突（导航条被 WebView 覆盖、H5 内容适配等问题）。同时 uni-app 在原生性能、插件生态、长期维护方面不如 Flutter。需要将 App 完整迁移到 Flutter。

## Solution

在 `iot-app-flutter` 目录下使用 Flutter 重新实现 C 端 App，完整复刻 uni-app 的所有业务功能、页面和 UI 样式。后端 API 保持不变（`iot-platform-backend-dev`），Flutter App 直接对接。

## User Stories

1. 作为 C 端用户，我可以用**手机号+验证码登录**，以便快速进入 App
2. 作为 C 端用户，我可以用**微信快捷登录**，以便减少输入成本
3. 作为首次使用的用户，我可以在登录后**绑定微信和手机号**，以便统一账号体系
4. 作为设备用户，我可以在首页看到所有设备的概览卡片，以便快速了解设备状态
5. 作为设备用户，我可以在首页按状态筛选设备（全部/在线/告警），以便聚焦关注
6. 作为设备用户，我可以下拉刷新设备列表，以便获取最新状态
7. 作为设备用户，我可以通过**扫码绑定新设备**，以便添加新硬件
8. 作为设备用户，扫码后可以输入设备名称和安装位置，以便个性化管理
9. 作为设备用户，我可以在**设备详情页**查看实时状态（温度/燃气/火力等），以便了解设备运行情况
10. 作为设备用户，我可以在设备详情页查看历史**控制记录**，以便追溯操作
11. 作为设备用户，我可以在设备详情页查看设备的**告警摘要**，以便快速处理问题
12. 作为设备用户，我可以**远程开火**，以便回家前预热
13. 作为设备用户，开火前需通过**高风险提示**和**二次身份验证**，以便确保安全
14. 作为设备用户，开火后可看到指令执行状态（轮询），以便确认操作结果
15. 作为设备用户，我可以**远程关火**，以便忘记关火时及时处理
16. 作为设备用户，我可以**调节火力档位**（拖动滑杆/点击档位），以便控制烹饪温度
17. 作为设备用户，我可以在**告警列表**查看所有告警，以便统一管理
18. 作为设备用户，我可以在告警列表按等级/状态/设备筛选，以便快速定位
19. 作为设备用户，我可以在**告警详情**查看处理建议和关联设备状态，以便判断严重程度
20. 作为设备用户，我可以确认告警（已读/ack），以便标记已处理
21. 作为设备 Owner，我可以在**共享管理**页添加共享成员，以便家人也能使用设备
22. 作为设备 Owner，我可以修改共享成员的权限（view/control），以便控制访问级别
23. 作为设备 Owner，我可以撤销共享，以便收回设备控制权
24. 作为设备用户，我可以在**我的页**查看头像昵称和手机号，以便确认账号信息
25. 作为设备用户，我可以在我的页查看微信绑定状态，以便管理第三方账号
26. 作为设备用户，我可以在**账号安全页**修改密码，以便保障安全
27. 作为设备用户，我可以在**通知设置页**管理推送开关，以便控制消息打扰

## Implementation Decisions

### 项目结构

```
iot-app-flutter/
├── lib/
│   ├── main.dart                  # 应用入口
│   ├── app/
│   │   ├── app.dart               # MaterialApp + 路由
│   │   └── router.dart            # go_router 配置
│   ├── core/
│   │   ├── theme/                 # 主题色、字号、间距（复刻 uni-app 橙色主题）
│   │   ├── constants/             # 常量定义、API 路径
│   │   └── utils/                 # 工具函数
│   ├── services/
│   │   ├── api/                   # Dio HTTP 客户端 + API 封装
│   │   ├── auth_service.dart      # 认证相关 API
│   │   ├── device_service.dart    # 设备相关 API
│   │   ├── alert_service.dart     # 告警相关 API
│   │   └── share_service.dart     # 共享相关 API
│   ├── models/                    # 数据模型（与 CONTEXT.md 术语对齐）
│   │   ├── user.dart
│   │   ├── device.dart
│   │   ├── alert.dart
│   │   └── share.dart
│   ├── providers/                 # Riverpod 状态管理
│   │   ├── auth_provider.dart
│   │   ├── device_provider.dart
│   │   ├── alert_provider.dart
│   │   └── share_provider.dart
│   ├── features/
│   │   ├── auth/                  # 登录页
│   │   ├── home/                  # 设备首页
│   │   ├── device_detail/         # 设备详情 + 控制
│   │   ├── scan_bind/             # 扫码绑定
│   │   ├── alerts/                # 告警列表 + 详情
│   │   └── profile/               # 我的 + 设置
│   └── widgets/                   # 通用组件
│       ├── device_card.dart
│       ├── status_badge.dart
│       └── confirm_dialog.dart
```

### API 对齐策略

Flutter App 直接对接当前后端的真实路由（`/auth/*`、`/devices/*` 等），不要求后端改 `/api/v1/*` 前缀。`CONTEXT.md` 中记录的"已知的不一致性"在后端统统一前使用旧路径。

### 需要后端新增的接口

| 接口 | 说明 | 优先级 |
|------|------|--------|
| `POST /devices/:id/commands/fire-on` | 远程开火 | P0 |
| `POST /devices/:id/commands/fire-off` | 远程关火 | P0 |
| `POST /devices/:id/commands/power-set` | 火力调节 | P0 |
| `POST /auth/secondary-verify` | 开火前二次验证 | P0 |
| `GET /alerts` | C 端告警列表 | P0 |
| `GET /alerts/:id` | C 端告警详情 | P0 |
| `POST /alerts/:id/read` | 告警标记已读 | P1 |
| `POST /alerts/:id/ack` | 告警确认 | P1 |
| `GET /devices/:id/shares` | 共享成员列表 | P1 |
| `POST /devices/:id/shares` | 添加共享成员 | P1 |
| `PUT /devices/:id/shares/:shareId` | 修改共享权限 | P1 |
| `DELETE /devices/:id/shares/:shareId` | 撤销共享 | P1 |

### 架构决策

- **状态管理**: Riverpod — 每个业务域一个 provider（auth、device、alert、share、profile），与 Flutter 开发文档一致
- **路由**: go_router — ShellRoute 实现底部导航栏（首页/告警/共享/我的），与开发文档一致
- **网络层**: Dio — 封装请求拦截器自动注入 Bearer Token，响应拦截器处理 Token 过期和统一错误处理
- **设备状态**: 使用三态 `ONLINE / WEAK / OFFLINE` 替代后端的二进制 `online: boolean`，App 端本地计算
- **指令轮询**: 控制指令发起后轮询 8 秒（间隔 1 秒），到达终态或超时停止
- **页面刷新**: 详情页 5-10 秒自动刷新，列表页下拉刷新 + 进入时刷新
- **本地缓存**: Token 持久化到 Hive，最近设备列表本地缓存

## Testing Decisions

- **好的测试标准**: 只测外部行为，不测实现细节。Provider 层测试使用 Riverpod 的 `ProviderContainer` + mock 的 API service
- **测试范围**:
  - `services/` — API 调用和响应解析（mock Dio）
  - `providers/` — 状态流转逻辑
  - `features/` — Widget 测试（golden test 校验 UI 一致性）
- **先例**: uni-app 的 controller 层模式可以在 Flutter provider 层复用相同逻辑

## Out of Scope

- 商城 H5 页面（uni-app 中未解决的问题，Flutter 阶段单独评估方案）
- 商户入驻流程
- 推送通知 SDK 集成（第一期手动刷新代替）
- 多语言国际化
- 深色模式

## Further Notes

- UI 主题色统一使用 `#f97316`（橙色），复刻 uni-app 的视觉风格
- 底部导航为 4 个 tab：首页、告警、共享、我的
- 设备状态卡片设计参考 uni-app 的 device-card 组件
