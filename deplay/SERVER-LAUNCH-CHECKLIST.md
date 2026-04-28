# Server Launch Checklist

Use this checklist before and during production launch.

## 1. Server Basics

- [ ] Server time zone and time sync are correct.
- [ ] Docker and Docker Compose are installed and usable.
- [ ] Required directories exist and match the documented layout:
  - [ ] `deplay/`
  - [ ] `iot-platform-backend-dev/`
  - [ ] `iot-ops-web-dev/`
- [ ] Domain or public IP is ready.
- [ ] TLS certificate plan is ready if you will use HTTPS.

## 2. Choose Backend Deployment Mode

- [ ] Decide one mode only:
  - [ ] `deplay/docker-compose.external-db.yml`
  - [ ] `deplay/docker-compose.with-postgres.yml`
- [ ] If using external PostgreSQL:
  - [ ] `deplay/backend.env.external-db` is filled with real values.
  - [ ] `PGDATABASE` already exists, or `PGUSER` can create databases.
- [ ] If using bundled PostgreSQL:
  - [ ] `deplay/backend.env.docker-postgres` is filled with real values.
  - [ ] `POSTGRES_PASSWORD` and `PGPASSWORD` were both replaced.

## 3. Backend Required Env Values

- [ ] `JWT_SECRET` replaced with a strong random value.
- [ ] `OPS_JWT_SECRET` replaced with a different strong random value.
- [ ] `OPS_ADMIN_USERNAME` set to the production admin username.
- [ ] `OPS_ADMIN_PASSWORD` set to a strong production password.
- [ ] `CORS_ORIGINS` set to exact frontend origins, not `*`.
- [ ] `API_HOST=0.0.0.0`
- [ ] `API_PORT=3001`

## 4. Third-Party Login Settings

- [ ] If using WeChat Mini Program login:
  - [ ] `WECHAT_MINI_APP_ID` set
  - [ ] `WECHAT_MINI_APP_SECRET` set
- [ ] If using WeChat App login:
  - [ ] `WECHAT_APP_ID` set
  - [ ] `WECHAT_APP_SECRET` set
- [ ] If using Google App login:
  - [ ] `GOOGLE_APP_WEB_CLIENT_ID` set
- [ ] Server outbound network allows HTTPS access to:
  - [ ] `api.weixin.qq.com`
  - [ ] `openidconnect.googleapis.com`

## 5. Ops Web Deployment

- [ ] `iot-ops-web-dev/.env` or build env sets:
  - [ ] `VITE_API_BASE_URL=https://your-api-domain/api`
- [ ] `npm install` completed in `iot-ops-web-dev/`
- [ ] `npm run build` completed in `iot-ops-web-dev/`
- [ ] Static output `iot-ops-web-dev/dist/` is deployed to the web server.
- [ ] Because ops web uses `BrowserRouter`, the web server has SPA route fallback:
  - [ ] unknown routes return `index.html`

## 6. uni-app / Mini Program Runtime Settings

- [ ] `iot-uni-app/.env` sets both:
  - [ ] `VUE_APP_API_BASE_URL=https://your-api-domain/api`
  - [ ] `VITE_API_BASE_URL=https://your-api-domain/api`
- [ ] Real device or mini program config does not use `localhost`.
- [ ] If using Mini Program:
  - [ ] backend domain added to allowed request domains
  - [ ] production domain uses HTTPS if required by the platform
- [ ] If using App login flows:
  - [ ] WeChat App callback / app config is aligned with your release package
  - [ ] Google login config is aligned with your release package

## 7. Network and Security

- [ ] Prefer exposing only `80/443` through Nginx or Caddy.
- [ ] If temporarily exposing backend directly, open only `3001/tcp`.
- [ ] OS firewall rules checked.
- [ ] Cloud security group rules checked.
- [ ] PostgreSQL `5432` is not publicly exposed unless there is a real need.
- [ ] Reverse proxy forwards `/api` to backend `127.0.0.1:3001`.

## 8. Preflight Validation

- [ ] Run compose validation before startup:

```bash
docker compose -f deplay/docker-compose.external-db.yml config
docker compose -f deplay/docker-compose.with-postgres.yml config
```

- [ ] Confirm the mode you are not using will not be started by mistake.
- [ ] Confirm backend env file contains no placeholder values.

## 9. First Startup

- [ ] Start chosen backend stack:

```bash
docker compose -f deplay/docker-compose.external-db.yml up -d --build
```

or:

```bash
docker compose -f deplay/docker-compose.with-postgres.yml up -d --build
```

- [ ] Check container state:

```bash
docker compose -f deplay/docker-compose.with-postgres.yml ps
```

- [ ] Check backend logs:

```bash
docker compose -f deplay/docker-compose.with-postgres.yml logs -f iot-backend
```

- [ ] Health endpoint returns success:

```bash
curl http://127.0.0.1:3001/api/health
```

## 10. Immediate Post-Startup Security Actions

- [ ] Log in to ops backend with the configured production ops admin account.
- [ ] Confirm fallback `admin / admin` is not being used.
- [ ] Confirm seeded normal user `123@test.com` has been disabled, deleted, or had its password reset.
- [ ] Record production credentials in a safe password vault.

## 11. Functional Smoke Tests

- [ ] Ops web login works.
- [ ] Ops dashboard loads summary data.
- [ ] Ops device list loads.
- [ ] Ops device detail page opens.
- [ ] Ops alerts page loads.
- [ ] Ops commands page loads.
- [ ] User side app can log in with the intended auth method.
- [ ] Mini program can log in if enabled.
- [ ] A device can be added and bound successfully.
- [ ] Device location is stored after binding.
- [ ] Ops dashboard or device view shows the correct device location / distribution.

## 12. Location-Specific Verification

- [ ] Bind one new device from app or mini program.
- [ ] Confirm the backend receives `location` data.
- [ ] Confirm database `devices.location` contains:
  - [ ] `latitude`
  - [ ] `longitude`
  - [ ] `province`
  - [ ] `city`
  - [ ] `district` or usable address
- [ ] Confirm ops web can see device distribution using the stored location.
- [ ] If old devices have incomplete location data, plan a one-time backfill.

## 13. Data and Backup

- [ ] Database backup strategy is defined.
- [ ] Volume backup strategy is defined if using bundled PostgreSQL.
- [ ] Ops web build artifact backup or reproducible build path is confirmed.
- [ ] Rollback plan is written down.

## 14. Go-Live Gate

- [ ] No placeholder secrets remain.
- [ ] No public weak default credentials remain.
- [ ] Health checks are green.
- [ ] Core login flow is green.
- [ ] Device binding flow is green.
- [ ] Device location flow is green.
- [ ] Ops web is reachable from the public domain.
- [ ] Monitoring or at least log tail access is available after release.
