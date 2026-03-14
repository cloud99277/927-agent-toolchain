# Web 前端踩坑预警库

> **适用**：Web 前端项目（HTML/CSS/JS、React、Vue 等）
> **维护方式**：每次 Web 项目经验沉淀时追加

---

## 🔴 P0: 认证状态机必须覆盖全部分支

```
场景：OAuth/Firebase Auth 等认证集成后，某些状态下页面白屏
根因：init() 只在 onAuthChange(user) 的 if(user) 中渲染，else 分支无操作
修复：每个认证状态（未配置→未登录→已登录）都必须有对应的 UI 渲染
预防：
  - 画出认证状态机的全部分支
  - init() 末尾加兜底 render
  - 开发环境模拟「配置已填 + 未登录」场景
```

## 🟡 P1: CDN 引入的版本号必须查最新

```
场景：CDN 引用的 SDK 版本过旧或与 API 不兼容
修复：写 CDN URL 时查官方文档获取最新版本
预防：在 HTML 的 CDN script 标签旁加注释标注查证日期
```

## 🟡 P2: OAuth 登录需要 HTTPS

```
场景：Google/GitHub 等 OAuth 登录在 file:// 或 http:// 下不工作
根因：OAuth 安全策略要求 HTTPS origin
修复：部署到 HTTPS 环境（GitHub Pages / Firebase Hosting / Vercel）
预防：部署检查清单第一条
```

## 🟡 P3: 移动端输入框优化

```
场景：手机上输入数字需要切换键盘，操作效率低
修复：使用 inputmode="decimal" 或 inputmode="numeric"
预防：所有数字输入框默认加 inputmode 属性
```

## 🟡 P4: 零 npm 项目的文件加载顺序

```
场景：多个 JS 文件之间有依赖关系，但没有模块加载器
根因：没有 import/export 时，模块间通信靠全局变量
修复：script 标签按依赖顺序排列（数据层→组件层→应用层）
预防：文件数控制在 ≤5 个，拥有清晰的分层
```

## 🟢 P5: 离线模式下所有功能是否可用

```
场景：断网后应用部分功能不可用
修复：外部服务调用 try-catch + localStorage 降级
```
