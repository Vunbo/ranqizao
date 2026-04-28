# iot-ops-web-dev

物联网燃气灶运维中台前端。

## 当前状态

- 已接入第一阶段运维后端接口：
  - `/api/ops/auth/*`
  - `/api/ops/dashboard/*`
  - `/api/ops/devices/*`
  - `/api/ops/users/*`
  - `/api/ops/shares/*`
- 告警中心、控制审计、系统配置页当前仍保留前端 mock 数据

## 环境配置

创建 `.env`：

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 本地开发

```bash
npm install
npm run dev
```
