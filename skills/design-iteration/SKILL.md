---
name: design-iteration
description: >
  Drive document revision based on audit findings — consolidate review
  conclusions, apply fixes with change tracking, and trigger re-audit until
  convergence. Use when project-audit has produced a review report and the
  target document needs systematic revision. NOT for the initial audit itself
  — use project-audit instead. NOT for creating new documents — use
  project-planner instead.
  当用户提到"根据审查修订""落实审查意见""修一下审查发现的问题""迭代设计"时触发。
---

# Design Iteration — 审查驱动的设计迭代

## 角色定义

你是一个 **设计迭代工程师**，擅长将审查结论系统性地落实到设计文档中，确保每条修改可追溯、每轮迭代可量化。

> **核心原则**：审查的价值不在于报告本身，而在于报告被落实到文档的那一刻。审查报告不落地等于白做。

## Skill 路由

| 场景 | 用哪个 skill |
|------|------------|
| "审查这份文档" | → `project-audit` |
| "根据审查结论修改文档" | → **design-iteration** |
| "创建新项目文档" | → `project-planner` |
| "调研竞品方案" | → `deep-research` |

## 触发条件

- `project-audit` 产出了审查报告（含 🔴/🟡/🟢 分级问题）
- `code-review` 产出了代码审查报告（含 Blocking/Non-blocking 分级）
- 用户说"按审查意见修改" / "落实审查结论"
- 存在审查报告但目标文档/代码尚未修订

## 输入

| 输入 | 必须 | 说明 |
|------|------|------|
| 审查报告 | ✅ | `*-REVIEW.md` 或审查对话的结论 |
| 目标文档/代码 | ✅ | 被审查的文档（如 `PROJECT.md`）或代码文件（如 `audit.py`） |
| 其他审查报告 | 可选 | 如果有多份审查（project-audit + code-review），全部输入并合并 |

## 执行流程

### Step 1: 汇总审查结论

当有多份审查报告时，先合并为统一清单：

```markdown
## 审查结论汇总

### 🔴 结构性问题（必须修）
| # | 来源 | 问题 | 建议修改 | 影响范围 |
| 1 | [架构审查] | ... | ... | 第X节 |
| 2 | [竞品调研审查] | ... | ... | 第Y节 |

### 🟡 设计盲点（应该修）
| # | 来源 | 问题 | 建议 |

### 🟢 优化建议（可选修）
| # | 来源 | 建议 |
```

**排序规则**：🔴 最先处理 → 🟡 → 🟢

### Step 2: 制定修订计划

确认修订范围（**先让用户看计划再动手**）：

```markdown
## 修订计划

目标文档：[路径]
审查来源：[N] 份审查报告
修订项数：🔴 X 个 + 🟡 Y 个 + 🟢 Z 个

### 修订清单
| # | 修订内容 | 类型 | 影响章节 | 预计工作量 |
| 1 | [描述] | 🔴 | 第X节 | 低/中/高 |

### 本轮不修的（说明为什么）
| # | 内容 | 原因 |
```

> **原则**：先确认再动手。不要直接开始改文档。

### Step 3: 逐条修订

按计划逐条执行修订。**每条修订必须**：

1. **标注变更来源**：`> v1→v2 变更：[原因]，来源：[审查报告 #N]`
2. **保留原文对照**（在重大修改处）
3. **不引入新问题**——修订时只改审查指出的点，不要"顺手"改别的

> **低风险例外**（Phase 2 经验）：工作量 ≤5 分钟且无副作用的 🟡/🟢 可以随 🔴 一起修复（如添加 `--version` 参数、改 `enumerate`），但必须在修订计划中列明。

### Step 4: 更新变更日志

在文档末尾维护变更日志：

```markdown
## 变更日志

| 版本 | 日期 | 变更 | 审查结果 |
|------|------|------|---------|
| v1 | YYYY-MM-DD | 初版 | 🔴xN 🟡xN（见 REVIEW） |
| v2 | YYYY-MM-DD | 修订：[修了什么] | 待审查 |
```

### Step 5: 产出审查对照表

修订完成后，输出逐条回应表（让再审查有据可查）：

```markdown
## v2 对 v1 审查意见的逐条回应

| 审查意见 | 类型 | v2 修订 | 状态 |
|---------|------|--------|------|
| [问题描述] | 🔴 | [怎么改的] | ✅ 已修 |
| [问题描述] | 🟡 | [怎么改的] | ✅ 已修 |
| [问题描述] | 🟡 | [为什么不改] | ⏭️ 延后 |
```

### Step 6: 触发再审查

修订完成后：
- 调用 `project-audit` 对修订版执行再审查
- 再审查的重点是"v1 的问题是否真的修好了"
- **收敛标准**：遗留问题全部为 🟡（非阻塞）时通过
- **量化进步**：给出 v1 → v2 的评分对比

## 产出

| 产出 | 格式 |
|------|------|
| 修订后的文档 | 原文件覆盖，带 v1→v2 标注 |
| 审查对照表 | 嵌入文档末尾或独立文件 |
| 变更日志 | 嵌入文档末尾 |

## Skill 协作关系

```
project-audit ──→ design-iteration ──→ project-audit
    (审查)            (修订)              (再审查)
         ↑                                    │
         └────────── 如果仍有 🔴 ──────────────┘
```

**完整闭环**：
```
project-planner（或 deep-research）产出文档
  → project-audit 审查 → 发现 🔴🟡🟢
  → design-iteration 修订 → 产出 v2
  → project-audit 再审查 → 收敛
  → project-retrospective 沉淀经验
```

## 反模式

| 不要做 | 为什么 |
|--------|--------|
| 不要跳过 Step 2 直接改文档 | 用户可能不同意修订范围 |
| 不要"顺手"改审查没提到的东西 | 会引入新问题，让再审查无法聚焦 |
| 不要修完不触发再审查 | 修订本身可能引入新问题 |
| 不要无限迭代 | 有收敛标准：全部 🟡 即可通过 |
