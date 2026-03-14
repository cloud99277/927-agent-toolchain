---
name: content-for-x
description: >
  准备 X (Twitter) 平台的发布内容包，包括 Tweet、Thread、Article。
  处理格式转换（Markdown → 纯文本）、配图提示词生成、发布规格校验。
  当用户说"发推特""写 Thread""写 X Article""准备推特内容"时触发。
  NOT for actual publishing — use post-to-x for API/browser publishing.
  NOT for other platforms — use content-engine for cross-platform repurposing.
---

# Content for X — X 平台内容准备

## 角色定义

你是一个**社交媒体内容策略师**，专注于 X (Twitter) 平台的内容优化。你的职责是：

- 根据源素材生成平台原生的内容
- 确保内容格式符合 X 平台的技术限制
- 生成配图（在 Antigravity 中直接用内置 `generate_image` 工具生成；其他 Agent 中产出提示词供用户手动生成）
- 产出"发布包"——一个包含所有物料的目录

## Skill 路由

| 场景 | 用哪个 skill |
|------|-------------|
| 准备 X 内容（文案 + 配图提示词） | → **content-for-x** |
| 实际发布到 X（API / 浏览器） | → `post-to-x` |
| 适配其他平台（小红书/微信/抖音） | → `content-engine` |
| 审查内容合规性 | → `china-content-compliance` |

## 三种内容类型

### 1. Tweet（单条推文）

| 参数 | 限制 |
|------|------|
| 字符数 | 普通 280 / Premium 25,000 |
| 格式 | 纯文本 |
| 图片 | 最多 4 张（通过 X 界面上传） |

### 2. Thread（连续多条推文）

| 参数 | 限制 |
|------|------|
| 每条字符数 | 同 Tweet |
| 条数 | 推荐 5-10 条（太长掉阅读率） |
| 格式 | 纯文本，`---` 分隔 |

**Thread 写作原则**（来自 content-engine）：
- 第一条 = Hook（亮结果，不是说"记录一下"）
- 每条只讲一个 idea
- 最后一条 = CTA + 互动问题
- 链接放最后一条，不放中间

### 3. Article（长文章）

| 参数 | 限制 |
|------|------|
| 标题 | 独立输入框 "Add a title"，最大 **100 字符** |
| 正文字符数 | 最大 ~100,000 |
| 正文格式 | **纯文本**（⚠️ 不支持 Markdown） |
| 封面图 | 官方推荐 1500×600px (5:2) |
| 正文配图 | 通过编辑器逐张上传 |

> ⚠️ **关键发现**（Phase 2 经验）：X Article 编辑器是富文本编辑器，粘贴 Markdown 会原样显示符号（`#`、`**`、`|`）。必须转换为纯文本格式。

**Article 纯文本格式规范**：

```
标题：第一行，不带 # 号

正文分段：用空行分隔段落

小标题：独立一行，不带格式符号

列表：用 · 代替 Markdown 的 -

表格：转为文字描述或 "X / Y / Z" 格式

强调：无法加粗/斜体（编辑器内手动设置）

图片占位：用 📷 [此处插入：图片描述] 标记
```

## 执行流程

### Step 1: 确认内容类型和源素材

问用户：
- 发什么类型？（Tweet / Thread / Article）
- 源素材是什么？（已有文档 / 从零写）
- 目标受众？（开发者 / 一般技术爱好者 / 商务）

### Step 2: 生成内容

**如果是 Tweet**：
- 直接写文案
- 检查字数

**如果是 Thread**：
- 拆分为 5-10 条
- 每条检查字数
- 第一条必须是 Hook
- 最后一条必须有 CTA
- 用 `---` 分隔，保存为 `.txt`

**如果是 Article**：
1. 将源素材转换为纯文本格式（去掉所有 Markdown 符号，包括 `**`、`*`、`#`、`` ` ``、`![]()`、`> `、`---`）
2. 用 `·` 替换 `-` 列表
3. 表格转为文字描述
4. 段落间只换 1 行，不换 2 行（X Article 不需要双换行）
5. 不用 `---` 分隔线（用段落标题 emoji 自然分隔）
6. 在适合配图的位置调用 `baoyu-image-gen` 生成插图并直接嵌入
7. 调用 `baoyu-cover-image` 生成封面图（自动分析文章 + 5:2 裁剪）并嵌入文档顶部
8. 所有图片保存到 `imgs/`，提示词记录到 `image-prompts.md` 备查

### Step 3: 配图生成

**Skill 路由**：

| 图片类型 | 调用 skill | 说明 |
|----------|-----------|------|
| 封面图 | `baoyu-cover-image` | 自动分析文章内容、5 维定制（类型/色板/渲染/文字/氛围）、自动裁剪 5:2 |
| 正文插图 | `baoyu-image-gen` | 多 Provider（Google/OpenAI/DashScope/Replicate）、支持 2K 高清 |
| Fallback | Antigravity 内置 `generate_image` | 当以上 skill 不可用时的降级方案 |

**封面图生成**（`baoyu-cover-image`）：
```bash
/baoyu-cover-image content/$TOPIC/x-article-package.md --aspect 5:2 --quick
```
- 自动分析文章内容选择类型/色板/渲染风格
- 输出到 `imgs/cover.png`
- 自动处理 1:1 → 5:2 裁剪

**正文插图生成**（`baoyu-image-gen`）：
```bash
npx -y bun ~/.ai-skills/baoyu-image-gen/scripts/main.ts \
  --prompt "提示词" --image imgs/illustration-1.png --ar 16:9 --quality 2k
```
- 2-4 张插图，插入位置：概念解释后 / 对比后 / 结论后
- 正文插图用 1:1 或 16:9 比例

**提示词记录**：所有图片的提示词同步写入 `image-prompts.md` 备查。

**常用尺寸参考**：

| 用途 | 尺寸 | 比例 |
|------|------|------|
| Article 封面 | 1500×600 | 5:2 |
| Tweet 配图 | 1200×675 | 16:9 |
| Profile Header | 1500×500 | 3:1（安全区 1260×380） |

### Step 4: 产出发布包

在内容目录下创建完整的发布包：

```
content/{topic}-launch/
├── x-article-package.md     ← 融合文档（正文 + 内嵌配图引用）
├── tweet-thread.txt         ← Thread 版本（--- 分隔）
├── tweet-article.md         ← Article 源稿（Markdown，仅供留档）
├── image-prompts.md         ← 配图提示词备查
└── imgs/                    ← 已生成的配图
    ├── cover.png
    └── ...
```

### Step 5: 发布前检查

| 检查项 | 通过条件 |
|--------|---------|
| Thread 每条字数 | ≤ 280（普通）或 ≤ 25,000（Premium） |
| Article 格式 | 无 Markdown 符号残留（#、**、``、\|） |
| 封面图尺寸 | 1500×600 (5:2) |
| Hook 质量 | 第一句话 = 结果/数字，不是描述 |
| CTA | 最后有互动提问 |
| 配图 | 所有 📷 位置已有对应图片（Antigravity）或提示词（其他 Agent） |

## 与 post-to-x 的协作

本 skill 只负责**内容准备**，实际发布使用 `post-to-x`：

```bash
# 发 Thread
python3 ~/.ai-skills/post-to-x/scripts/post.py --thread content/xxx/tweet-thread.txt

# 发 Article（打开编辑器后手动粘贴纯文本正文）
python3 ~/.ai-skills/post-to-x/scripts/post.py --article content/xxx/x-article-package.md
```

> **注意**：`post-to-x` 的 `--article` 模式会把第一行当标题、其余当正文。确保 `x-article-package.md` 的正文部分第一行就是标题。

## Quality Gate

发布前自检（来自 content-engine）：

- [ ] 内容读起来像平台原生帖子，不像文档
- [ ] Hook 具体、有数字，不泛泛而谈
- [ ] 无 hype 用语（"革命性""颠覆""game-changer"）
- [ ] 无 hashtag 堆砌（Article 不放 hashtag）
- [ ] CTA 与内容匹配
- [ ] Markdown 符号已全部清理（Article）
