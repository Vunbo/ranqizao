# uni-app -> Flutter 迁移映射

## 基线说明

- 源基线：`D:/Desktop/ranqizao/iot-uni-app` 当前工作区代码
- 目标项目：`D:/Desktop/ranqizao/iot-app-flutter`
- 迁移原则：统一配置、统一接口层、统一公共逻辑，不保留前端写死的并行旧实现

## 模块映射

### 应用壳层

- `components/app/AppContainer.vue` -> `lib/app/router.dart` + 后续 `lib/features/app_shell/*`
- `components/navigation/BottomNavigation.vue` -> `lib/widgets/bottom_nav.dart`
- `components/ui/AppIcon.vue` -> `lib/widgets/app_icon.dart`
- `components/ui/ConfirmDialog.vue` -> `lib/widgets/confirm_dialog.dart`
- `components/ui/ToastBar.vue` -> `lib/widgets/toast_bar.dart`
- 状态：进行中

### 运行时配置

- `config/runtime.js` -> `lib/core/runtime_config.dart`
- `services/http/request.js` -> `lib/services/api_client.dart`
- 状态：进行中

### 认证

- `components/auth/AuthPanel.vue` -> `lib/features/auth/login_page.dart`（待拆分为可复用 auth panel）
- `services/features/auth/auth-panel-controller.js` -> `lib/providers/auth_provider.dart` + `lib/services/auth_service.dart`
- `services/gateway/auth.js` -> `lib/services/auth_service.dart` + 后续 session/bootstrap 层
- 状态：待继续

### 首页

- `components/home/HomeView.vue` -> `lib/features/home/home_page.dart`
- 状态：首轮已对齐布局和分组，待继续补细节

### 安全页

- `components/safety/SafetyView.vue`
- `services/features/safety/safety-controller.js`
- -> `lib/features/safety/safety_page.dart`
- 状态：首轮已对齐结构，待继续补交互细节

### 商城

- `components/mall/MallWebview.vue` -> `lib/features/mall/mall_page.dart`
- `config/runtime.js.mallH5Url` -> `lib/core/runtime_config.dart.mallH5Url`
- 状态：首轮已接运行时配置与 WebView

### 设备详情

- `components/device/DeviceDetailView.vue`
- `services/features/device/device-detail-controller.js`
- -> `lib/features/device_detail/device_detail_page.dart`
- 状态：待继续按 1:1 重构

### 添加设备

- `components/device/AddDeviceModal.vue`
- `services/features/device/add-device-modal-controller.js`
- `services/location/location-service.js`
- `services/helpers/location-helpers.js`
- -> `lib/features/scan_bind/scan_bind_page.dart` + 后续 location/permission/scan 服务
- 状态：待继续

### 我的主页与子模块

- `components/profile/ProfileView.vue` -> `lib/features/profile/profile_page.dart`
- `components/profile/AccountManagementView.vue` -> 后续 `lib/features/profile/account_management_page.dart`
- `components/profile/AccountBindingView.vue` -> 后续 `lib/features/profile/account_binding_page.dart`
- `components/profile/HomeManagementView.vue` -> 后续 `lib/features/profile/home_management_page.dart`
- `components/profile/SharingManagementView.vue` -> 后续 `lib/features/profile/share_management_page.dart`
- `components/profile/NotificationSettingsView.vue` -> 后续 `lib/features/profile/notification_settings_page.dart`
- 状态：主页面首轮已对齐分组，子模块待继续

### 商户 / 推广入驻

- `components/profile/MerchantLandingView.vue`
- `components/profile/MerchantPanelView.vue`
- `services/features/merchant/*`
- `services/api/merchant.js`
- -> 后续 `lib/features/merchant/*` + `lib/services/merchant_service.dart`
- 状态：待继续

### Homes / Devices / Alerts 数据层

- `services/api/devices.js` -> `lib/services/device_service.dart`
- `services/api/homes.js` -> `lib/services/home_service.dart`
- `services/api/merchant.js` -> 后续 `lib/services/merchant_service.dart`
- `services/store/store.js` -> 后续 `lib/services/session_store.dart`
- 状态：进行中

## 当前阶段完成项

- 已补齐 Flutter 运行时配置入口
- 已补齐 `home` 模型、服务、provider
- 已统一并扩展主题色、边框色、遮罩色等基础变量
- 已修正服务层相对路径错误
- 已修正路由主链路、缺失页面路由和商城页隐藏底部导航逻辑
- 已完成 Home / Safety / Profile / Mall 第一轮壳层迁移

## 下一阶段

1. 认证页按 uni-app 拆成可复用 auth panel
2. 会话恢复、token 存储、`auth/me` bootstrap
3. 添加设备四步流 1:1 迁移
4. 设备详情页按 controller 逻辑重构
5. Profile 子页面逐个落地并删除旧占位代码
