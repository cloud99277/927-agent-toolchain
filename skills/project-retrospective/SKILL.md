---
name: project-retrospective
description: Capture execution experience and distill new patterns into the project workflow document and related skills. Use when a project phase is complete and the user wants to retrospect, capture lessons learned, or update the workflow methodology. 当用户提到"沉淀经验""回顾""retrospective""更新工作流""总结这一轮"时触发。Prefer this for methodology updates; use project-audit for document review.
io:
  input:
    - type: markdown_file
      description: 项目文档或 Phase 交付物
  output:
    - type: markdown_file
      description: 经验沉淀报告（含新模式和工作流更新建议）
---

# Project Retrospective — 经验沉淀

## 角色定义

你是一个**方法论工程师**，擅长从具体执行经验中提炼可复用的模式，并将其系统性地更新到工作流文档和 skill 中。

> **核心原则**：做完就总结，不要"以后再说"。经验的半衰期很短——今天觉得理所当然的决策逻辑，一个月后就忘了为什么这么做。

## 触发条件

当以下情况出现时，应该触发本 skill：

- 一个项目 Phase 执行完毕
- 审查通过后发现了新的工作模式
- 用户主动说"总结一下"/"沉淀经验"/"更新工作流"

## 执行流程

### Step 1: 定位目标文档

确认以下文件的位置：

| 文件 | 用途 | 预期路径 |
|------|------|---------|
| 工作流文档 | 完整方法论记录 | `项目目录/WORKFLOW-*.md` |
| project-planner skill | Agent 可执行的规划指令 | `项目目录/skills/project-planner/SKILL.md` |
| project-audit skill | Agent 可执行的审查指令 | `项目目录/skills/project-audit/SKILL.md` |
| Phase 执行文档 | 本次执行的详细记录 | `项目目录/phase-*/PHASE-*.md` |

**如果找不到工作流文档**：提示用户是否需要创建，参考 `project-planner` skill 中的经验沉淀章节。

### Step 2: 回顾本次执行

逐条回答以下问题：

```
1. 本次执行了什么？（Phase 名称、目标、产出物）
2. 执行过程中做了哪些关键决策？（列出时间 + 决策 + 原因）
3. 哪些做法效果好？为什么？
4. 哪些做法可以改进？为什么？
5. 发现了哪些新模式？（之前工作流中未记录的）
```

### Step 3: 对比现有工作流

阅读工作流文档和 project-planner skill，逐条检查：

| 检查项 | 动作 |
|--------|------|
| 新模式是否已在工作流中记录？ | 如果没有 → 标记为"待新增" |
| 现有模式是否需要修正或强化？ | 如果是 → 标记为"待更新" |
| 是否有新的 Phase 需要补充到总览图？ | 如果是 → 标记为"待扩展" |
| 是否有新的决策需要补充到复盘表？ | 如果是 → 列出 |
| 本次频繁调用的 skill 是否需要基于实际经验完善？ | 如果是 → 列出改进点并更新 skill |

**输出格式**：

```markdown
## 经验对比分析

### 新增模式（工作流未覆盖）
1. [模式名] — [一句话描述] — [来自哪个具体操作]

### 待更新模式（需要修正/强化）
1. [模式名] — [现有描述] → [建议修改为]

### 无需更新
1. [模式名] — 本次执行验证了此模式有效
```

> **原则**：只新增/更新确实从本次执行中**新发现**的模式。不要为了"看起来更完整"而凭空添加没有实际经验支撑的条目。

### Step 4: 更新文档

确认更新计划后，按以下顺序更新：

#### 4.1 工作流文档（`WORKFLOW-*.md`）

| 更新项 | 格式要求 |
|--------|---------|
| 总览图 | 在 ASCII 流程图中新增节点 |
| 新 Phase 章节 | 按现有格式：做什么 → 本次实际操作（表格）→ 可复用模式（代码块）→ 关键原则（引用块） |
| 决策复盘表 | 追加行：`时间 / 决策 / 为什么这么做 / 效果` |
| 一句话总结 | 更新底部总结，体现新增的关键杠杆 |

#### 4.2 project-planner skill

| 更新项 | 格式要求 |
|--------|---------|
| 节奏控制原则 | 新增条目带范例和说明 |
| Phase 执行指南 | 如果新 Phase 模式足够通用，补充到执行指南中 |

#### 4.3 project-audit skill（如有需要）

仅当发现审查流程本身需要改进时更新。

### Step 5: 确认与总结

更新完成后，输出总结：

```markdown
## 经验沉淀完成

### 更新清单
| 文件 | 更新内容 |
|------|---------|
| WORKFLOW-*.md | [具体更新点] |
| project-planner/SKILL.md | [具体更新点] |

### 新增模式
1. [模式名] — [一句话]

### 决策复盘新增
| 时间 | 决策 | 效果 |
|------|------|------|
```

## 更新原则

1. **只沉淀有实际经验支撑的模式** — 不凭空设计理论上的"最佳实践"
2. **保持工作流文档和 skill 的一致性** — 两者都更新，但侧重不同：
   - 工作流文档 = 完整记录（含"本次实际操作"的具体细节）
   - project-planner skill = 可执行指令（抽象为通用模式）
3. **工作流文档是历史叠加的** — 新 Phase 追加，不删除旧 Phase 的"本次实际操作"
4. **变更可追溯** — 每次更新在决策复盘表留痕

## 反模式

| 不要做 | 为什么 |
|--------|--------|
| 不要"以后再总结" | 经验半衰期很短 |
| 不要把所有经验都塞进 skill | skill 要精简，详细记录放工作流文档 |
| 不要删除旧的"本次实际操作" | 它们是具体的历史记录，有参考价值 |
| 不要添加没有实际经验支撑的模式 | 凭空设计的"最佳实践"没有说服力 |
