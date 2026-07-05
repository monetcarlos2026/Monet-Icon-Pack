# Monet AppTracker Selfhost

一个免费的轻量自建图标包适配申请后台，兼容 Blueprint AppTracker 分支的核心上传接口。

## 功能

- 自助注册 / 登录
- 创建图标包
- 创建版本
- 生成图标包接入 token
- 接收 Blueprint AppTracker 分支上传的未适配应用
- 查看申请列表、搜索、按是否已适配过滤
- 标记已适配 / 取消已适配
- 导入现有 `appfilter.xml` 并标记已适配
- 导出已适配项为 `appfilter.xml`
- 使用 Cloudflare Workers + D1，低流量场景可免费运行

## 免费域名

部署到 Cloudflare Pages 后会得到类似这样的免费地址：

```text
https://monet-apptracker.pages.dev/
```

本项目使用 Pages 静态托管 + Pages Functions。相比 `workers.dev`，`pages.dev` 在中国大陆网络里通常更容易访问。

## 部署

1. 安装依赖

```bash
npm install
```

2. 登录 Cloudflare

```bash
npx wrangler login
```

3. 创建 D1 数据库

```bash
npx wrangler d1 create apptracker_selfhost
```

命令会输出 `database_id`，复制到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "apptracker_selfhost"
database_id = "这里换成你的 database_id"
```

4. 初始化数据库表

```bash
npx wrangler d1 execute apptracker_selfhost --file=./schema.sql
```

5. 创建 Pages 项目并部署

```bash
npx wrangler pages project create monet-apptracker --production-branch=main
npx wrangler pages deploy public --project-name=monet-apptracker
```

部署完成后，打开终端输出的 `pages.dev` 地址。

## 本地开发

```bash
npx wrangler pages dev public --compatibility-date=2026-07-04 --d1=DB=apptracker_selfhost
```

本地通常会在：

```text
http://localhost:8787/
```

## 图标包接入

在后台注册账号，创建图标包，生成接入 token 后，把你的 Android 项目里：

```xml
<string name="apptracker_access_key" translatable="false">生成的 token</string>
<string name="apptracker_base_url" translatable="false">https://你的地址.pages.dev/</string>
```

注意 `apptracker_base_url` 末尾要保留 `/`。

## 兼容接口

Blueprint AppTracker 分支会调用：

- `POST /app-info/create`
- `GET /app-icon/generate-upload-url?packageName=...`
- `PUT /upload/<package>.png`

当前版本会保存应用元数据请求；图标上传接口会返回成功并吞掉图片，以便没有 R2 存储时也能免费运行。如果以后想保存图标，可以接 Cloudflare R2。

## 安全说明

- 用户密码使用 salted SHA-256 存储。对个人低风险工具足够用；如果要开放给很多人，建议升级为 PBKDF2/Argon2。
- 接入 token 只保存 SHA-256 hash，后台生成后只显示一次。
- 建议一个图标包版本生成一个 token；泄露后可以从数据库里设置 `revoked_at` 撤销，后续可加 UI。

## 限制

- 没有对象存储时不保留用户上传的应用图标。
- 导入 `appfilter.xml` 只解析常见 Blueprint 格式：

```xml
<item component="ComponentInfo{package/activity}" drawable="drawable_name" />
```

- 导出 appfilter 时会用应用名生成 drawable 名，实际作图后你可能还需要手动调整 drawable。
