# YApi — 可视化接口管理平台

高效、易用、功能强大的 API 管理平台，为开发、产品、测试人员提供优雅的接口管理服务。

![YApi 流程图](yapi-base-flow.jpg)

## 功能特性

- **接口文档** — 基于 JSON5 + Mock.js 定义接口结构，支持 Postman / Swagger / HAR 导入
- **Mock Server** — 普通随机 Mock + Mock 期望（按请求规则返回指定数据）
- **接口调试** — 内置类 Postman 调试器，支持环境变量
- **自动化测试** — 编写测试用例，支持对 Response 字段断言
- **权限管理** — 分组 / 项目 / 成员扁平化权限，适合大型团队协作
- **插件系统** — 支持 SSO / LDAP / 钉钉通知等第三方扩展
- **私有化部署** — 数据完全自托管，敏感接口信息不外泄

## 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | >= 22.0.0 |
| MongoDB | >= 6（已验证兼容 MongoDB 8） |
| npm | >= 8.0.0 |

## 快速启动（Docker）

这是推荐的部署方式，无需手动配置 Node.js 或 MongoDB。

```bash
# 1. 按需修改配置（数据库地址、管理员邮箱等）
vi deployment/config.json

# 2. 启动
cd deployment
docker compose up -d

# 3. 访问
open http://localhost:3000
# 默认管理员账号：admin@admin.com  密码：ymfe.org
```

首次启动时容器会自动完成数据库初始化；`init.lock` 文件存在后不会重复执行。

### 配置说明（`deployment/config.json`）

```json
{
  "port": "3000",
  "adminAccount": "admin@admin.com",
  "db": {
    "servername": "mongo",
    "DATABASE": "yapi",
    "port": 27017,
    "user": "",
    "pass": ""
  },
  "mail": {
    "enable": false
  }
}
```

## 手动部署

```bash
# 1. 克隆并安装依赖（注意：项目需放在 vendors/ 子目录下）
mkdir -p /data/yapi && cd /data/yapi
git clone <repo-url> vendors
cp vendors/config_example.json config.json   # 编辑 config.json

cd vendors
npm install --legacy-peer-deps

# 2. 初始化数据库（仅首次）
node server/install.js

# 3. 启动服务
node server/app.js
```

> **路径约定**：`config.json` 必须位于源码目录的上两级（即 `../../config.json` 相对于 `server/`）。以上结构中 `config.json` 位于 `/data/yapi/config.json`，源码位于 `/data/yapi/vendors/`，符合此约定。

### 使用 PM2 管理进程

```bash
npm install -g pm2
pm2 start "vendors/server/app.js" --name yapi
pm2 save && pm2 startup
```

## 开发

```bash
npm run dev-server   # 后端热重载（nodemon）
npm run dev-client   # 前端开发服务器（port 4000，webpack HMR）
```

前端构建产物已预编译在 `static/prd/`，仅修改前端代码时需要重新构建：

```bash
npm run build-client
```

## 测试

```bash
# 单元测试（AVA）
npm test

# 单个文件
npx ava tests/lib.test.js

# E2E 测试（Playwright，需服务运行在 :3000）
npx playwright test --config=tests/playwright.config.js
```

测试文件位于 `tests/`，Playwright 结果输出到 `tests/results/`。

## 插件

在 `config.json` 中添加 `plugins` 字段即可启用第三方插件：

```json
{
  "plugins": [
    { "name": "yapi-plugin-qsso", "options": {} }
  ]
}
```

常用插件：

| 插件 | 说明 |
|------|------|
| [yapi-plugin-qsso](https://github.com/YMFE/yapi-plugin-qsso) | SSO 单点登录 |
| [yapi-plugin-cas](https://github.com/wsfe/yapi-plugin-cas) | CAS 登录 |
| [yapi-plugin-oauth2](https://github.com/xwxsee2014/yapi-plugin-oauth2) | OAuth 2.0 登录 |
| [yapi-plugin-dding](https://github.com/zgs225/yapi-plugin-dding) | 钉钉通知 |

## 生态工具

| 工具 | 说明 |
|------|------|
| [yapi-to-typescript](https://github.com/fjc0k/yapi-to-typescript) | 根据接口定义生成 TypeScript 请求函数 |
| [yapi-gen-js-code](https://github.com/hellosean1025/yapi-gen-js-code) | 生成 JavaScript 请求函数 |
| [easy-yapi](https://easyyapi.com/) | IDEA 插件，一键上传接口 |
| [SwiftJSONModeler](https://github.com/CodeOcenS/SwiftJSONModeler) | 生成 Swift 模型代码 |

## License

Apache License 2.0
