# Skill IO Convention

> **版本**：1.0
> **状态**：草案
> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **最后更新**：2026-03-08

---

## 1. 目的

定义 skill 之间的标准输入输出格式，让编排引擎可以自动匹配"谁的 output 契合谁的 input"。

**解决的问题**：当前 90+ skill 的输入输出格式完全不同，没有标准约定。如果没有 IO 契约，`agent-orchestrator` 无法通用化编排，只能变成一个巨大的"胶水适配器"。

**设计哲学**：

- **Fabric 式极简**：最简形式就是 Markdown 文件（stdin/stdout 的文件化版本）
- **渐进式采纳**：现有 skill 不强制改造，新 skill 推荐声明
- **向下兼容**：IO 声明是可选的，没有 IO 声明的 skill 照常工作

---

## 2. IO 声明格式

### 2.1 方案选择

基于兼容性测试（T0.1）的结果，采用 **Frontmatter 方案**：在 SKILL.md 的 YAML frontmatter 中新增可选的 `io` 字段。

> **兼容性验证（2026-03-08）**：全部 4 个目标 Agent 均通过兼容性测试，`io:` 字段被安全忽略，不影响 skill 的发现和执行。
> - ✅ Antigravity、Claude Code、Gemini CLI — 正常发现并执行
> - ✅ Codex CLI — 正常发现并解析（因遵守 "Do not use" 描述拒绝执行，但 io 字段本身无解析错误）

### 2.2 Frontmatter `io` 字段格式

```yaml
---
name: <skill-name>
description: <skill-description>
io:
  input:
    - type: <type-id>          # 必填，引用 type-registry.json 中的类型
      description: <描述>       # 必填，说明这个输入的含义
      required: true|false     # 可选，默认 true
  output:
    - type: <type-id>          # 必填
      description: <描述>       # 必填
      path_pattern: <模式>     # 可选，输出文件的路径模式
---
```

### 2.3 完整示例

```yaml
---
name: translate
description: 通用翻译工具...
io:
  input:
    - type: markdown_file
      description: 需要翻译的 Markdown 文件
    - type: url
      description: 需要获取并翻译的 URL
      required: false
  output:
    - type: markdown_file
      description: 翻译后的 Markdown 文件
      path_pattern: "{source-name}-{target-lang}/translation.md"
---
```

### 2.4 备选方案（独立文件）

如果 frontmatter 方案与某个 Agent 不兼容，则使用独立文件：

```
skill-name/
├── SKILL.md           ← 不修改
└── io-contract.yaml   ← 新增，与 SKILL.md 同级
```

`io-contract.yaml` 的格式与 frontmatter 中的 `io` 字段完全相同：

```yaml
schema_version: "1.0"
input:
  - type: markdown_file
    description: 需要翻译的 Markdown 文件
output:
  - type: markdown_file
    description: 翻译后的 Markdown 文件
```

---

## 3. 标准类型注册表

所有 IO 声明中的 `type` 字段必须引用标准类型注册表中的类型 ID。

完整类型清单见 [`type-registry.json`](./type-registry.json)。

### 当前已定义类型

| 类型 ID | 描述 | 文件格式 |
|---------|------|---------|
| `text` | 纯文本字符串 | stdin/stdout |
| `markdown_file` | Markdown 文档 | `.md` |
| `url` | 网页/资源 URL | 字符串 |
| `image_file` | 图片文件 | `.png/.jpg/.webp/.gif/.svg` |
| `json_data` | 结构化 JSON | `.json/.jsonl` |
| `html_file` | HTML 文档 | `.html` |
| `directory` | 目录路径 | 文件系统路径 |

### 扩展类型注册表

当现有类型不能表达某个 skill 的 IO 时：

1. 检查是否可以用现有类型 + `description` 充分描述
2. 如果不能，在 `type-registry.json` 中新增类型
3. 新增类型应来自实际 skill 的需求，不凭空设计

---

## 4. 编排匹配规则

### 4.1 基本匹配

上一步 skill 的 `output.type` == 下一步 skill 的某个 `input.type` → 可串联。

```
skill_A.output[0].type ∈ skill_B.input[].type → A → B 可串联
```

### 4.2 类型兼容规则

某些类型之间存在兼容关系：

| 原类型 | 兼容目标类型 | 说明 |
|--------|------------|------|
| `markdown_file` | `text` | Markdown 是文本的子类型 |
| `text` | `markdown_file`, `url` | 文本在语义上可能是文件路径或 URL |

> **注意**：`text → url` 的兼容是弱匹配，编排引擎应优先使用精确匹配。

### 4.3 多输入处理

当一个 skill 声明了多个 input 类型时（例如 translate 接受 `markdown_file` 或 `url`），只要上游 output 匹配**任意一个** input 类型即可串联。

### 4.4 匹配优先级

1. **精确匹配**：output type == input type
2. **兼容匹配**：output type 在 compatibility_rules 中定义了到 input type 的兼容
3. **不匹配**：无法自动串联

---

## 5. 渐进式采纳策略

### 新 skill

**推荐声明** IO 契约。`skill-creator` 在创建新 skill 模板时应包含 `io` 字段的占位符。

### 现有 skill

**可选，不强制改造**。没有 IO 声明的 skill 照常工作。编排引擎在遇到没有 IO 声明的 skill 时，不做类型检查，由用户/Agent 自行判断兼容性。

### 采纳顺序建议

1. **Phase 1 试点**：5 个高频 skill（x-to-markdown, translate, post-to-wechat, url-to-markdown, skill-lint）
2. **自然扩散**：当新 skill 创建或现有 skill 被修改时，顺手添加 IO 声明
3. **编排驱动**：当某条编排链需要某个 skill，该 skill 自然被要求添加 IO 声明

---

## 6. 示例

### 6.1 单 Skill IO 声明

**baoyu-danger-x-to-markdown**：

```yaml
---
name: baoyu-danger-x-to-markdown
description: Converts X (Twitter) tweets and articles to markdown...
io:
  input:
    - type: url
      description: X (Twitter) 推文或文章的 URL
  output:
    - type: markdown_file
      description: 转换后的 Markdown 文件，包含 YAML front matter
      path_pattern: "x-to-markdown/{username}/{tweet-id}/{content-slug}.md"
---
```

### 6.2 多 Skill 编排链匹配

**链条**：`x-to-markdown → translate → post-to-wechat`

```
x-to-markdown
  input:  url
  output: markdown_file  ──┐
                            │ ✅ 精确匹配
translate                   │
  input:  markdown_file  ←──┘
  input:  url
  output: markdown_file  ──┐
                            │ ✅ 精确匹配
post-to-wechat              │
  input:  markdown_file  ←──┘
  input:  text
  output: text
```

结果：整条链的类型自动匹配通过 ✅

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-08 | 1.0 | 初始版本，定义 IO 声明格式、类型注册表、匹配规则、采纳策略 |
