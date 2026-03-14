# Agent Toolchain — 中心化 AI Agent 配置管理与工具链体系

> **项目启动日期**：2026-03-07
> **完成日期**：2026-03-14
> **当前版本**：v3.0（全项目完成版）
> **状态**：✅ **全部完成**（Phase 0-7 共 8 个阶段）
> **核心仓库**：`~/.ai-skills/`（96 skills，含 7 个新建 skill）
> **本文档定位**：整个项目的顶层设计文档，包含完整的实施记录

---

## 一、项目定位与愿景

### 一句话定义

**Agent Toolchain 是一个跨 AI Agent 的中心化配置管理与工具链体系，在保持「无运行时、零基础设施、纯文件系统」的前提下，为分散的 skill 集合增加 IO 契约、记忆管理、安全审计、编排和可观测能力。**

> **v1→v2 变更**：从"Agent OS"更名为"Agent Toolchain"。原因：当前设计是工具链级别（skill 编排 + 记忆 + 治理），不是 OS 级别（不涉及进程调度、syscalls、上下文切换）。命名应与实际架构匹配，避免 AIOS 式"概念大于实现"的陷阱。

### 核心理念

> **中心化 + 原生整合 > 分布式中间件**
>
> **轻量化 + 纯文件 > 重型框架 + 数据库服务**

### 真正定位

> **个人工程师的 AI Agent 配置管理系统**（类似 chezmoi 之于 dotfiles），而不是"AI Agent 操作系统"（像 AIOS 那样的重型抽象）。

### 与竞品的定位差异

| 维度 | OpenClaw | 重型框架（CrewAI/SK） | Fabric | **Agent Toolchain** |
|------|----------|-------------------|--------|-------------------|
| 层级 | 应用层中间件 | SDK/平台级 | CLI 工具 | 配置管理 + 工具链 |
| 依赖 | Gateway+插件+DB | Python SDK+API | 单二进制 | **零依赖（纯文件）** |
| Agent 支持 | 仅 Claude | 各自生态 | 仅 Fabric CLI | **跨所有 Agent** |
| 运行模式 | 24/7 heartbeat | Python 运行时 | 按需 CLI 调用 | **Agent 原生执行** |
| 安全 | 4万端口裸露 | SDK 内部 | 无特殊考虑 | **无端口、无中间件** |

### 独特优势与代价（诚实分析）

| 优势 | 代价 |
|------|------|
| 无运行时依赖 | 无法做真正的并发执行、实时调度、Agent 间通信 |
| 零基础设施 | 记忆检索只能靠全文搜索（grep），无法做语义相似度检索 |
| 跨所有 Agent | 只能用最大公约数功能，各 Agent 独有能力需单独适配 |
| 文档定义工具 | 执行结果依赖 Agent 的理解能力，不够确定性 |
| 本地文件存储 | 无法多设备实时同步（需手动 Git push/pull） |

### 目标

将现有 `~/.ai-skills/` 从"90+ 个 skill 的扁平集合"，渐进式升级为：

```
Agent Toolchain = 中心化 Skill 仓库（✅ 已有）
               + 能力发现与路由系统（✅ 已有，持续优化）
               + 质量治理系统（✅ 已有 lint/validate/stocktake）
               + Skill IO 契约（🆕 P0 — 一切编排的前提）
               + 安全审计（🆕 P1 — 快速可交付）
               + 记忆管理系统（🆕 P2 — 核心基础设施）
               + 编排能力（🆕 P3 — 线性链式 MVP）
               + 可观测性（🆕 P4）
               + 定时调度（🆕 P5）
               + MCP 兼容导出（🆕 P6 — 长期方向）
```

### 节奏约束（SuperAGI 教训）

> **每个 Phase 只新增 1 件事，做完做好再做下一个。** SuperAGI 一口气做了 Agent Manager + Tool Market + Template Market + Telemetry + GUI，结果开源版停滞。功能膨胀是头号杀手。

---

## 二、现状基线

### 2.1 已有资产盘点

采用**中心化 skill 仓库 + 多 agent 软链接共享**模式：

- **统一仓库**：`~/.ai-skills/`
- **共享入口**：`~/.claude/skills`、`~/.codex/skills`、`~/.gemini/skills`、`~/.agents/skills`
- **共享方式**：以上入口通过软链接指向同一目录
- **兼容标准**：符合 Claude Code Agent Skills 开放标准（SKILL.md + frontmatter + Progressive Disclosure）

### 2.2 技能分类分布

| 类别 | 数量 | 代表 skill |
|------|------|-----------|
| 系统/元能力 | 12 | `skill-creator`、`skill-lint`、`find-skills`、`strategic-compact` |
| 编码规范与架构 | 10 | `api-design`、`backend-patterns`、`frontend-patterns` |
| 语言/框架专项 | 15 | `python-patterns`、`springboot-patterns`、`swiftui-patterns` |
| 测试/验证/安全 | 13 | `tdd-workflow`、`security-review`、`verification-loop` |
| 内容生产与发布 | 21 | `translate`、`baoyu-post-to-wechat`、`baoyu-image-gen` |
| 平台/工具集成 | 8 | `add-provider`、`upload-to-github`、`res-downloader` |
| 历史与记忆 | 6 | `brain-link`、`conversation-distiller`、`history-reader` |
| 业务工作流 | 4 | `investor-materials`、`market-research` |
| **合计** | **~90** | |

### 2.3 已完成的治理工作

- ✅ **frontmatter 路由优化**：全仓统一为 `capability-first + Use when + Prefer/Not for` 句式
- ✅ **重叠消除**：10 组重叠 skill 的优先级与分工已明确
- ✅ **旧标记清理**：已移除所有残留旧 frontmatter 键
- ✅ **自动化巡检**：`skill-lint`（仓库级）和 `quick_validate.py`（单 skill 级）
- ✅ **统一规范**：目录、命名、正文、资源使用、生命周期规范齐备

### 2.4 当前体系的缺口分析

| 能力领域 | 现状 | 缺口 | 优先级 |
|---------|------|------|--------|
| ~~Skill IO 契约~~ | ✅ 已完成 | 7 类型注册 + 5 skill 试点 + 2 编排链验证通过 | ~~P0~~ |
| ~~安全审计~~ | ✅ 已完成 | audit.py 6 维度全仓 87 skill 扫描 | ~~P1~~ |
| ~~记忆管理~~ | ✅ 已完成 | memory-search + memory-update + 三层模型 | ~~P2~~ |
| ~~编排~~ | ✅ 已完成 | agent-orchestrator + run-chain.py + 3 条链 | ~~P3~~ |
| ~~可观测性~~ | ✅ 已完成 | skill-observability + 3 脚本 467 行 | ~~P4~~ |
| ~~定时调度~~ | ✅ 已完成 | scheduled-tasks + 3 脚本 900 行 + 2 示例任务 | ~~P5~~ |
| ~~MCP 兼容导出~~ | ✅ 已完成 | mcp-export + export-mcp.py 320 行 + 96 skill 导出 | ~~P6~~ |

---

## 三、外部洞察

### 3.1 来源一：@joooe453 的 OpenClaw 放弃经历

> 原文：[我放弃使用 OpenClaw 了](https://x.com/joooe453/status/2028028166435172725)

**四个教训**：

| 教训 | 根因 | Agent Toolchain 的回应 |
|------|------|----------------------|
| 记忆不靠谱 | LLM context 压缩是架构性问题 | 记忆独立于 context，持久化为文件 |
| 烧钱 $150+/月 | heartbeat 轮询，空转消耗 | 事件驱动 + 定时触发（写入设计约束） |
| 安全灾难 | 多层中间件 = 多层攻击面 | 零中间件、无端口、纯文件系统 |
| 不需要 24/7 | 后台跑的大多是琐事 | 聚焦高价值自动化，而非全面自动化 |

### 3.2 来源二：竞品调研 v2（精选 9 个项目）

**轻量级同行**（最有参考价值）：

| 项目 | 核心借鉴 |
|------|---------|
| **Fabric** | CLI 管道 = 零配置编排。一个 system.md 就是一个能力单元 |
| **Claude Agent Skills** | Progressive Disclosure 三级模型。Agent Toolchain 是其"中心化增强版" |
| **chezmoi** | Source/Target State 分离。Secret 管理用约定 + 文档而非新模块 |

**反面教材**（必须避免的坑）：

| 项目 | 最大教训 |
|------|---------|
| **OpenClaw** | 安全不能是事后想法。永远不暴露网络端口 |
| **SuperAGI** | 功能膨胀是头号杀手。每 Phase 只做 1 件事 |
| **AIOS** | 概念必须服务于工程可用性。类比要适度 |

**重型参考**（只借理念，不借实现）：

| 项目 | 借理念 | 不借实现 |
|------|--------|---------|
| **Semantic Kernel** | Whiteboard Memory（对话白板提炼） | MCP Server 框架 |
| **Mem0** | 增量记忆更新 + 冲突检测 | ~~chromadb/图数据库~~（用 JSON + grep） |
| **CrewAI** | YAML 声明式编排链 | ~~DAG 编排引擎~~（先做线性链） |

### 3.3 引力陷阱过滤

> 过滤规则：**只用 Markdown + JSON + Python 脚本能做到几成？如果 70% 以上，就不需要引入新依赖。**

| 被砍掉的 | 为什么 |
|---------|--------|
| ~~chromadb 向量存储~~ | JSON + grep 覆盖 80% 场景 |
| ~~credential-manager 新模块~~ | `.env` 约定 + 文档足够 |
| ~~沙箱执行（Docker/Firejail）~~ | consent 机制 + 静态扫描代替 |
| ~~DAG 编排引擎~~ | 70% 场景仅需线性链 |
| ~~OS 级调度器~~ | cron + Python wrapper 足够 |

---

## 四、架构设计

### 4.1 分层架构全景图

```
┌─────────────────────────────────────────────────────────────────┐
│              Agent Toolchain (~/.ai-skills/)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ 治理层 ──────────────────────────────────────────────────┐  │
│  │  skill-lint ○ skill-stocktake ○ skill-creator             │  │
│  │  🆕 skill-security-audit  ○  🆕 skill-observability      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ 编排层 ──────────────────────────────────────────────────┐  │
│  │  🆕 agent-orchestrator（线性链 MVP）                       │  │
│  │  🆕 scheduled-tasks                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ 记忆层 ──────────────────────────────────────────────────┐  │
│  │  🆕 memory-manager ○ brain-link ○ conversation-distiller  │  │
│  │  history-reader ○ history-chat ○ sync-to-brain            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ 协议层 ──────────────────────────────────────────────────┐  │
│  │  🆕 Skill IO 契约（输入输出标准）                          │  │
│  │  🆕 MCP 兼容导出（长期方向）                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ 能力层（90+ skills）─────────────────────────────────────┐  │
│  │  内容生产(21) ○ 编码规范(10) ○ 框架专项(15)               │  │
│  │  测试验证(13) ○ 工具集成(8)  ○ 业务工作流(4)              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ 共享层 ──────────────────────────────────────────────────┐  │
│  │  ~/.claude/skills ─┐                                      │  │
│  │  ~/.codex/skills  ─┤── symlink → ~/.ai-skills/            │  │
│  │  ~/.gemini/skills ─┤                                      │  │
│  │  ~/.agents/skills ─┘                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

> **v1→v2 变更**：新增「协议层」（IO 契约 + MCP 兼容），将 `message-hub` 移除（降级为不做），将 `skill-cost-tracker` 扩展为 `skill-observability`。

### 4.2 新增模块详细规格

---

#### 4.2.1 Skill IO 契约（P0 — 一切编排的前提）

> **v1→v2 变更**：从 orchestrator 的子文档提升为独立 P0 基础设施。没有 IO 契约就没有通用编排。

**定位**：定义 skill 之间的标准输入输出格式，让编排引擎可以自动匹配"谁的 output 契合谁的 input"。

**设计原则**（借鉴 Fabric 的 Unix 管道思维）：

- 每个 skill 的输出应该可以作为另一个 skill 的输入
- 最简形式就是 Markdown 文件（stdin/stdout 的文件化版本）
- 渐进式采纳：现有 skill 不强制改造，新 skill 推荐声明

**IO 声明格式**（在 SKILL.md frontmatter 中可选新增）：

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

**产出物**：

```
~/.ai-skills/.system/io-contracts/
├── IO-CONVENTION.md         # IO 契约规范文档
├── type-registry.json       # 标准类型注册表（markdown_file, url, image, json...）
└── examples/                # 各类型的示例
```

**与编排的关系**：orchestrator 读取 IO 声明，自动判断 skill A 的 output 能否接入 skill B 的 input。

---

#### 4.2.2 `skill-security-audit`（P1 — 快速可交付）

**定位**：针对 skill 自身的安全静态分析。不做沙箱执行（过重），用 consent 机制 + 静态扫描代替。

**审计维度**：

| 维度 | 检查方式 | 严重度 |
|------|---------|--------|
| 凭据泄露 | grep 扫描 scripts/ 中的硬编码 key/token/password | 🔴 Critical |
| 数据外传 | grep 扫描未声明的外部 HTTP(S) 请求 | 🔴 Critical |
| 权限越界 | 比对 SKILL.md 声明 vs scripts/ 实际行为 | 🟡 High |
| 供应链 | 检查 npm/pip 依赖的已知漏洞 | 🟡 High |
| Consent 机制 | 使用逆向 API 的 skill 是否有 consent 流程 | 🟠 Medium |

**实现方式**：纯 Python 脚本，可集成到 `skill-lint` 中作为安全检查规则。

**目录结构**：

```
skill-security-audit/
├── SKILL.md
├── references/
│   ├── audit-checklist.md
│   └── remediation-guide.md
└── scripts/
    ├── audit.py                # 主审计脚本
    └── scan-credentials.py     # 凭据扫描（可独立运行）
```

---

#### 4.2.3 `memory-manager`（P2 — 核心基础设施）

> **v1→v2 变更**：缩小权责边界。不再声称"统一管理所有 Agent 的记忆"，改为"为无记忆 Agent 提供记忆基础设施 + 跨 Agent 共享笔记本"。

**边界定义**：

```
memory-manager 负责管理的（可读可写）：
  ✅ L1 身份层 — 各 agent 配置文件（CLAUDE.md 等）
  ✅ L2 会话层 — 独立于任何 agent 的笔记/摘要（Whiteboard Memory）
  ✅ L3 知识层 — Obsidian / 本地文件 / sync-to-brain

memory-manager 不能管理但可以利用的（只读/建议）：
  ⚠️ Claude 原生 Memory → 只能建议用户在对话中触发
  ⚠️ Antigravity KI → 只能读取，不能写入
  ⚠️ Claude Code auto-memory → 完全不可控

memory-manager 的真正价值：
  → 为 Codex/Gemini 等"无记忆"agent 提供记忆基础设施
  → 提供跨 agent 的"共享笔记本"
  → Whiteboard Memory：从对话中自动提取 Decisions/Actions/Learnings
```

**三层记忆模型**（借鉴 Semantic Kernel Whiteboard + Letta 虚拟上下文）：

| 层级 | 内容 | 存储 | 加载策略 |
|------|------|------|---------|
| L1 身份层 | 人格、用户画像、行为规则 | CLAUDE.md / 各 agent 配置 | 始终加载 |
| L2 会话层 | Decisions / Actions / Learnings | JSON（Whiteboard 格式） | 相关时加载 |
| L3 知识层 | 笔记、项目资料、研究素材 | Obsidian / 本地 Markdown | 按需检索（grep） |

**纯文件实现约束**：JSON + Markdown + grep。不引入 chromadb、SQLite 或任何数据库。

**增量更新机制**（借鉴 Mem0）：
1. 提取新记忆（从对话中）
2. 与已有记忆 JSON 比较
3. LLM 判断：合并/替换/保留
4. 写回文件

**目录结构**：

```
memory-manager/
├── SKILL.md
├── references/
│   ├── memory-architecture.md     # 三层模型文档
│   ├── whiteboard-template.md     # Whiteboard 提取模板
│   └── cross-agent-sync.md        # 跨 agent 同步（Backlog，Phase 3 未实现）
└── scripts/
    ├── memory-search.py           # 统一检索（grep wrapper）
    ├── memory-update.py           # 增量更新 + 冲突检测
    └── memory-report.py           # 记忆健康度报告（Backlog，Phase 3 未实现）
```

---

#### 4.2.4 `agent-orchestrator`（P3 — 线性链 MVP）

> **v1→v2 变更**：从 DAG 编排降级为线性链 MVP。借鉴 Fabric 的 Unix 管道思维。DAG 等有真实需求再加。

**设计原则**：

- **v1**：~~解析 DAG 并执行~~ → **v2**：支持 A→B→C 线性链，基于 IO 契约自动匹配
- 编排链用 YAML 声明式定义（借鉴 CrewAI）
- 支持 Fabric 式的"Stitches"（预定义的常用链模板）

**编排链 YAML 格式**：

```yaml
# ~/.ai-skills/agent-orchestrator/chains/translate-tweet-publish.yaml
name: translate-tweet-publish
description: 获取推文、翻译、发布到微信
steps:
  - skill: baoyu-danger-x-to-markdown
    input: { url: "$URL" }
    output: content.md
  - skill: translate
    input: { file: content.md, to: zh-CN, mode: normal }
    output: translation.md
  - skill: baoyu-post-to-wechat
    input: { file: translation.md }
```

**目录结构**：

```
agent-orchestrator/
├── SKILL.md
├── chains/                         # 预定义编排链（Stitches）
│   ├── translate-tweet-publish.yaml
│   └── fetch-analyze-report.yaml
├── references/
│   └── chain-schema.md             # 编排链 YAML schema
└── scripts/
    └── run-chain.py                # 链式执行器
```

---

#### 4.2.5 `skill-observability`（P4 — 可观测性）

> **v1→v2 变更**：从 `skill-cost-tracker` 扩展为 `skill-observability`，增加执行日志、使用统计、错误追踪等维度。

**追踪维度**：

| 维度 | 数据 | 用途 |
|------|------|------|
| 执行日志 | 哪个 skill 在何时被何 agent 执行 | 行为审计 |
| 使用统计 | 哪些 skill 从未使用过 | 仓库瘦身候选 |
| 错误追踪 | 哪些 skill 执行失败率最高 | 质量改进 |
| 成本估算 | token 消耗、API 调用次数 | 成本优化 |

**实现方式**：每次 skill 执行写一行 JSON 到 `~/.ai-skills/.logs/executions.jsonl`（借鉴 SuperAGI Telemetry）。

**目录结构**：

```
skill-observability/
├── SKILL.md
├── references/
│   └── log-schema.md              # 日志格式定义
└── scripts/
    ├── log-execution.py            # 记录执行（可被其他 skill 调用）
    ├── report.py                   # 月度报告
    └── find-unused.py              # 查找从未使用的 skill
```

---

#### 4.2.6 `scheduled-tasks`（P5 — 定时调度）

> **v1→v2 变更**：明确两级架构，解决自举问题。

**两级架构**（解决"cron 怎么启动 agent 来执行 skill"的问题）：

```
Level 1: 纯脚本任务（agent-free）
  cron → 直接调用 scripts/task-runner.py → 执行脚本级操作
  场景：每日抓取推文（纯 API 调用，不需要 LLM）

Level 2: 智能任务（agent-assisted）
  cron → wrapper.sh → 启动指定 agent CLI → agent 读 SKILL.md 并执行
  场景：每周生成竞品分析报告（需要 LLM 理解和总结）
```

**目录结构**：

```
scheduled-tasks/
├── SKILL.md
├── tasks/                          # 任务定义目录
│   └── example-task.yaml
├── references/
│   └── task-schema.md
└── scripts/
    ├── scheduler.py                # 管理 cron 条目
    ├── task-runner.py              # Level 1 执行器
    └── agent-wrapper.sh            # Level 2 执行器（调用 agent CLI）
```

---

#### 4.2.7 MCP 兼容导出（P6 — 长期方向）

> **v1→v2 变更**：从中优先级提升为长期架构方向。MCP 是行业标准方向，不是"引入依赖"而是"导出接口"。

**目标**：将 SKILL.md frontmatter 导出为 MCP JSON schema，让任何支持 MCP 的 Agent 都能直接调用 Agent Toolchain 的 skill。

**不引入依赖**：只做导出（生成 JSON schema），不做 MCP Server 运行时。

---

## 五、实施路线图

### 节奏约束

> **每个 Phase 只做 1 件事。** 做完、验证、用起来之后，再开始下一个。

> **文档权威性**：各 `phase-N-*/PHASE-N.md` 文档为开发过程中的历史快照。Phase 完成后，以本文档（PROJECT.md）的状态和验收结果为权威来源。

### Phase 0 — 项目搭建（✅ 已完成 2026-03-08）

- [x] 创建 `agent-os` 项目目录
- [x] 编写 PROJECT.md v1
- [x] 架构审查 → 识别 4 个结构性问题
- [x] 竞品调研 v1 → v2（调研-审查-再调研循环）
- [x] 编写 PROJECT.md v2（本文档）
- [x] 工作流经验沉淀
- [x] 创建 `project-audit` 和 `project-planner` skill

### Phase 1 — Skill IO 契约（✅ 已完成 2026-03-08）

**目标**：定义 skill 间的标准 IO 格式，为后续编排奠基。

**产出物**：
- `phase-1-io-contracts/IO-CONVENTION.md` — IO 契约规范
- `phase-1-io-contracts/type-registry.json` — 7 个标准类型
- `phase-1-io-contracts/verify-chain.py` — 编排链验证脚本（Phase 4 种子代码）
- 5 个试点 skill 已添加 IO 声明（x-to-md, translate, post-to-wechat, url-to-md, skill-lint）

**验收结果**：

- [x] IO 契约文档通过架构审查
- [x] 5 个试点 skill IO 声明格式正确
- [x] 2 条编排链自动匹配通过
- [x] 4/4 Agent 兼容性测试通过（frontmatter 方案确认可行）

### Phase 2 — Skill 安全审计（✅ 已完成 2026-03-08）

**目标**：完成 `skill-security-audit` 的 MVP。

| 任务 | 产出物 |
|------|---------|
| 编写审计清单 | `references/audit-checklist.md` |
| 实现审计脚本（6 维度） | `scripts/audit.py` |
| 对全仓 87 skill 做首次安全扫描 | 审计报告（86 PASS / 1 WARN / 0 CRIT） |
| 编写修复指南 | `references/remediation-guide.md` |

**验收结果**：

- [x] 能检测到 4+ 种风险类型（凭据 + 外传 + 网络越界 + consent）
- [x] 全仓扫描报告产出且符合 JSON schema
- [x] 审计脚本零外部依赖
- [x] 纯文档类 skill 零误报

**待改进项（Backlog，需求触发）**：

| # | 改进项 | 触发条件 |
|---|--------|---------|
| B1 | frontmatter 白名单实现（Layer 3） | 某 skill 需要维度级豁免 |
| B2 | whitelisted findings 全景图 | 需统计全仓网络请求分布 |
| B3 | `io:` 声明检测精确化 | 出现 io 误判 |
| B4 | 空扩展名匹配收窄 | scripts/ 出现无扩展名二进制 |
| B5 | subprocess curl/wget 检测 | skill 用 subprocess 调网络 |
| B6 | IO 越界集成 type-registry | IO 契约大规模采纳后 |
| B7 | 试跑结果持久化 | 需回溯验证历史试跑 |

> 详见 `phase-2-security-audit/PHASE-2.md` 末尾 Backlog 章节。

### Phase 3 — 记忆管理（✅ 已完成 2026-03-08）

**目标**：完成 `memory-manager` 的设计与基础实现。

| 任务 | 产出物 |
|------|--------|
| 设计三层记忆模型文档 | `references/memory-architecture.md` |
| 设计 Whiteboard 提取模板 | `references/whiteboard-template.md` |
| 实现 memory-search（grep wrapper） | `scripts/memory-search.py` |
| 实现 memory-update（增量更新） | `scripts/memory-update.py` |

**验收结果**：

- [x] memory-search 能检索到 L1/L2/L3 三层内容
- [x] Whiteboard 模板能从对话中提取 Decisions/Actions/Learnings
- [x] 通过 `quick_validate.py`
- [x] 通过 audit.py 安全审计（1 PASS / 0 WARN / 0 CRIT）
- [x] 测试夹具四步全通过（写入→检索→graceful skip→清理）

### Phase 4 — 编排 MVP ✅

**目标**：完成 `agent-orchestrator` 的线性链式编排。

| 任务 | 产出物 |
|------|--------|
| 编写编排链 YAML schema | `references/chain-schema.md` |
| 创建 3 个预定义编排链模板 | `chains/*.yaml` |
| 实现线性链执行器 | `scripts/run-chain.py`（640 行） |

**验收结果**（完成日期：2026-03-09，跨 Agent 验收通过）：

- [x] 能完成"获取推文 → 翻译 → 发布"三步链（validate + plan 模式）
- [x] YAML 编排链格式通过 schema 校验
- [x] 3 条链全部 IO 匹配通过（精确匹配 + 兼容匹配）
- [x] 通过 `quick_validate.py`
- [x] 通过 `audit.py` 安全审计（1 PASS / 0 WARN / 0 CRIT）
- [x] 变量替换正确（$URL → 实际值，含 output 字段替换）
- [x] 错误处理友好（不存在的文件、`--help`/`-h` 均正常处理）
- [x] `type-registry.json` 部署到 `~/.ai-skills/.system/io-contracts/` 并动态加载
- [x] 通过 3 个 Agent 交叉验收（Codex CLI / Gemini CLI / Claude Code），见 `acceptance-reports/`

**驱动 Skill**：`full-cycle-builder`（Medium 规模，首次在 agent-os 项目中使用）

**待改进项（Backlog，Dogfooding 发现）**：

| # | 改进项 | 触发条件 | 来源 |
|---|--------|---------|------|
| P4-B1 | orchestrator 支持条件循环链 | 审查→修订→再审查 工作流 | prepare-x-content 链 dogfooding |
| P4-B2 | `baoyu-image-gen` 部署 `scripts/main.ts` | 需要高清 2K 生图 | 生图验证发现脚本不存在 |
| P4-B3 | orchestrator skill 搜索路径扩展 | `content-for-x` 在 `projects/agent-os/skills/` 而非 `~/.ai-skills/` | validate 找不到 skill |
| P4-B4 | WSL 环境预装 Pillow | 封面图 5:2 裁剪依赖 PIL | 生图验证需临时 venv |
| P4-B5 | .md 源文件改回 Markdown 格式 | 当前纯文本 .md 可读性差，写作不自然 | to-x-html.py 升级支持 `**`→`<strong>`、`*`→`<em>` 转换后，.md 可保留 Markdown |

### Phase 5 — 可观测性（✅ 已完成 2026-03-12）

**目标**：完成 `skill-observability` 的基础版。

| 任务 | 产出物 |
|------|--------|
| 定义日志 JSONL schema | `references/log-schema.md` |
| 实现执行日志记录 | `scripts/log-execution.py`（147 行） |
| 实现未使用 skill 查找 | `scripts/find-unused.py`（134 行） |
| 月度报告生成 | `scripts/report.py`（186 行） |

**验收结果**：

- [x] `log-execution.py` 能追加写入合法 JSONL（含 schema_version）
- [x] `report.py` 统计数据正确（总览 + Top 排行 + 失败率 + Agent 分布 + 耗时）
- [x] `find-unused.py` 能发现 88/90 未使用 skill
- [x] 错误处理友好（无效枚举、文件不存在）
- [x] 通过 `quick_validate.py` + `audit.py`（1 PASS / 0 WARN / 0 CRIT）
- [x] 零外部依赖（纯 Python stdlib）

**驱动 Skill**：`full-cycle-builder`（Medium 规模）+ `deep-research`（Full Mode）

**踩坑记录**：

| # | 踩坑项 | 修复 |
|---|--------|------|
| P5-1 | argparse `nargs="*"` 吞掉后续 flag | 改为逗号分隔 |
| P5-2 | Windows→WSL UNC 路径写入文件带 CRLF | `sed -i 's/\r$//'` |

### Phase 6 — 定时调度（✅ 已完成 2026-03-14）

**目标**：完成 `scheduled-tasks` 的两级架构。

| 任务 | 产出物 |
|------|---------|
| 定义任务 YAML schema | `references/task-schema.md` |
| 实现 crontab 管理 | `scripts/scheduler.py`（394 行） |
| 实现 Level 1 执行器 + YAML 解析中枢 | `scripts/task-runner.py`（407 行） |
| 实现 Level 2 Agent CLI 执行器 | `scripts/agent-wrapper.sh`（99 行） |
| 创建示例任务 | `tasks/example-l1-report.yaml` + `tasks/example-l2-analysis.yaml` |

**验收结果**（完成日期：2026-03-14）：

- [x] scheduler.py list/install/remove/status 4 个子命令全功能
- [x] task-runner.py 解析 YAML 并 --dry-run/--parse/--validate/执行 4 种模式
- [x] agent-wrapper.sh --dry-run 正确输出 Level 2 命令
- [x] YAML 校验拒绝非法任务定义（3 种错误别检测）
- [x] crontab 条目包含 flock 防重叠 + BEGIN/END 标记
- [x] 通过 `quick_validate.py`
- [x] 通过 `audit.py`（1 PASS / 0 WARN / 0 CRIT）

**驱动 Skill**：`full-cycle-builder`（Medium 规模）

**踩坑记录**：

| # | 踩坑项 | 修复 |
|---|--------|------|
| P6-1 | PowerShell Here-String 注入 CRLF 到 WSL bash 参数 | 简单命令用 `wsl -e bash -c` 替代 |
| P6-2 | UNC 路径写入文件自带 CRLF（P5-2 复现） | 统一 `sed -i 's/\r$//'` |

### Phase 7 — MCP 兼容导出（✅ 已完成 2026-03-14）

**目标**：将 SKILL.md frontmatter 导出为 MCP JSON schema。

| 任务 | 产出物 |
|------|---------|
| 调研 MCP 2025-03-26 规范 | Quick Mode 调研结论（映射设计） |
| 定义映射规则 | `references/mcp-schema-mapping.md` |
| 实现导出脚本 | `scripts/export-mcp.py`（320 行） |
| 创建示例任务 | 96 skill 全仓导出 |

**验收结果**（完成日期：2026-03-14）：

- [x] 全仓 96 skill 成功导出为 MCP Tool JSON
- [x] 5 个有 IO 声明的 skill 生成正确的 inputSchema（含 properties + required）
- [x] 91 个无 IO 声明的 skill 生成空 inputSchema `{"type": "object"}`
- [x] `--stats` / `--output` / `--skill` / `--pretty` 4 个 CLI 模式全功能
- [x] 通过 `quick_validate.py`
- [x] 通过 `audit.py`（1 PASS / 0 WARN / 0 CRIT）
- [x] MCP annotations 自动推断（readOnlyHint / destructiveHint / title）
- [x] 导出 JSON 符合 MCP 2025-03-26 规范 Tool 结构

**驱动 Skill**：`full-cycle-builder`（Small 规模）

**踩坑记录**：

| # | 踩坑项 | 修复 |
|---|--------|------|
| P7-1 | `stripped` 文本上匹配 `^\s+` 正则永远失败 | 去掉正则前导空格匹配 |
| P7-2 | section 切换丢失最后一个 item | 切换前保存 pending item |

---

## 六、设计约束与技术决策

### 约束 1：不引入额外后端（核心）

所有新能力以 **skill + 脚本** 形式实现。不引入数据库服务器、Web 框架或常驻进程。

- 持久化数据用本地文件（JSON / Markdown / JSONL）
- 调度用系统原生能力（cron / systemd timer）
- 记忆检索用 grep / ripgrep（不引入向量数据库）

**原因**：避免重蹈 OpenClaw（多层中间件）和 SuperAGI（Docker+PostgreSQL+Redis）的覆辙。

### 约束 2：兼容所有目标 Agent

SKILL.md frontmatter 只用 `name` + `description`（+ 可选 `io`）。脚本用 Python 3 或 Bash。

**Agent 特色能力利用策略**：
- 通用 skill：使用最大公约数，所有 agent 可用
- 增强指南：在 `references/` 中提供 agent-specific 文档
  - `references/antigravity-ki-integration.md`
  - `references/claude-code-auto-memory.md`

### 约束 3：遵循现有统一规范

符合 `SKILLS-SYSTEM-REVIEW.md` 中的所有规范。符合 Claude Code Agent Skills 开放标准。

### 约束 4：安全默认

- 无网络端口监听（纯文件系统操作）
- 凭据不硬编码，统一使用环境变量（`.env` 约定）
- 涉及逆向 API 的 skill 必须有 consent 机制
- 新增 skill 合入前必须通过 `skill-security-audit`

### 约束 5：单 Agent 执行假设

当前设计假设同一时刻只有一个 agent 在主动执行。memory 和 state 的写入不考虑并发安全。如果未来需要多 agent 并发，需引入文件锁或独立状态目录。

### 约束 6：数据格式版本化

所有新引入的数据格式（IO 契约、编排链 YAML、记忆 JSON、日志 JSONL）必须带 `schema_version` 字段。破坏性变更必须提供迁移脚本。

### 约束 7：节奏控制

每个 Phase 只新增 1 个模块。做完做好再做下一个。不做 v1 中规划的 `message-hub`（当前分散方案够用）和 `credential-manager`（用 `.env` 约定代替）。

---

## 七、不做什么（Anti-Patterns）

从反面教材中提炼的"不做"清单，与设计约束同等重要：

| # | 不做 | 原因 | 反面教材 |
|---|------|------|---------|
| 1 | 不做 heartbeat 轮询 | 空转烧钱，90% 的检查什么都没做 | OpenClaw |
| 2 | 不暴露网络端口 | 每一个端口都是攻击面 | OpenClaw ClawJacked |
| 3 | 不一次做 6 个模块 | 功能膨胀→维护不下去→放弃 | SuperAGI |
| 4 | 不引入向量数据库 | JSON + grep 覆盖 80% 场景，不值得引入依赖 | 引力陷阱 |
| 5 | 不建消息 Server | 自己批判的"多层中间件"不要自己重建 | OpenClaw |
| 6 | 不做 OS 级抽象 | 进程调度、syscalls 对个人工具链没有意义 | AIOS |
| 7 | 不做 GUI | 用户是 Agent 和工程师，不是终端用户 | SuperAGI |

---

## 八、参考资料索引

| 文档 | 位置 | 用途 |
|------|------|------|
| 原始推文 | `/tmp/x-article.md` | 原文内容存档 |
| 深度分析文档 | Antigravity artifact | 文章洞察提炼 |
| 架构审查报告 | `ARCHITECTURE-REVIEW.md` | PROJECT.md v1 的问题诊断 |
| 竞品调研 v2 | `COMPETITIVE-RESEARCH.md` | 9 个竞品分析 + 借鉴清单 |
| 竞品调研审查 | `COMPETITIVE-RESEARCH-REVIEW.md` | v1→v2 改进确认 |
| 中心化 Skill 盘点 | `~/.ai-skills/SKILLS-SYSTEM-REVIEW.md` | 现状基线、统一规范 |
| 工作流经验沉淀 | `WORKFLOW-inspiration-to-project.md` | 项目启动方法论 |
| full-cycle-builder Skill | `skills/full-cycle-builder/SKILL.md` | 质量门驱动的全周期开发编排 Skill（v2 通用版）。由来：在 fitness-muscle-building 项目中首次创建（v1），后通过 dogfooding（用 Skill 自身流程优化自身）在 `fitness-muscle-building/skill-optimization/` 中完成通用化优化，产出 v2。优化过程调研了 Shape Up / CrewAI / AI-SDLC 等方案，结合 agent-os 和 fitness 两个项目的实际执行偏差，新增项目类型/规模判定、Skeleton-First、质量门按规模可配、分类踩坑预警库、Methodology-to-Skill 闭环等能力 |

---

## 九、Backlog 汇总表

> v3.0->v3.1 变更：来源：双重审查 盲点 1。全项目 Backlog 项散落在各 Phase 文档中，集中汇总于此方便追踪。所有 Backlog 均为"需求触发"级别，不影响当前版本完整性。

| # | 来源 | 内容 | 触发条件 | 优先级 |
|---|------|------|---------|--------|
| B2-1 | Phase 2 | frontmatter 白名单实现（Layer 3） | 某 skill 需要维度级豁免 | 低 |
| B2-2 | Phase 2 | whitelisted findings 全景图 | 需统计全仓网络请求分布 | 低 |
| B2-3 | Phase 2 | `io:` 声明检测精确化 | 出现 io 误判 | 低 |
| B2-4 | Phase 2 | 空扩展名匹配收窄 | scripts/ 出现无扩展名二进制 | 低 |
| B2-5 | Phase 2 | subprocess curl/wget 检测 | skill 用 subprocess 调网络 | 低 |
| B2-6 | Phase 2 | IO 越界集成 type-registry | IO 契约大规模采纳后 | 低 |
| B2-7 | Phase 2 | 试跑结果持久化 | 需回溯验证历史试跑 | 低 |
| B3-1 | Phase 3 | `cross-agent-sync.md` 跨 agent 同步设计 | 多 Agent 同时使用场景 | 中 |
| B3-2 | Phase 3 | `memory-report.py` 记忆健康度报告 | 需量化记忆系统健康度 | 低 |
| B4-1 | Phase 4 | orchestrator 支持条件循环链 | 审查->修订->再审查 工作流 | 中 |
| B4-2 | Phase 4 | `baoyu-image-gen` 部署 `scripts/main.ts` | 需要高清 2K 生图 | 中 |
| B4-3 | Phase 4 | orchestrator skill 搜索路径扩展 | `content-for-x` 在非标准路径 | 低 |
| B4-4 | Phase 4 | WSL 环境预装 Pillow | 封面图 5:2 裁剪依赖 PIL | 低 |
| B4-5 | Phase 4 | .md 源文件改回 Markdown 格式 | to-x-html.py 升级支持转换后 | 低 |
| B7-1 | Phase 7 | `readOnlyHint` 推断精细化（frontmatter 覆盖字段） | MCP 客户端实际集成时 | 低 |
| B7-2 | Phase 7 | 多行 description 空行终止策略对齐标准 YAML | 出现 description 含中间空行的 skill | 低 |
| B7-3 | Phase 7 | `--validate` 模式（导出后自动校验 JSON 结构） | MCP 客户端实际接入时 | 低 |
| B7-4 | Phase 7 | `mcp-schema-mapping.md` 标注非 MCP 标准扩展字段 | 文档完善 | 已修 |
| B7-5 | Phase 7 | `TYPE_REGISTRY_REL` 改为动态加载 | type-registry 频繁新增类型时 | 低 |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-07 | v1 | 项目创建，完成初版（名称 "Agent OS"，6 个新模块） |
| 2026-03-08 | v2 | 全面修订：更名 Agent Toolchain，新增 IO 契约层（P0），缩小 memory-manager 边界，砍掉 message-hub 和 credential-manager，增加反面教材和引力陷阱过滤，严格节奏控制（每 Phase 1 件事），增加诚实的代价分析和 Anti-Patterns 清单 |
| 2026-03-08 | v2.1 | Phase 1（IO 契约）完成，Phase 0/1 标记 ✅，缺口分析更新，Phase 2 文档创建 |
| 2026-03-08 | v2.2 | Phase 2（安全审计）完成，当前阶段更新为 Phase 3 |
| 2026-03-08 | v2.3 | Phase 3（记忆管理）完成，Phase 3 标记 ✅ + 验收结果记录 + 当前阶段更新为 Phase 4，memory-manager 目录结构标注 Backlog 文件。综合审查修复：grep -F、JSON 原子写入、空关键词拒绝 |
| 2026-03-09 | v2.4 | 新增 `full-cycle-builder` Skill（v2 通用版），来源于 fitness-muscle-building 项目的 dogfooding 优化。包含 SKILL.md + 6 个 references/ 子文件（分类踩坑库 + 部署矩阵 + 质量门预设） |
| 2026-03-09 | v2.5 | Phase 4（编排 MVP）完成，由 `full-cycle-builder` 驱动执行。产出 `agent-orchestrator` skill（SKILL.md + chain-schema.md + run-chain.py 630行 + 3条链）。Phase 4 标记 ✅，当前阶段更新为 Phase 5。新增 CLI 踩坑条目 P4（自写解析器必须用真实数据调试） |
| 2026-03-09 | v2.6 | Phase 4 跨 Agent 验收后修订。修复 6 个跨 Agent 共识/独家发现：链 3 模板漂移→lint-and-publish 链覆盖兼容匹配、type-registry.json 部署到标准位置+新增 json_data→text 规则、IO-002 误报修复（audit.py FILE_WRITE_PATTERNS 精确化）、output 变量替换、--help/-h 支持、布尔值解析。audit 结果 0 WARN→1 PASS / 0 WARN / 0 CRIT。新增 `acceptance-reports/` 目录收录 5 份跨 Agent 报告 |
| 2026-03-09 | v2.7 | 内容发布编排 dogfooding。新增 2 条编排链（`prepare-x-content`、`auto-post-to-x`）串联 4 个 skill（content-for-x→baoyu-cover-image→baoyu-image-gen→content-engine）。重构 `content-engine` 为内容质量审查 skill（X Article 21 项检查清单）。更新 `content-for-x` 配图路由（封面→baoyu-cover-image、插图→baoyu-image-gen、fallback→generate_image）。新增裁剪安全提示词模板到 `baoyu-cover-image`。产出 `content/phase4-launch/` 发布包。发现 4 个 Backlog 项（P4-B1~B4） |
| 2026-03-12 | v2.8 | Phase 5（可观测性）完成。产出 `skill-observability` skill（SKILL.md + log-schema.md + 3 脚本 467 行）。审计 1 PASS / 0 WARN / 0 CRIT。8/8 验收通过。由 `full-cycle-builder`（Medium）+ `deep-research`（Full Mode）驱动。踩坑 2 项（argparse nargs + CRLF）。当前阶段更新为 Phase 6 |
| 2026-03-14 | v2.9 | Phase 6（定时调度）完成。产出 `scheduled-tasks` skill（SKILL.md + task-schema.md + 3 脚本 900 行 + 2 示例任务）。两级架构：Level 1 cron+task-runner.py / Level 2 cron+agent-wrapper.sh。审计 1 PASS / 0 WARN / 0 CRIT。7/7 验收通过。由 `full-cycle-builder`（Medium）驱动。踩坑 2 项（Here-String CRLF + UNC CRLF）。当前阶段更新为 Phase 7 |
| 2026-03-14 | **v3.0** | **🎉 项目完成**。Phase 7（MCP 兼容导出）完成。产出 `mcp-export` skill（SKILL.md + mcp-schema-mapping.md + export-mcp.py 320 行）。96 个 skill 成功导出为 MCP Tool JSON（5 个含 inputSchema properties）。审计 1 PASS / 0 WARN / 0 CRIT。8/8 验收通过。由 `full-cycle-builder`（Small）驱动。踩坑 2 项（正则 stripped 匹配 + section 切换丢失 item）。**全项目 Phase 0-7 共 8 个阶段全部完成，历时 8 天** |
| 2026-03-14 | **v3.1** | **终审修订**（`design-iteration` 驱动）。基于双重审查（`project-audit` + `code-review`）终审报告修订：新增 Backlog 汇总表（19 项集中追踪）、标注各 Phase 文档为历史快照、`mcp-schema-mapping.md` 标注非 MCP 标准扩展字段 + annotations 已知局限。双重审查评分 8.8/10，0 个结构性问题 |
