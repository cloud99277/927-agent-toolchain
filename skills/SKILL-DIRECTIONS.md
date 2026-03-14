# Agent OS Skills 生态 — 新 Skill 方向建议

> **分析日期**：2026-03-08
> **分析方法**：从项目实际工作流中提取反复出现的模式，筛选出尚未被 skill 化的

---

## 当前 Skill 矩阵

```
skills/
├── project-planner/         ← 规划（Phase 1~5）
├── project-audit/           ← 审查（Phase 4）
├── project-retrospective/   ← 经验沉淀（Phase 6~7）
└── deep-research/           ← 调研（Phase 3.5）  🆕
```

**覆盖的生命周期**：
```
灵感 → 规划 → 调研 → 审查 → 设计迭代 → 实施 → 沉淀
 ✅      ✅     ✅     ✅      ✅         ❌      ✅
```

---

## 建议的新 Skill 方向（按优先级排序）

### 🥇 P0: `skill-creator` — Skill 设计与创建

**来源**：这次 `deep-research` 的创建过程本身就是一个可复用的模式。

**观察到的模式**：
```
经验积累 → 总结做对/做错 → 盘点现有 skill → 外部调研同类方案
  → 设计蓝图 → 审查(project-audit) → 修订 → 再审查 → 创建 SKILL.md
```

**这个 skill 做什么**：
- 输入：对某类反复出现的工作模式的描述
- 执行：盘点现有 skill 是否已覆盖 → 定位差异 → 设计 frontmatter + 流程 + 产出模板 → 创建文件
- 输出：完整的 `SKILL.md` + `references/`

**为什么 P0**：
- 你 `~/.ai-skills/` 里已有一个 `skill-creator`，但它是**通用的**
- agent-os 需要一个**项目级的 skill-creator**，内置你的方法论（审查循环、引力陷阱过滤、互斥边界定义）
- 本次 deep-research 创建过程可以直接作为第一个实际案例

**与现有的区别**：
| | `~/.ai-skills/skill-creator` | `agent-os/skills/skill-creator` |
|--|-----|------|
| 范围 | 通用 skill 创建 | 方法论 skill 创建 |
| 模式 | frontmatter + SKILL.md | 蓝图 → 审查 → 修订 → 创建 |
| 特色 | 无 | 内建互斥边界检查 + 与现有 skill 协作关系声明 |

---

### 🥈 P1: `design-iteration` — 审查驱动的设计迭代

**来源**：Phase 4.5（审查驱动的设计迭代）在 WORKFLOW 中有详细记录，但尚未 skill 化。

**观察到的模式**：
```
审查报告（来自 project-audit）
  → 汇总全部审查结论
  → 逐条修订目标文档
  → 标注 v1→v2 变更来源
  → 再审查修订版（收敛标准：全部 🟡）
```

**这个 skill 做什么**：
- 输入：一个或多个审查报告 + 被审查的目标文档
- 执行：按严重度排序 → 逐条修订 → 标注变更来源 → 触发再审查
- 输出：修订后的文档（带变更日志）+ 审查对照表

**为什么是 P1**：
- 目前审查（`project-audit`）和修订是**断裂的**——审查产出报告后，修订靠人工推动
- 这个 skill 填平"审查 → 修订"的最后一公里
- 形成闭环：`project-audit` → `design-iteration` → `project-audit`（直到收敛）

**协作关系**：
```
project-audit ──→ design-iteration ──→ project-audit
    (审查)            (修订)              (再审查)
```

---

### 🥉 P2: `phase-executor` — Phase 级执行管理

**来源**：Phase 6（从设计到实施）的"先读后做 → 最小测试 → 按依赖链执行 → 脚本验收"模式。

**观察到的模式**：
```
PHASE-*.md 执行文档
  → Step 1: 完整阅读所有上下文（设计文档 + KI + 目标文件现状）
  → Step 2: 最小可行测试（验证核心假设）
  → Step 3: 按依赖链执行任务
  → Step 4: 脚本化验收（verify-*.py）
  → Step 5: 跨 Agent 审查
  → Step 6: 清理临时资源
```

**这个 skill 做什么**：
- 输入：`PHASE-*.md` 执行文档
- 执行：检查前置条件 → 建议阅读清单 → 创建测试 → 执行任务 → 产出验收脚本 → 触发审查
- 输出：任务完成报告 + 验收脚本 + 状态更新

**为什么是 P2**：
- 这是"规划→实施"的桥梁，目前三个 skill 都在规划侧
- 有了 Phase 1 的实际经验，模式已经初步稳定
- 但需要再积累 1-2 个 Phase 的经验才能充分结晶

---

### P3: `context-loader` — 执行前上下文加载

**来源**：Phase 6 的"先读后做"反复出现。

**观察到的模式**：
每次执行前都需要加载大量上下文：
- PROJECT.md（顶层设计）
- PHASE-*.md（当前 Phase 设计）
- 相关 KI（Knowledge Item）
- 目标文件的当前状态
- 前一轮审查报告

**这个 skill 做什么**：
- 输入：项目路径 + Phase 编号
- 执行：自动发现并加载所有相关上下文文件
- 输出：阅读清单 + 上下文摘要

**为什么是 P3**：
- 比较简单，可能一个检查清单就够了，不一定需要完整 skill
- 但如果项目越来越大，自动化上下文加载会越来越有价值
- 可以先作为 `phase-executor` 的 Step 1，等模式更清晰后再独立

---

### P4: `cross-agent-review` — 跨 Agent 审查协调

**来源**：WORKFLOW 中的关键原则——"执行和审查用不同 Agent"。

**观察到的模式**：
```
Agent A（Antigravity）执行 → 产出物
  → 切换到 Agent B（Claude）→ 结构化审查
  → 审查结果回到 Agent A → 修订
```

**这个 skill 做什么**：
- 输入：审查对象（文件路径）+ 审查类型
- 执行：生成审查 Prompt + 标准审查模板，让用户可以复制到另一个 Agent 执行
- 输出：审查 Prompt（可复制） + 审查结果接收模板

**为什么是 P4**：
- 目前跨 Agent 审查是手动操作——用户自己切换到 Claude 并说"审查这个"
- 真正的自动化需要 Agent 间通信，超出当前轻量架构的范围
- 但可以做"半自动化"——生成审查 Prompt + 模板，减少手动工作

---

## 总结：建议优先级

| 优先级 | Skill | 成熟度 | 建议时机 |
|--------|-------|--------|---------|
| **P0** | `skill-creator`（方法论版） | ⭐⭐⭐ 本次经验已充分 | **现在就可以做** |
| **P1** | `design-iteration` | ⭐⭐⭐ 多次执行，模式稳定 | **下一个做** |
| **P2** | `phase-executor` | ⭐⭐ Phase 1 经验 + 待积累 | 再完成 1-2 个 Phase 后 |
| **P3** | `context-loader` | ⭐ 模式简单 | 先内嵌到 phase-executor，后续按需独立 |
| **P4** | `cross-agent-review` | ⭐ 受限于架构 | 当跨 Agent 工作流更频繁时 |

### 做完后的 Skill 矩阵

```
skills/
├── project-planner/         ← 从灵感到项目
├── deep-research/           ← 体系化调研
├── project-audit/           ← 结构化审查
├── design-iteration/        ← 审查驱动的修订  🆕
├── skill-creator/           ← 方法论 skill 创建  🆕
├── phase-executor/          ← Phase 级执行管理  🆕
├── project-retrospective/   ← 经验沉淀
└── cross-agent-review/      ← 跨 Agent 审查  🆕

完整生命周期：
灵感 → 规划 → 调研 → 审查 → [修订] → [实施] → 沉淀
 ✅      ✅     ✅     ✅     🆕       🆕       ✅
```

> **注意**：遵守"渐进 skill 化"原则——只有当某个模式被反复执行、经验成熟后才提取为 skill。P0 和 P1 已经成熟，P2-P4 需要更多实际经验积累。
