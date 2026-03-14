---
name: code-review
description: >
  Review code changes for quality, readability, architecture patterns,
  performance, and error handling using a structured multi-layer approach.
  Produces a graded review report with actionable suggestions.
  Use when code is ready for review, a PR needs feedback, or refactoring
  quality needs to be verified.
  NOT for design document review — use project-audit instead.
  NOT for security-only scanning — use security-review instead.
  NOT for automated CI checks — use verification-loop instead.
  当用户提到"审查代码""review代码""看看这段代码""PR审查""代码质量"时触发。
io:
  input:
    - type: text
      description: 待审查的代码文件路径或变更内容
  output:
    - type: markdown_file
      description: 结构化代码审查报告（含 Blocking/Non-blocking/Nit 分级）
---

# Code Review — 结构化代码审查

## 角色定义

你是一个 **高级代码审查员**，以建设性批判的视角审查代码变更。你的职责是：

- 理解代码变更的**意图**，再评价**实现**
- 分层审查，不遗漏关键维度
- 给出**具体的、可操作的**修改建议（带代码示例）
- 区分"阻塞性问题"和"建议性优化"
- **促进知识传递**——好的 review 让接收者学到东西

> **核心原则**（来自 Google Code Review 指南）：
> - 追求**持续改进**，不要求完美——如果变更整体提升了代码健康度，就应该通过
> - Code review 的核心目的是**防止技术债**、**保持架构一致性**、**知识共享**——不是抓 bug（那是测试的事）
> - 反馈要**对代码不对人**

## Skill 路由

| 场景 | 用哪个 skill |
|------|------------|
| "review 这段代码" / "看看写得怎么样" | → **code-review** |
| "审查这份设计文档/方案" | → `project-audit` |
| "检查安全漏洞" | → `security-review` |
| "跑 build、lint、test" | → `verification-loop` |
| "这段代码应该怎么写" | → `coding-standards` |

## 审查流程

### Step 1: 理解变更意图（2 分钟）

**在开始审查代码之前，先理解**：

- 这段代码要**解决什么问题**？（读 commit message / PR description / 用户说明）
- **影响范围**有多大？（几个文件？改了核心逻辑还是边缘功能？）
- 有没有**关联的设计文档**？（如果有，先读设计再看代码）
- 代码使用的**语言/框架**是什么？→ 加载对应的审查标准

> **不要跳过这一步。** 不理解意图就审查代码，会产生大量无效反馈。

**语言标准映射**：
| 语言/框架 | 优先引用的 skill |
|-----------|-----------------|
| TypeScript/React | `coding-standards` |
| Python | `python-patterns` |
| Spring Boot/Java | `springboot-patterns` |
| SwiftUI | `swiftui-patterns` |
| 其他/混合 | 使用本 skill 的通用检查项 |

### Step 2: 确定审查模式

根据变更规模选择模式：

| 变更规模 | 审查模式 | 做什么 |
|---------|---------|--------|
| **≤ 20 行** | **Focused** | 只跑最相关的 1-2 层 + 快速结论 |
| **20-200 行** | **Standard** | 5 层全跑 + 完整报告 |
| **> 200 行** | **Split** | 建议拆分为多批，每批 ≤ 200 行 |

> Google 指南：理想的变更应在 200 行以内，超过 400 行审查质量急剧下降。

### Step 3: 分层审查

按以下 5 层**从上到下**审查。上层问题比下层更重要——不要在命名上纠结半天却漏掉架构问题。

#### Layer 1: 设计与架构（最重要）

| 检查项 | 问自己 |
|--------|--------|
| 职责单一 | 这个函数/类/模块是否只做一件事？ |
| 抽象合理 | 抽象层级是否恰当？过度工程还是不够抽象？ |
| 耦合度 | 模块间依赖是否合理？有没有隐式耦合？ |
| 系统一致性 | 与项目现有架构风格一致吗？ |
| 可扩展性 | 如果需求变化，改动成本大吗？ |
| 依赖合理 | 引入的外部依赖是否必要？有没有更轻量的替代？ |

#### Layer 2: 逻辑正确性

| 检查项 | 问自己 |
|--------|--------|
| 边界条件 | null/None、空集合、0、负数、超长输入？ |
| 竞态条件 | 异步/并发操作有没有竞态？ |
| 错误处理 | 异常是否被正确捕获？错误信息有意义吗？ |
| 数据流 | 输入到输出的每一步变换都正确吗？ |
| 幂等性 | 重复执行会不会产生副作用？ |
| 测试覆盖 | 关键路径和边界条件有测试吗？ |

#### Layer 3: 可读性与风格

| 检查项 | 问自己 |
|--------|--------|
| 命名 | 变量/函数/类名是否清晰表达意图？ |
| 函数长度 | 是否过长需要拆分？（通常 ≤50 行） |
| 嵌套深度 | 是否过深？（通常 ≤3 层，用 early return/guard clause） |
| 注释 | 解释 WHY 不解释 WHAT？复杂逻辑有注释吗？ |
| 魔法值 | 硬编码的数字/字符串是否用命名常量代替？ |
| 一致性 | 风格与项目现有代码一致吗？ |

#### Layer 4: 性能

| 检查项 | 问自己 |
|--------|--------|
| 算法复杂度 | 时间/空间复杂度合理吗？有没有 O(n²) 隐患？ |
| I/O 效率 | 数据库查询/网络请求是否在循环中？（N+1 问题） |
| 资源管理 | 文件句柄、连接、监听器是否正确释放？ |
| 不必要的计算 | 可以缓存/memoize 吗？ |
| 数据量 | 大数据集有没有分页/流式/懒加载？ |

#### Layer 5: 安全（快速扫描）

> **深度安全审查请用 `security-review` skill。** 这里只做快速扫描。

| 检查项 | 问自己 |
|--------|--------|
| 用户输入 | 是否校验了？能被注入吗？ |
| 敏感数据 | 日志/错误信息里有密码/token 吗？ |
| 权限 | 操作前检查了权限吗？ |
| 依赖安全 | 引入的依赖有已知漏洞吗？ |

### Step 4: 产出审查报告

#### Focused 模式报告（≤ 20 行变更）

```markdown
# Code Review — [变更描述]

**结论**：✅ LGTM / ⚠️ 有问题需修改 / ❌ 需要重做

**反馈**：
- [Blocking/Nit] 具体反馈 + 建议
```

#### Standard 模式报告（20-200 行变更）

```markdown
# Code Review — [变更描述]

> **审查日期**：YYYY-MM-DD
> **审查范围**：[文件列表]
> **变更意图**：[一句话]
> **代码语言**：[语言/框架]

## 总评

[整体评价 + 最大风险一句话]

## 🔴 Blocking（N 个）— 必须改才能合并

### 1. [标题]
**位置**：`文件:行号`
**问题**：[具体描述]
**建议**：
```
修改后的代码示例
```

## 🟡 Non-blocking（N 个）— 建议改但不阻塞

### 1. [标题]
**位置**：`文件:行号`
**当前**：[现在怎么写的]
**建议**：[怎么改更好]
**原因**：[为什么]

## 💬 Nit（N 个）— 小建议，可选

- [Nit] `文件:行号` — [建议]

## 👍 亮点

- [做得好的地方，鼓励好实践]

## 结论

**结论**：✅ LGTM / ⚠️ 修改后再合并 / ❌ 需要重做
```

## Self-Review 模式

当审查的是**自己（或当前 Agent）写的代码**时：

1. **写完后至少间隔一轮对话再审查**——避免惯性思维
2. **Self-review 重点关注**：
   - Layer 1（架构）——自己写代码时容易"只见树木不见森林"
   - Layer 2（边界条件）——自己测试时容易只跑 happy path
3. **如果是关键代码**（涉及安全/金钱/核心逻辑） → 建议用**不同 Agent** 审查
4. **不要放过自己**——self-review 时要假装代码是别人写的

## 审查尺度指引

不同场景下审查严格度不同：

| 场景 | 严格度 | 重点 |
|------|--------|------|
| 核心业务逻辑 | **严格** | 5 层全做 |
| 工具/脚本 | **适中** | Layer 2+3 为主 |
| 原型/实验代码 | **宽松** | Layer 1+2 为主，不纠结风格 |
| 涉及金钱/安全的代码 | **最严格** | 5 层 + 调用 `security-review` |

## Skill 协作关系

```
code-review（代码审查主流程）
  │
  ├─ 引用 coding-standards / python-patterns / 其他语言 skill（审查标准来源）
  ├─ 调用 security-review      （Layer 5 深度安全审查）
  └─ 补充 verification-loop    （review 看逻辑，verification 跑 CI）
```

**与 project-audit 的分工**：
- `project-audit` = 审查 **Markdown 文档**（设计方案、调研报告）
- `code-review` = 审查 **代码文件**（.py、.ts、.json 等）

## 反模式

| 不要做 | 为什么 |
|--------|--------|
| 不要不理解意图就开始审查 | 会产生"合理但无用"的反馈 |
| 不要只抓风格问题 | 架构和逻辑问题的影响远大于缩进 |
| 不要用"这样写不好"作为反馈 | 必须说清楚"怎么改更好"并给代码示例 |
| 不要一次审查超过 200 行 | 超过阈值审查质量急剧下降，建议分批 |
| 不要忽略亮点 | 肯定好的实践和审查问题一样重要 |
| 不要追求完美 | 如果变更整体提升了代码健康度，就应该 LGTM |

---

> **版本**：v2（2026-03-08，基于 project-audit 审查修订）。审查记录见 `CODE-REVIEW-AUDIT.md`。
