# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

YApi is a self-hosted API management platform (v1.11.0). It provides API documentation, mock server, interface debugging, and automated testing. The stack is **Koa 2 (Node.js) + MongoDB (Mongoose)** on the backend and **React 16 + Redux + Ant Design 3** on the frontend.

## Prerequisites

- Node.js >= 22.0.0
- MongoDB >= 2.6
- `config.json` must exist **two levels above the `server/` directory** — i.e., at `../../config.json` relative to `server/yapi.js`. In this repo that means `/root/codes/project/self/config.json`, not inside the repo root. This matches the intended deployment layout where the repo lives in a `vendors/` subdirectory.

## Commands

### Start the server (production/dev)
```bash
node server/app.js
```

### Initialize database (first-time setup only)
```bash
node server/install.js
```
Creates the admin account (`adminAccount` from `config.json`, default password `ymfe.org`).

### Run tests
```bash
# AVA unit tests
npm test
npx ava tests/lib.test.js          # single file
npx ava tests/mock-extra.test.js   # single file

# Playwright e2e tests (starts server automatically if not running)
npx playwright test --config=tests/playwright.config.js
```

All test files live under `tests/`. Results from Playwright are written to `tests/results/`.

### Build frontend (production)
```bash
npm run build-client
```
The pre-built frontend already lives in `static/prd/`. `sass` (dart-sass) is used instead of `node-sass` so the build works on Node v22+.

### Dev mode (server + client hot reload)
```bash
npm run dev-server   # backend with nodemon
npm run dev-client   # frontend dev server on port 4000
```

## npm Install Notes

The original `package-lock.json` contained hardcoded `registry.npm.taobao.org` URLs (expired cert). Always delete it before running `npm install`:
```bash
rm -f package-lock.json
npm install --legacy-peer-deps
```
Use npm v8 (`npm install -g npm@8`) — npm v11 has a bug that leaves empty module directories, breaking installs.

## Architecture

### Deployment layout
```
<runtime-root>/          ← config.json lives here (../../ from server/)
  config.json
  log/
  vendors/               ← this git repo
    server/
    client/
    common/
    exts/
    static/
```

### Request lifecycle
1. `server/app.js` — Koa app entry. Sets up `koaBody`, `koaStatic`, WebSocket, then mounts middleware and router.
2. `server/middleware/mockServer.js` — intercepts every request whose path starts with `/mock/<projectId>/...`. Looks up the matching interface in MongoDB, runs Mock.js / JSON Schema faker, executes any project-level mock script, fires `mock_after` hooks, and returns the generated response. This runs **before** the API router.
3. `server/router.js` — mounts all `/api/...` REST routes by iterating a declarative `routerConfig` object. Each entry maps to a controller action via `createAction()`.
4. `server/controllers/base.js` — base class for all controllers. Handles session auth (JWT in `_yapi_token` cookie + `_yapi_uid` cookie) and token-based open API auth. Permission model: `admin > owner > dev > guest > member`.
5. `server/controllers/*.js` — business logic. Each controller class extends `baseController`.
6. `server/models/base.js` — base class for all Mongoose models. Subclasses must implement `getSchema()` and `getName()`. Auto-increment is applied to `_id` by default via a custom plugin.
7. `server/yapi.js` — global singleton (`yapi`). Exposes `WEBCONFIG` (from `config.json`), `WEBROOT`, path utilities, `getInst(ModelClass)` (singleton model factory), `emitHook`, `bindHook`.

### Plugin / hook system
- **Built-in extensions** live in `exts/yapi-plugin-*/` and are always loaded (configured in `common/config.js`).
- **Third-party plugins** are listed under `plugins` in `config.json` and installed as npm packages prefixed `yapi-plugin-`.
- Each plugin exports a function called with `yapi` as `this`. Plugins register behavior via `yapi.bindHook(hookName, handler)`.
- Available hooks: `third_login`, `interface_add/del/update/list/get`, `project_add/up/get/del`, `mock_after`, `export_markdown`, `add_router`, `add_ws_router`, `import_data`, `addNotice`.
- Plugins can add API routes by listening to `add_router` (sync hook) and calling the provided `addPluginRouter(config)` function.

### Frontend
- Entry: `client/index.js` → `client/Application.js` (React Router + Redux Provider).
- Routes map to container components in `client/containers/` (Home, Group, Project, Login, User, Follows, AddProject).
- State management: Redux with modules under `client/reducer/modules/`.
- `client/plugin.js` loads client-side plugin code (mirrors server plugin loading).
- Constants shared across client/server (e.g., HTTP methods) are in `client/constants/`.

### Common layer
- `common/` contains code shared by both server and client: `lib.js` (utilities), `mock-extra.js` (extended mock logic), `utils.js` (schema validation), `plugin.js` (plugin config loader), `config.js` (built-in ext list).

### Mock server internals
URL pattern: `GET /mock/<project_id>/<basepath><interface_path>`

Matching priority:
1. Exact path match
2. Query-param based match (`query_path`)
3. Dynamic path params (`:param` or `{param}` syntax), weighted by number of literal segments matched

Response generation:
- `res_body_type === 'json'` + `res_body_is_json_schema === true` → JSON Schema faker
- `res_body_type === 'json'` (plain) → Mock.js template via `mockExtra()`
- Other types → raw string response
