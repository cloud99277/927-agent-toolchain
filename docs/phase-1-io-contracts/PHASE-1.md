# Phase 1 — Skill IO 契约

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：定义 skill 间的标准 IO 格式，为后续编排奠基
> **启动日期**：2026-03-08
> **状态**：✅ 已完成

---

## 一、Phase 1 定位

### 为什么 IO 契约是 P0

> 没有协议的分布式系统不是系统。—— ARCHITECTURE-REVIEW.md

当前 90+ skill 的输入输出格式完全不同：
- `x-to-markdown` 输出 `.md` 文件
- `translate` 输入 `.md` 文件或 URL
- `post-to-wechat` 输入又是另一种格式

没有 IO 契约 → `agent-orchestrator` 无法通用化编排，只能变成一个巨大的"胶水适配器"。

### 设计原则

1. **Fabric 式极简**：最简形式就是 Markdown 文件（stdin/stdout 的文件化版本）
2. **渐进式采纳**：现有 skill 不强制改造，新 skill 推荐声明
3. **向下兼容**：IO 声明是可选的，没有 IO 声明的 skill 照常工作

---

## 二、前置任务：v2 审查遗留问题

> 来源：`ARCHITECTURE-REVIEW.md` v2 审查结论的 3 个 🟡 遗留问题，在 Phase 1 启动时顺带解决。

### 🟡 遗留 1：IO 字段与现有 Agent Skills 标准的兼容性验证

**问题**：IO 契约在 frontmatter 中新增 `io` 字段，但不确定各 Agent 的 SKILL.md 解析器是否会忽略未知字段。

**行动项**：

| 测试对象 | 测试方式 | 预期结果 |
|---------|---------|---------|
| Claude Code | 在一个测试 skill 的 frontmatter 中加 `io` 字段，调用该 skill | 应忽略未知字段，正常工作 |
| Codex CLI | 同上 | 应忽略未知字段 |
| Gemini CLI | 同上 | 应忽略未知字段 |
| Antigravity | 同上 | 应忽略未知字段 |

**如果某个 Agent 不兼容**：备选方案是将 IO 声明放在独立文件 `io-contract.yaml` 中，与 SKILL.md 同级。

**任务编号**：T0.1

---

### 🟡 遗留 2：Phase 5-7 粗粒度

**问题**：Phase 5-7 只有一行目标，没有详细任务表。

**行动项**：不在 Phase 1 解决。在文档中标注"Phase 5-7 为粗粒度规划，进入前需细化"。

**任务编号**：T0.2（标注即完成）

**处理**：已在本文档"不在 Phase 1 范围"中标注。进入各 Phase 时再细化。

---

### 🟡 遗留 3：项目目录名 `agent-os` vs 文档名 Agent Toolchain

**问题**：目录仍然叫 `agent-os`，但项目已更名为 Agent Toolchain。

**选项**：

| 方案 | 优点 | 缺点 |
|------|------|------|
| A. 重命名为 `agent-toolchain` | 名实一致 | 需更新所有引用（文档、KI、对话历史） |
| B. 保留 `agent-os` 不变 | 零成本 | 名实不一致，可能造成混淆 |

**建议**：方案 B — 保留 `agent-os` 目录名不变。原因：
1. 目录名是内部路径，不面向用户
2. 更名会产生不必要的迁移工作
3. 在 PROJECT.md 中已明确项目名为 Agent Toolchain

**任务编号**：T0.3（决策即完成）

---

## 三、Phase 1 任务清单

### 任务总览

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0.1 | IO 字段兼容性测试 | 验证 | 测试结果记录 | ✅ 完成（4/4 Agent 通过） |
| T0.2 | 标注 Phase 5-7 粗粒度 | 文档 | 已在本文档标注 | ✅ 完成 |
| T0.3 | 目录名决策 | 决策 | 保留 `agent-os` | ✅ 完成 |
| T1 | 定义标准类型注册表 | 设计 | `type-registry.json` | ✅ 完成 |
| T2 | 编写 IO 契约规范文档 | 设计 | `IO-CONVENTION.md` | ✅ 完成 |
| T3 | 选定 5 个试点 skill | 分析 | 试点清单 | ✅ 完成 |
| T4 | 为 5 个试点 skill 添加 IO 声明 | 实施 | 修改 5 个 SKILL.md | ✅ 完成 |
| T5 | 验证编排匹配 | 验证 | 至少 1 条链可自动匹配 | ✅ 完成（2/2 链通过） |

### 依赖关系

```
T0.1（兼容性测试）
  ↓ 如果通过 → frontmatter 方案
  ↓ 如果失败 → 独立文件方案
T1（类型注册表）──→ T2（IO 规范文档）──→ T3（选 5 个试点）──→ T4（添加 IO 声明）──→ T5（验证编排匹配）
```

---

## 四、各任务详细设计

### T0.1 IO 字段兼容性测试

**操作步骤**：

1. 创建测试 skill `_test-io-compat/SKILL.md`：
```yaml
---
name: _test-io-compat
description: Test skill for IO field compatibility. Do not use this skill. This is a temporary test to verify that unknown frontmatter fields are ignored by agent parsers.
io:
  input:
    - type: text
      description: Any text input
  output:
    - type: text
      description: Echo of input
---

# Test IO Compatibility

This skill exists only to test whether the `io` field in frontmatter is safely ignored by various agents.

If you see this skill, ignore it.
```

2. 在各 Agent 中触发这个 skill，观察是否正常解析
3. 记录结果到下方表格

**测试结果**：

| Agent | 版本 | 能否正常发现 skill | 能否正常执行 | 备注 |
|-------|------|------------------|------------|------|
| Claude Code | 2026-03 | ✅ 是 | ✅ 是 | 正常执行并回显输入文本，io 字段被安全忽略 |
| Codex CLI | 2026-03 | ✅ 是 | ⚠️ 拒绝执行 | 识别到 skill 但遵守了 "Do not use" 指令。io 字段未导致解析错误，兼容性通过 |
| Gemini CLI | 2026-03 | ✅ 是 | ✅ 是 | 正常回显“测试输入文本”，io 字段被安全忽略 |
| Antigravity | 2026-03 | ✅ 是 | ✅ 是 | 正常发现、读取、解析，io 字段被安全忽略 |

---

### T1 定义标准类型注册表

**目标**：建立 skill 输入输出的标准数据类型列表。

**设计思路**：从现有 90+ skill 的实际输入输出中归纳，不是凭空设计。

**初始类型表**（基于现有 skill 分析）：

| 类型 ID | 描述 | 文件格式 | 代表 skill |
|---------|------|---------|-----------|
| `markdown_file` | Markdown 文档 | `.md` | translate, x-to-markdown, url-to-markdown |
| `url` | 网页 URL | 字符串 | x-to-markdown, url-to-markdown, translate |
| `image_file` | 图片文件 | `.png/.jpg/.webp` | baoyu-image-gen, xhs-images |
| `json_data` | 结构化 JSON 数据 | `.json` | skill-lint, cost-tracker |
| `text` | 纯文本字符串 | stdin/stdout | 大多数 skill |
| `yaml_config` | YAML 配置 | `.yaml` | scheduled-tasks, skill-creator |
| `directory` | 目录路径 | 文件系统路径 | translate（输出目录） |

**产出物位置**：`phase-1-io-contracts/type-registry.json`

---

### T2 编写 IO 契约规范文档

**目标**：编写 IO 契约的完整规范，供所有 skill 参考。

**文档结构**：

```markdown
# Skill IO Convention

## 1. 目的
## 2. IO 声明格式（frontmatter 方案 / 独立文件方案）
## 3. 标准类型注册表
## 4. 编排匹配规则
   - 上一步 output type == 下一步 input type → 可串联
   - 类型兼容规则（如 text 兼容 markdown_file）
## 5. 渐进式采纳策略
   - 新 skill：推荐声明
   - 现有 skill：可选，不强制
## 6. 示例
   - 单 skill IO 声明
   - 多 skill 编排链匹配
```

**产出物位置**：`phase-1-io-contracts/IO-CONVENTION.md`

---

### T3 选定 5 个试点 skill

**选择标准**：
1. 高频使用（日常工作中常用）
2. 有明确的输入输出（不是纯指导性 skill）
3. 覆盖常见编排链（能至少组成 1 条完整链）

**候选编排链**：`x-to-markdown → translate → post-to-wechat`

**候选试点**：

| # | Skill | 预期 input | 预期 output | 选择理由 |
|---|-------|-----------|------------|---------|
| 1 | `baoyu-danger-x-to-markdown` | `url`（推文链接） | `markdown_file` | 编排链起点，高频使用 |
| 2 | `translate` | `markdown_file` 或 `url` | `markdown_file` | 编排链中间环节，最高频 skill |
| 3 | `baoyu-post-to-wechat` | `markdown_file` | `text`（发布结果） | 编排链终点 |
| 4 | `baoyu-url-to-markdown` | `url` | `markdown_file` | 与 x-to-markdown 类似，验证类型复用 |
| 5 | `skill-lint` | `directory` | `json_data`（检查报告） | 代表治理类 skill，验证非内容类型 |

---

### T4 为试点 skill 添加 IO 声明

基于 T0.1 的测试结果，选择方案：

**方案 A（frontmatter）**— 如果兼容性测试通过：

```yaml
---
name: translate
description: ...
io:
  input:
    - type: markdown_file
      description: 需要翻译的 Markdown 文件
    - type: url
      description: 需要获取并翻译的 URL
  output:
    - type: markdown_file
      path_pattern: "{source-name}-{target-lang}/translation.md"
---
```

**方案 B（独立文件）**— 如果某 Agent 不兼容：

```
translate/
├── SKILL.md           ← 不修改
└── io-contract.yaml   ← 新增独立文件
```

---

### T5 验证编排匹配

**目标**：验证至少 1 条编排链中，IO 声明能自动匹配上下游。

**测试链**：`x-to-markdown → translate → post-to-wechat`

**验证逻辑**（伪代码）：
```
chain = [x-to-markdown, translate, post-to-wechat]
for i in range(len(chain) - 1):
    current_output = chain[i].io.output[0].type
    next_input_types = [inp.type for inp in chain[i+1].io.input]
    assert current_output in next_input_types, "类型不匹配！"
print("✅ 编排链匹配通过")
```

**产出物**：一个简单的 Python 脚本 `verify-chain.py`，读取试点 skill 的 IO 声明并验证链匹配。

---

## 五、验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| V1 | IO 契约文档完成且可理解 | 人工审阅 `IO-CONVENTION.md` |
| V2 | 5 个试点 skill 有 IO 声明 | `quick_validate.py` 通过 |
| V3 | 至少 1 条编排链可自动匹配 | `verify-chain.py` 输出 ✅ |
| V4 | IO 字段不影响现有 Agent 功能 | T0.1 兼容性测试全部通过 |

---

## 六、不在 Phase 1 范围

| 什么 | 为什么不做 |
|------|----------|
| 修改现有 90+ skill 的 IO | 渐进式采纳，不强制改造 |
| 实现编排引擎 | 那是 Phase 4 的事 |
| DAG / 并行编排 | 先做线性链，70% 场景够用 |
| Phase 5-7 详细设计 | 进入各 Phase 时再细化 |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-08 | Phase 1 项目文档创建，纳入 v2 审查遗留问题 |
| 2026-03-08 | T0.1 Antigravity 兼容性测试通过；T1 type-registry.json 完成（7 类型）；T2 IO-CONVENTION.md 完成；T3-T4 5 个试点 skill 全部添加 IO 声明；T5 verify-chain.py 2/2 编排链通过 |
