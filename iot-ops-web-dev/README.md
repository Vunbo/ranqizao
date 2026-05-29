# iot-ops-web-dev

物联网燃料灶运维中台前端。

## 当前结构

- `src/features`：按业务模块拆分的页面与逻辑
- `src/components`：通用布局与基础组件
- `src/router`：路由定义
- `src/lib`：运行时配置与接口封装

## 环境配置

运维中台统一只保留三套正式环境文件：

- `.env.development`
- `.env.test`
- `.env.production`

当前 API 地址统一由 `src/lib/runtime.ts` 读取，关键变量只有：

- `VITE_API_BASE_URL`

## 启动方式

开发环境：

```bash
npm install
npm run dev
```

测试环境调试：

```bash
npm run dev:test
```

测试构建：

```bash
npm run build:test
```

生产构建：

```bash
npm run build:prod
```

本地预览：

```bash
npm run preview
```

## 约束

- 页面中禁止写死后端地址
- 统一通过 `src/lib/runtime.ts` 获取 API Base URL
