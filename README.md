# Misaka 文件下载站

一个 Vue 3 + Vite + Naive UI 的 GitHub Release 文件下载页。页面启动时读取 `public/config.toml`，自动获取仓库信息；进入项目详情后再按页读取 Release，并为 GitHub API 数据保留 30 分钟本地缓存。

## 配置仓库

编辑 `public/config.toml`：

```toml
title = "Misaka 文件下载站"

[[repositories]]
repo = "vuejs/core"
name = "Vue Core"
```

## 本地开发

```bash
npm install
npm run dev
```

前端会优先直连 GitHub REST API。直连失败后会调用 `/api/github`，该路由由 `edge-functions/api/github.js` 提供。右上角设置可以填写 GitHub 个人访问令牌，令牌只会保存在当前浏览器本地。设置里还可以控制是否隐藏没有产物的版本、`.txt` / `.md` 校验文件，这两项默认开启。

完整联调后端代理时：

```bash
$env:PAGES_SOURCE = "skills"
edgeone pages dev
```

## 可选环境变量

在 EdgeOne Pages 控制台配置 `GITHUB_TOKEN` 后，后端代理会自动携带它请求 GitHub，可获得更高的 API 限额。
