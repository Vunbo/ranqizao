#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# iot-platform-backend 一键部署脚本
# 用法：
#   bash deploy.sh                     → 内置 PostgreSQL（默认）
#   bash deploy.sh --without-postgres  → 连接外部 PostgreSQL
#   bash deploy.sh --with-nginx        → 内置 PostgreSQL + Nginx
#   bash deploy.sh --help              → 帮助
# ============================================================

cd "$(dirname "$0")"

# ---- 解析参数 ----
MODE="with-postgres"
COMPOSE_FILE="docker-compose.with-postgres.yml"
ENV_FILE="backend.env.docker-postgres"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --without-postgres)
      MODE="without-postgres"
      COMPOSE_FILE="docker-compose.without-postgres.yml"
      ENV_FILE="backend.env.external-db"
      shift
      ;;
    --with-nginx)
      MODE="with-postgres-nginx"
      COMPOSE_FILE="docker-compose.with-postgres-nginx.yml"
      ENV_FILE="backend.env.docker-postgres"
      shift
      ;;
    --help|-h)
      echo "iot-platform-backend 一键部署脚本"
      echo ""
      echo "用法: bash deploy.sh [选项]"
      echo ""
      echo "选项:"
      echo "  (无)                默认：内置 PostgreSQL（推荐单机部署）"
      echo "  --without-postgres  连接外部 PostgreSQL（已有云数据库时）"
      echo "  --with-nginx        内置 PostgreSQL + Nginx 反代（80 端口）"
      echo "  --help, -h          显示此帮助"
      exit 0
      ;;
    *)
      echo "错误: 未知参数 $1"
      echo "用法: bash deploy.sh [--without-postgres | --with-nginx]"
      exit 1
      ;;
  esac
done

# ---- 检查 Docker ----
if ! command -v docker &>/dev/null; then
  echo "❌ 未找到 docker"
  exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "❌ 未找到 docker compose"
  exit 1
fi

# ---- 检查环境变量 ----
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 找不到环境变量文件: $ENV_FILE"
  exit 1
fi

# 检查是否还有未替换的占位值
PLACEHOLDERS=$(grep -c "replace-with" "$ENV_FILE" 2>/dev/null || true)
if [ "$PLACEHOLDERS" -gt 0 ]; then
  echo "⚠️  检测到 $PLACEHOLDERS 个占位值 (replace-with)，请先修改:"
  echo "   vi deplay/$ENV_FILE"
  echo ""
fi

# ---- 选择模式提示 ----
echo "=========================================="
echo " iot-platform-backend 部署"
echo " 模式: $MODE"
echo " compose: $COMPOSE_FILE"
echo "=========================================="
echo ""

# ---- 构建并启动 ----
cd ..

echo "🚀 构建镜像..."
docker compose -f "deplay/$COMPOSE_FILE" build --pull

echo "🚀 启动服务..."
docker compose -f "deplay/$COMPOSE_FILE" up -d

# ---- 等待健康检查 ----
BACKEND_PORT="3001"
if [ "$MODE" = "with-postgres-nginx" ]; then
  BACKEND_PORT="80"
fi

echo "⏳ 等待后端就绪..."
for i in $(seq 1 30); do
  sleep 2
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "✅ 后端已就绪 (HTTP $STATUS)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "⚠️  后端未在预期时间内响应，检查日志:"
    echo "   docker compose -f deplay/$COMPOSE_FILE logs -f iot-backend"
  fi
done

# ---- 输出 ----
echo ""
echo "=========================================="
echo " 部署完成"
echo "=========================================="
echo ""

case "$MODE" in
  with-postgres)
    echo "API 地址: http://127.0.0.1:3001/api"
    echo "健康检查: curl http://127.0.0.1:3001/api/health"
    ;;
  without-postgres)
    echo "API 地址: http://127.0.0.1:3001/api"
    echo "健康检查: curl http://127.0.0.1:3001/api/health"
    echo "注意: 请确保外部 PostgreSQL 已就绪"
    ;;
  with-postgres-nginx)
    echo "API 地址: http://服务器IP/api"
    echo "健康检查: curl http://服务器IP/api/health"
    echo "运营后台: 将 dist/ 复制到 deplay/html/ 目录即可"
    ;;
esac

echo ""
echo "查看日志:"
echo "  docker compose -f deplay/$COMPOSE_FILE logs -f"
echo ""
echo "停止服务:"
echo "  docker compose -f deplay/$COMPOSE_FILE down"
echo ""
