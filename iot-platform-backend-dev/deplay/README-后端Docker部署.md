# iot-platform-backend Docker Deployment

This document assumes the following directory layout on the server:

```text
/srv/ranqizao/
|-- deplay/
|   |-- Dockerfile
|   |-- docker-compose.external-db.yml
|   |-- docker-compose.with-postgres.yml
|   |-- backend.env.external-db
|   `-- backend.env.docker-postgres
`-- iot-platform-backend-dev/
```

If your server layout is different, update these fields in the compose files:

- `build.context`
- `build.dockerfile`
- `env_file`

## Files

- `Dockerfile`
  Backend image build file.
- `docker-compose.external-db.yml`
  Use this when PostgreSQL already exists outside Docker.
- `docker-compose.with-postgres.yml`
  Use this when backend and PostgreSQL run together in Docker.
- `backend.env.external-db`
  Env file for the external PostgreSQL mode.
- `backend.env.docker-postgres`
  Env file for the bundled PostgreSQL mode.
- `.dockerignore`
  This only takes effect if these files are copied into the backend project root and the build context changes to that root.

## Important Startup Behavior

Current backend bootstrap logic will automatically:

- create the business database if it does not exist
- create tables and indexes
- create a default normal user: `123@test.com / admin@123`
- create a default ops admin user; if ops env vars are missing, it falls back to `admin / admin`

Before production deployment, you should at minimum:

- change `JWT_SECRET`
- change `OPS_JWT_SECRET`
- change `OPS_ADMIN_USERNAME`
- change `OPS_ADMIN_PASSWORD`
- avoid `CORS_ORIGINS=*`
- disable, delete, or reset the seeded normal user `123@test.com` after first startup

## Option 1: Use External PostgreSQL

Recommended if you already have PostgreSQL on the server or use a managed database.

### 1. Edit env file

Update `backend.env.external-db`, especially:

```env
CORS_ORIGINS=https://ops.example.com,https://app.example.com
JWT_SECRET=replace-with-a-strong-random-jwt-secret
OPS_JWT_SECRET=replace-with-another-strong-random-ops-jwt-secret
OPS_ADMIN_USERNAME=ops_admin
OPS_ADMIN_PASSWORD=replace-with-a-strong-admin-password
PGHOST=replace-with-your-postgres-host
PGUSER=replace-with-your-postgres-user
PGPASSWORD=replace-with-your-postgres-password
```

### 2. Confirm database privileges

On startup, the backend connects to `PGADMIN_DATABASE` first and checks whether `PGDATABASE` exists.

That means one of these must be true:

- `PGUSER` has permission to create databases
- `PGDATABASE` has already been created manually

If your managed PostgreSQL account does not have `CREATE DATABASE`, create the database manually first.

### 3. Start

```bash
docker compose -f docker-compose.external-db.yml up -d --build
```

## Option 2: Run Backend and PostgreSQL Together

Recommended for a single server when PostgreSQL does not need to be exposed publicly.

### 1. Edit env file

Update `backend.env.docker-postgres`, especially:

```env
CORS_ORIGINS=https://ops.example.com,https://app.example.com
JWT_SECRET=replace-with-a-strong-random-jwt-secret
OPS_JWT_SECRET=replace-with-another-strong-random-ops-jwt-secret
OPS_ADMIN_USERNAME=ops_admin
OPS_ADMIN_PASSWORD=replace-with-a-strong-admin-password
POSTGRES_PASSWORD=replace-with-a-strong-postgres-password
PGPASSWORD=replace-with-a-strong-postgres-password
```

### 2. Start

```bash
docker compose -f docker-compose.with-postgres.yml up -d --build
```

Notes:

- PostgreSQL port `5432` is no longer exposed to the host by default.
- If you really need direct host access, temporarily add `ports: - "5432:5432"` to the `postgres` service.
- PostgreSQL now has a healthcheck, and the backend waits for it to become healthy before starting.

## Health Checks

Show container status:

```bash
docker compose -f docker-compose.with-postgres.yml ps
```

or:

```bash
docker compose -f docker-compose.external-db.yml ps
```

Show backend logs:

```bash
docker compose -f docker-compose.with-postgres.yml logs -f iot-backend
```

Show database logs:

```bash
docker compose -f docker-compose.with-postgres.yml logs -f postgres
```

Check the API health endpoint:

```bash
curl http://127.0.0.1:3001/api/health
```

## Frontend API Configuration

### Ops web: `iot-ops-web-dev`

```env
VITE_API_BASE_URL=https://api.example.com/api
```

### uni-app / mini program: `iot-uni-app`

Set both variables:

```env
VUE_APP_API_BASE_URL=https://api.example.com/api
VITE_API_BASE_URL=https://api.example.com/api
```

Notes:

- Do not use `localhost` for real devices or mini programs.
- Use a public domain, a public IP, or a reachable LAN IP.
- For WeChat mini program production access, add the backend domain to the allowed request domain list.

## Ports and Reverse Proxy

The simplest setup is to expose `3001/tcp`, but a better production setup is:

- expose only `80/443`
- use Nginx or Caddy to reverse proxy to `127.0.0.1:3001`
- let all frontends call the backend through one HTTPS domain

If you do not use a reverse proxy yet, at least:

- open security group port `3001/tcp`
- open OS firewall port `3001/tcp`

## If You Copy These Files Into The Backend Project Root

You can simplify the compose paths to:

```yaml
build:
  context: .
  dockerfile: Dockerfile
env_file:
  - ./backend.env.external-db
```

or:

```yaml
build:
  context: .
  dockerfile: Dockerfile
env_file:
  - ./backend.env.docker-postgres
```
