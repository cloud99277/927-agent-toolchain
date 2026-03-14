# 部署方式选择矩阵

> **用途**：Phase 4（部署上线）时，根据项目类型选择合适的部署方式

---

## 选择矩阵

| 项目类型 | 推荐部署方式 | 备选方式 | 需要什么 |
|---------|------------|---------|---------|
| **静态 Web 前端** | GitHub Pages | Vercel / Netlify / Firebase Hosting | git push 即部署 |
| **需要 HTTPS + OAuth 的 Web** | GitHub Pages + Actions | Firebase Hosting | HTTPS 自动配置 |
| **Node.js 后端** | Railway / Render | Docker + VPS | 需要持续运行的服务 |
| **Python 后端** | Railway / Render | Docker + VPS | 需要持续运行的服务 |
| **CLI 工具（Python）** | PyPI 发布 | GitHub Release | pip install 安装 |
| **CLI 工具（Node）** | npm publish | GitHub Release | npm install -g 安装 |
| **Skill / 配置文件** | 复制到 ~/.ai-skills/ | Git 管理 + symlink | 无需网络部署 |
| **文档型** | 不需要部署 | — | Phase 4 跳过 |

---

## GitHub Pages 部署（最常用）

需要 GitHub Actions workflow：

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 部署前通用检查清单

```
□ 配置文件中的占位符是否已全部替换？
□ .gitignore 是否排除了 secrets / .env / node_modules？
□ 外部服务（数据库/Auth/CDN）的授权域名是否已添加？
□ 需要 HTTPS 吗？（OAuth 登录 = 必须 HTTPS）
□ 目标环境的域名/URL 是否已确认？
```
