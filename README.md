# 拾光寻物 · Campus Lost & Found

面向校园社区的失物招领 / 寻物启事网站：发布寻物与招领信息，Campux 统一登录，审核员网页审核，并可将待审核稿件实时推送到 QQ 群（**SnowLuma**，兼容 OneBot 11）。界面为**简约毛玻璃（Glassmorphism）风格**。

> 项目架构参考 [Whimsicalid/Lofo](https://github.com/Whimsicalid/Lofo) 重写，主要差异：
> 1. QQ 通知由 NapCat 改为 **SnowLuma 适配**（OneBot 11，支持反向 / 正向两种 WebSocket 连接模式）；
> 2. 全新简约毛玻璃 UI；
> 3. 附带 **1Panel** 一键部署方案（Dockerfile + docker-compose）。

## 功能

- 寻物 / 招领发布、列表筛选与关键词搜索、图片上传、详情页
- 「我的发布」管理（编辑 / 删除 / 标记已解决）
- 管理员归档：可将首页内容归档（不再公开展示），随时取消归档恢复；入口在首页卡片、详情页与管理后台「归档内容」
- Campux OAuth2 登录（PKCE S256），首个登录用户自动成为管理员
- 角色：管理员 / 审核员 / 普通用户
- 审核流：提交待审 → 网页通过/拒绝（可关闭强制审核）
- **SnowLuma（OneBot 11）QQ 群通知**：新稿件推送、带图通知；群内引用 + @机器人 回「通过 / 拒绝」完成审核
- **Campux 对接（QQ 空间发布）**：审核通过后自动把稿件（含图片）投稿到你的 Campux，由 Campux 自己的发布管线发表到 QQ 空间，本站不重复实现 QZone 登录与发布；投稿文案模板可自定义
- 管理后台：用户角色与封禁、站点名称、主页背景图、统计概览、SnowLuma 连接状态、Campux 对接
- 响应式布局（桌面吸顶导航 + 移动端底部栏）

## 技术栈

| 端 | 技术 |
|----|------|
| 前端 | React 18 · Vite · TailwindCSS · React Router · Axios |
| 后端 | Node.js 18+ · Express · better-sqlite3 · express-session · multer · ws |
| 数据库 | SQLite（文件位于 `server/data/lostfound.db`，WAL 模式） |
| 认证 | Campux OAuth2 + PKCE |
| 通知 | SnowLuma / OneBot 11（反向：本站作 WS 服务端；正向：本站作 WS 客户端） |
| QQ 空间发布 | 对接 Campux 开放 REST API（登录 → 传图 → 投稿），由 Campux 完成空间发布 |

## 目录结构

```
lostfound/
├── server/                 # 后端
│   ├── src/
│   │   ├── index.js        # 入口（API + 生产托管 web/dist）
│   │   ├── config.js       # 读取 .env
│   │   ├── db.js           # SQLite 初始化与查询
│   │   ├── oauth.js        # Campux OAuth2 + PKCE
│   │   ├── snowluma.js     # SnowLuma（OneBot 11）通知 / 群内审核
│   │   ├── campux.js       # Campux 对接：审核通过后投稿（由 Campux 发 QQ 空间）
│   │   ├── upload.js       # 上传目录与文件过滤
│   │   ├── middleware/auth.js
│   │   └── routes/         # auth / items / review / admin / site
│   ├── data/               # SQLite 数据库（运行时生成，勿提交）
│   ├── uploads/            # 默认上传目录（运行时生成，勿提交）
│   └── .env.example
├── web/                    # 前端（React + Vite + Tailwind 毛玻璃）
├── Dockerfile              # 1Panel / Docker 部署用
└── docker-compose.yml
```

---

# 一、1Panel 部署（推荐）

## 1.1 准备工作

- 1Panel ≥ v1.10（本例路径以 `/opt` 为例）
- 站点域名一个（也可纯 IP + 端口访问，但登录回调、HTTPS 体验都会受限，**强烈建议配域名**）
- 在 Campux 后台创建 OAuth 应用（见第三节），拿到 Client ID / Secret

## 1.2 上传代码

将本项目上传到服务器，例如 `/opt/lostfound`：

```bash
mkdir -p /opt/lostfound
# 用 1Panel「文件」功能上传压缩包后解压，或：
cd /opt && git clone <你的仓库地址> lostfound   # 若用 git
```

## 1.3 创建 Compose（容器 → 编排 → 创建编排）

1Panel 左侧菜单 → **容器** → **编排** → **创建编排**，模板选择**从路径添加**，路径填 `/opt/lostfound`（目录内有 `docker-compose.yml`）。

创建前先编辑 `docker-compose.yml` 的 `environment` 部分：

| 变量 | 填什么 |
|------|--------|
| `SESSION_SECRET` | 随机长字符串（如 `openssl rand -hex 32` 生成） |
| `CAMPUX_BASE_URL` | Campux 根地址，如 `https://zhs.campux.top` |
| `CAMPUX_CLIENT_ID` / `CAMPUX_CLIENT_SECRET` | Campux 应用凭据 |
| `CAMPUX_REDIRECT_URI` | `https://你的域名/api/auth/callback`（与 Campux 后台登记一致） |
| `FRONTEND_URL` | `https://你的域名` |
| `COOKIE_SECURE` | HTTPS 启用后取消注释并设为 `true` |

端口约定：

- `3011:3000` —— Web/API，1Panel 反向代理目标
- `3002:3002` —— SnowLuma 反向 WebSocket 监听端口（若 SnowLuma 与站点容器同网络可删除）

点击**部署**，等待构建完成（首次构建需拉取镜像与编译依赖，约 3~8 分钟）。

验证：

```bash
curl -s http://127.0.0.1:3011/api/health
# {"status":"ok"}
```

## 1.4 创建网站并反向代理（网站 → 创建网站 → 反向代理）

1. **网站** → **创建网站** → **反向代理**：
   - 主域名：`你的域名`
   - 代理地址：`http://127.0.0.1:3011`
2. **申请 HTTPS 证书**（网站设置 → HTTPS → Let's Encrypt / 已有证书），开启「强制 HTTPS」。
3. 编辑网站配置文件（网站设置 → 配置文件），在 `location /` 中确认包含：

```nginx
location / {
    proxy_pass http://127.0.0.1:3011;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;   # HTTPS 会话 Cookie 依赖此行
    client_max_body_size 20m;                     # 与图片上传上限匹配
}
```

> 说明：QQ 通知走的是后端独立监听的 `3002` WebSocket 端口，**不需要**经过反代/域名，无需为网站配置 WebSocket 升级。

4. 回到 1Panel 容器页**重启** `lostfound` 容器，然后修改环境变量：
   - `CAMPUX_REDIRECT_URI` / `FRONTEND_URL` 改为 `https://`
   - 取消 `COOKIE_SECURE=true` 的注释
   （先跑通再切 HTTPS 也可以，顺序不限，但改完必须重建容器）

## 1.5 不用 Docker 的部署方式（备选）

服务器装 Node.js 18+ 后也可直接运行：

```bash
cd /opt/lostfound
npm run install:all          # 安装前后端依赖
npm run build                # 构建 web/dist
cp server/.env.example server/.env && vi server/.env
cd server && pm2 start src/index.js --name lostfound   # 需已安装 pm2
```

1Panel 网站反向代理同样指向 `http://127.0.0.1:3011`。

## 1.6 数据备份

| 内容 | 位置（容器部署） |
|------|------------------|
| SQLite 数据库 | `/opt/lostfound/data/` |
| 上传图片 | `/opt/lostfound/uploads/` |
| 密钥配置 | `docker-compose.yml` 中 environment |

可用 1Panel「计划任务」定期打包以上目录。

---

# 二、本地开发

```bash
npm run install:all     # = cd server && npm install && cd ../web && npm install
npm run dev             # 后端 :3000 + 前端 :5173
```

浏览器打开 `http://localhost:5173`（Vite 已把 `/api`、`/uploads` 代理到 3000）。

`server/.env` 最小示例：

```env
PORT=3000
SESSION_SECRET=dev-secret-change-me
CAMPUX_BASE_URL=https://campux.example.com
CAMPUX_CLIENT_ID=dev-client-id
CAMPUX_CLIENT_SECRET=dev-client-secret
CAMPUX_REDIRECT_URI=http://localhost:3000/api/auth/callback
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

生产构建：

```bash
npm run build   # 产出 web/dist
npm start       # 启动 server；存在 web/dist 时同时托管前端
```

---

# 三、Campux 登录配置

1. 打开 Campux 站点，用管理员账号进入 **OAuth 应用管理**，启用 OAuth 服务。
2. **新建应用**：

| Campux 字段 | 填写 |
|-------------|------|
| 应用名称 | 如 `拾光寻物` |
| **回调地址 redirectUris** | `https://你的域名/api/auth/callback` |
| Scope | `profile` |
| PKCE | S256（默认） |

3. 复制 **Client ID** 与 **Client Secret**（只显示一次），填入 `docker-compose.yml` / `server/.env`。

**回调地址规则**：路径固定为 `/api/auth/callback`；协议、域名与浏览器地址栏一致；末尾不加 `/`；与 `CAMPUX_REDIRECT_URI` 逐字符相同，并登记在 Campux 的 redirectUris 中。

**常见错误**：

| 报错 | 原因 |
|------|------|
| `redirect_uri 未注册 / mismatch` | 两处不一致、末尾多了 `/`、协议（http/https）不符 |
| `invalid_client` | Client ID/Secret 错误或应用被禁用 |
| 授权后仍未登录 | 反代缺少 `X-Forwarded-Proto`；HTTPS 下未设 `COOKIE_SECURE=true`；浏览器旧 Cookie 干扰 |
| `无效的 state 参数` | 会话丢失，清 Cookie 重试 |

首个成功登录的用户自动成为**管理员**，请第一时间登录并进入 `/admin` 配置站点与角色。

---

# 四、SnowLuma QQ 群通知配置（替代 NapCat）

[SnowLuma](https://github.com/SnowLuma/SnowLuma) 是 NapCat 团队推出的新一代协议端，将 QQ 原生会话转换为 OneBot v11 动作与事件。本站完全按 OneBot 11 标准接入，支持两种连接模式，在 **管理后台 → 系统设置 → SnowLuma QQ 通知** 中切换与配置。

## 4.1 安装 SnowLuma

1. 到 [SnowLuma Releases](https://github.com/SnowLuma/SnowLuma/releases) 下载完整发行包并解压（Lite 版需 Node.js 22.13+）。
2. 运行 `./launcher.sh`（Windows 运行 `launcher.bat`）。
3. 浏览器打开 `http://localhost:5099`，用启动日志中的初始密码登录 **WebUI**。
4. 按引导接入 QQ 进程，扫码登录机器人 QQ，并把机器人拉进接收通知的群。

## 4.2 模式一：反向 WebSocket（默认，推荐）

本站作为 WebSocket **服务端**监听 `3002`（管理后台可改），SnowLuma 作为客户端连入。

**SnowLuma WebUI → 网络配置 / OneBot 连接 → 新建「WebSocket 客户端」：**

| 项 | 值 |
|----|-----|
| 地址 | `ws://服务器IP:3002`（同机可 `ws://127.0.0.1:3002`；SnowLuma 是 Docker 容器时用 `ws://宿主机内网IP:3002` 或加入同一 docker 网络后 `ws://lostfound:3002`） |
| Token | 与管理后台「访问令牌」一致；两边都留空则不鉴权 |

**本站管理后台 → 系统设置：** 连接模式选「反向 WebSocket」，端口填 `3002`，填 Token 与通知 QQ 群号，保存后状态点变绿即成功。

> Docker 部署注意：`docker-compose.yml` 已映射 `3002:3002`；若在后台改了端口，同步修改 compose 并重建容器。跨机器部署需在防火墙/安全组放行该端口。

## 4.3 模式二：正向 WebSocket

SnowLuma 作为 WebSocket **服务端**，本站主动连接过去（SnowLuma 固定监听、本站无需暴露端口时更方便）。

1. **SnowLuma WebUI** → 网络配置 → 新建「WebSocket **服务端**」，记下监听地址（如 `ws://127.0.0.1:3001`）与 access_token。
2. **本站管理后台** → 系统设置 → 连接模式选「正向 WebSocket」，服务端地址填 `ws://127.0.0.1:3001`（SnowLuma 与站点同机；跨机用可达 IP），Token 填一致值，保存。
3. 本站断线后每 5 秒自动重连；保存配置后约 5 秒刷新状态。

## 4.4 通知与群内审核

- 开启「发布需要审核」后，新稿件会实时推送到通知群（带图片，若上传了图片）。
- **群内审核**：审核员**引用**通知消息并 **@机器人**，发送 `通过` / `过` 或 `拒绝` / `拒`。
- 审核人的 QQ 必须已在本站登录过（Campux 账号 QQ 号），且角色为审核员或管理员。

## 4.5 排查

| 现象 | 原因 |
|------|------|
| 后台一直「未连接」 | 地址/端口不通、Token 不一致、模式选错（反向/正向） |
| 群无消息但日志有「已发送」 | 机器人不在群内 / 群号填错 |
| 带图通知失败 | 图片文件缺失，查看容器日志 `docker logs lostfound` |
| 连接频繁断开重连 | 正向模式地址错误或 SnowLuma 服务端未开启 |

---

# 五、QQ 空间发布：对接 Campux（不用重写）

审核通过后，本站把稿件（含图片）**投稿到你已有的 Campux**，由 Campux 自己的发布管线（审核 → 机器人 → QZone 登录态）发表到 QQ 空间。本站只负责「登录 Campux → 上传图片 → 提交稿件」三步 REST 调用，不实现任何 QZone 协议逻辑。

配置入口：**管理后台 → 系统设置 → Campux 对接**。

## 5.1 前置：在 Campux 侧准备一个投稿账号

1. 在你的 Campux 站点注册（或让管理员创建）一个账号，建议直接用**机器人 QQ 号**注册，角色为「成员」即可。
2. 确认 Campux 侧发布链路可用：机器人已接入、QZone 登录态有效（Campux 后台可查）；稿件是否需要在 Campux 内再次审核，取决于 Campux 的「自动过审」配置。

## 5.2 本站配置

| 配置项 | 填什么 |
|--------|--------|
| Campux 服务地址 | 如 `https://campux.example.com`（不带末尾斜杠） |
| 投稿账号（QQ 号） | 上一步注册的账号 |
| 账号密码 | 对应密码，本站用它登录 Campux 换取 JWT（内存缓存，过期自动重登） |

填好后点击 **「测试连接」**（会真实登录一次并校验 token），通过后打开「审核通过后提交到 Campux」开关并**保存设置**。

## 5.3 行为说明

- 触发时机：**网页审核通过 / QQ 群内审核通过 / 免审核直发**，三处均会投稿；归档稿件不投稿。
- 投稿内容：文案模板渲染的正文 + 稿件图片（先调 Campux 上传接口，再以附件 key 投稿）；`uuid` 固定为 `lostfound-item-<稿件id>`，Campux 侧幂等。
- 文案模板占位符：`{站点名} {编号} {类型} {标题} {描述} {地点} {联系方式} {链接}`，留空用默认模板。
- 失败处理：提交失败**不影响审核**，仅在服务端日志记录（`[Campux]` 前缀）；常见原因：地址不通、账号密码错误、Campux 侧稿件数超限。

## 5.4 排查

| 现象 | 原因 |
|------|------|
| 测试连接报「账号或密码错误」 | Campux 账号密码不对，或该账号已被封禁 |
| 测试连接报 HTTP 404 | 服务地址写错（多了路径/末尾斜杠），或 Campux 版本过老无 `/v1` 接口 |
| 已提交但空间没动态 | Campux 侧未自动过审（去 Campux 后台审核），或 Campux 机器人 / QZone 登录态失效 |
| 说说无图 | 稿件未上传图片，或服务器上图片文件缺失 |

---

# 六、常用 API（排障用）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 无 | 健康检查 `{"status":"ok"}` |
| GET | `/api/site` | 无 | 站点名、主页背景图 |
| GET | `/api/auth/login` | 无 | 发起 Campux 登录 |
| POST | `/api/auth/logout` | Cookie | 退出 |
| GET | `/api/auth/me` | Cookie | 当前用户 |
| GET | `/api/items` | 无 | 已通过物品列表 |
| GET | `/api/items/my` | 登录 | 我的全部稿件 |
| POST/PUT/DELETE | `/api/items...` | 登录 | 发布 / 编辑 / 删除 |
| POST | `/api/items/:id/resolve` | 登录 | 标记已解决 |
| POST | `/api/items/:id/archive` | admin | 归档（首页不再展示） |
| POST | `/api/items/:id/unarchive` | admin | 取消归档（恢复展示） |
| GET | `/api/admin/archived` | admin | 已归档内容列表 |
| GET/POST | `/api/review/...` | reviewer/admin | 审核 |
| GET/PUT | `/api/admin/...` | admin | 用户 / 设置 / 统计 |
| GET | `/api/admin/snowluma-status` | admin | SnowLuma 连接状态 |
| GET | `/api/admin/campux-status` | admin | Campux 对接状态 |
| POST | `/api/admin/campux/test` | admin | 测试 Campux 连接（登录 + token 校验） |

---

# 七、安全清单

- `SESSION_SECRET`、Campux Client Secret、SnowLuma Token、Campux 投稿账号密码只放在服务器配置中，禁止提交 Git。
- 回调只登记可信域名，勿用通配。
- 生产优先 HTTPS，并设置 `COOKIE_SECURE=true`。
- SQLite + 本地会话不适合多实例横向扩展，请单实例部署。
- 定期备份 `data/`、`uploads/`。

---

## 许可说明

本项目架构参考 [Whimsicalid/Lofo](https://github.com/Whimsicalid/Lofo) 重写实现（Lofo 未附带开源许可证，使用前请遵循其仓库要求）。代码为本项目独立编写，仅作学习与校园社区使用。
