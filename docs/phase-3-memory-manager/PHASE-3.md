# Phase 3 — 记忆管理

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：为无记忆 Agent 提供记忆基础设施，建立跨 Agent 共享笔记本
> **启动日期**：2026-03-08
> **状态**：✅ 已完成（2026-03-08）
> **前序 Phase**：Phase 2（Skill 安全审计）✅ 已完成
> **文档版本**：v2（基于架构审查修订）

---

## 一、定位

### 为什么记忆管理是 P2

> 无记忆是所有 Agent（Codex、Gemini 等）的核心痛点。—— 项目缺口分析

当前 90+ skill 中虽然已有 6 个记忆相关 skill（`brain-link`、`conversation-distiller`、`history-reader` 等），但各自独立、无统一策略，跨 Agent 共享能力缺失。具体痛点：

1. **Codex/Gemini 无原生记忆**：每次对话从零开始，无法利用历史 Decisions/Actions/Learnings
2. **记忆分散、无法检索**：6 个记忆 skill 各自为政，没有统一接口
3. **没有 Whiteboard 机制**：对话中的关键决策无法自动提取并持久化
4. **无跨 Agent 共享**：Claude 积累的知识无法被 Gemini 使用

### Phase 1 & 2 经验回顾

| 前序 Phase 经验 | Phase 3 应用 |
|---------------|-------------|
| Phase 1：IO 契约定义了 skill 的标准输入输出 | memory-manager 的 Whiteboard JSON 格式参照 IO 契约的 schema 设计风格（含 `schema_version`） |
| Phase 1：渐进式采纳，不强制现有 skill 改造 | memory-manager 对现有 6 个记忆 skill 不做破坏性改造，提供统一检索层即可 |
| Phase 2：新 skill 必须通过 `audit.py` 安全审计 | T0 完成后立即运行 `audit.py`，memory-manager 的脚本必须零 CRITICAL |
| Phase 2：三层误报控制 | memory-search.py 的 grep wrapper 要考虑特殊字符和大文件的边界处理 |
| Phase 2：验收脚本化（quick_validate.py） | T5 写验收脚本，机器验收而非人眼看 |

---

## 二、边界定义

### memory-manager 负责什么

```
memory-manager 负责管理的（可读可写）：
  ✅ L1 身份层 — 各 agent 配置文件（CLAUDE.md 等）
  ✅ L2 会话层 — 独立于任何 agent 的笔记/摘要（Whiteboard Memory）
  ✅ L3 知识层 — Obsidian / 本地文件 / sync-to-brain

memory-manager 不管但可以利用的（只读/建议）：
  ⚠️ Claude 原生 Memory → 只能建议用户在对话中触发
  ⚠️ Antigravity KI → 只能读取，不能写入
  ⚠️ Claude Code auto-memory → 完全不可控
```

### 不在 Phase 3 范围

| 什么 | 为什么不做 |
|------|----------|
| 向量数据库（chromadb 等） | JSON + grep 覆盖 80% 场景，零依赖约束优先 |
| 实时跨 Agent 同步 | 用 Git push/pull 代替，无需运行时守护进程 |
| 修复现有 6 个记忆 skill | Phase 3 只建基础设施 + 统一检索，不破坏现有资产 |
| 语义相似度检索 | grep 已经够用，引入 embedding 违反零依赖约束 |
| memory-manager 集成到现有 skill | 先做好独立工具，集成等真实需求出现再加 |

---

## 三、设计规格

### 三层记忆模型（借鉴 Semantic Kernel Whiteboard + Letta 虚拟上下文）

| 层级 | 内容 | 存储位置 | 加载策略 |
|------|------|---------|---------|
| **L1 身份层** | 人格、用户画像、行为规则 | `CLAUDE.md` / 各 agent 配置 | 始终加载 |
| **L2 会话层** | Decisions / Actions / Learnings | `~/.ai-memory/whiteboard.json` | 相关时加载 |
| **L3 知识层** | 笔记、项目资料、研究素材 | Obsidian / 本地 Markdown | 按需检索（grep） |

### Whiteboard JSON 格式（借鉴 Phase 1 IO 契约 schema 风格）

```json
{
  "schema_version": "1.0",
  "last_updated": "2026-03-08T22:00:00+08:00",
  "entries": [
    {
      "id": "wb-001",
      "type": "decision | action | learning",
      "content": "决定使用 JSON + grep 而非 chromadb",
      "project": "agent-os",
      "tags": ["architecture", "memory"],
      "created_at": "2026-03-08T20:00:00+08:00",
      "source_conversation": "optional-conversation-id"
    }
  ]
}
```

### 增量更新机制（借鉴 Mem0）

```
1. 从对话/文件中提取新记忆条目
2. 与 whiteboard.json 中已有条目比较
3. 判断：新增 / 合并 / 替换 / 保留
4. 写回 whiteboard.json
```

### 目录结构

```
memory-manager/
├── SKILL.md
├── references/
│   ├── memory-architecture.md     # 三层模型详细文档
│   └── whiteboard-template.md     # 提取模板（什么是 Decision/Action/Learning）
└── scripts/
    ├── memory-search.py           # 统一检索（grep wrapper，支持 L1/L2/L3）
    └── memory-update.py           # 增量更新 + 冲突检测
```

---

## 四、任务清单

> **v1→v2 变更**：T1（安全审计）从 T0 之后移到 T5 之后。原 v1 位置（T0 后）脚本目录尚不存在，审计空 skill 无意义；移到脚本实现完成后才有真实审计价值。来源：审查 🔴#1

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0 | 创建 `memory-manager` 目录结构和 SKILL.md | 前置 | `skills/memory-manager/SKILL.md` | ✅ 完成 |
| T2 | 编写三层模型文档（含存储路径决策） | 文档 | `references/memory-architecture.md` | ✅ 完成 |
| T3 | 编写 Whiteboard 提取模板 | 文档 | `references/whiteboard-template.md` | ✅ 完成 |
| T4 | 实现 `memory-search.py` | 开发 | grep wrapper，支持 L1/L2/L3 三层检索 | ✅ 完成 |
| T5 | 实现 `memory-update.py` | 开发 | 增量更新 + 冲突检测 + 初始化逻辑 | ✅ 完成 |
| T1 | 运行 `audit.py` 对完整 skill 做安全审计 | 验证 | 审计报告（0 CRITICAL） | ✅ 完成（1 PASS / 0 WARN / 0 CRIT）|
| T6 | 验收：`quick_validate.py` + 测试夹具 | 验收 | 验收结果（PASS） | ✅ 完成 |

### 依赖关系

> **v1→v2 变更**：依赖链重排（T1 移后），T2→T3 改为串行（T3 依赖 T2 建立的三层概念）。来源：审查 🔴#1、🟢#1

```
T0（目录 + SKILL.md）
  ↓
T2（memory-architecture.md）
  ↓
T3（whiteboard-template.md）
  ↓
T4（memory-search.py）
  ↓
T5（memory-update.py）
  ↓
T1（安全审计——脚本完成后才有实质审计价值）
  ↓
T6（验收：quick_validate + 测试夹具）
```

---

## 五、各任务详细设计

### T0 创建目录结构和 SKILL.md

**操作**：在 `~/.ai-skills/memory-manager/`（或 `~/.gemini/skills/memory-manager/`）创建目录，编写 SKILL.md（含 frontmatter）。

**SKILL.md frontmatter 要求**：
- `name: memory-manager`
- `description` 要含触发词：`记忆`、`memory`、`whiteboard`、`历史决策`
- 声明 `io:` 字段（遵循 Phase 1 IO 契约）

---

### T1 安全审计（Phase 2 产出的利用）

> Phase 2 约束：新增 skill 合入前必须通过 `skill-security-audit`

**操作**：
```bash
python3 ~/.ai-skills/skill-security-audit/scripts/audit.py ~/.ai-skills/memory-manager
```

**验收标准**：0 CRITICAL，WARNING 数量可接受（无硬编码凭据）

---

### T2 编写 `memory-architecture.md`

**核心内容**：
- 三层模型详细说明（L1/L2/L3 各层的文件路径、格式、读写权限）
- 各 Agent 的记忆能力差异对比（Claude / Gemini / Codex）
- 跨 Agent 同步策略（Git push/pull + 约定目录）
- 与现有 6 个记忆 skill 的协作关系

**存储路径决策记录**（v1→v2 新增，来源：审查 🟡#1）：

| 候选路径 | 优势 | 劣势 | 决策 |
|---------|------|------|------|
| `~/.ai-memory/` | 独立于 skill 仓库，跨 Agent 共享更自然 | 需要额外约定 | ✅ 采用 |
| `~/.ai-skills/.system/memory/` | 在 skill 仓库内，统一管理 | 与 skill 仓库耦合，不适合跨机器同步 | ❌ 不采用 |
| `~/Documents/ai-memory/` | 用户可见 | 路径因 OS 而异，跨平台问题 | ❌ 不采用 |

> **理由**：`~/.ai-memory/` 保持 L2 数据完全独立于工具链本身，使得 skill 仓库更新不影响记忆数据，符合「数据与工具分离」原则。

---

### T3 编写 `whiteboard-template.md`

**核心内容**：
- 什么算 Decision（决策）：两个以上方案之间做了明确的选择
- 什么算 Action（行动）：承诺要做但尚未完成的任务
- 什么算 Learning（学习）：实施中发现的规律或反模式
- 提取示例：从对话片段中识别 D/A/L 的 3 个范例

---

### T4 实现 `memory-search.py`

**设计约束**：零外部依赖（纯 Python stdlib + subprocess grep）

**接口设计**：

```bash
# 全层检索
python3 memory-search.py "关键词"

# 指定层检索
python3 memory-search.py "关键词" --layer=L2

# 指定项目检索
python3 memory-search.py "关键词" --project=agent-os

# 输出 JSON（供其他 skill 机器消费）
python3 memory-search.py "关键词" --json
```

**检索范围**：
- L1：`~/.claude/CLAUDE.md`、`~/.gemini/GEMINI.md` 等（硬编码常见路径，存在才扫）
- L2：`~/.ai-memory/whiteboard.json`
- L3：路径从 `~/.ai-memory/config.json` 读取（v1→v2 新增，来源：审查 🔴#2）

**L3 路径配置文件格式**（`~/.ai-memory/config.json`）：

```json
{
  "schema_version": "1.0",
  "l3_paths": [
    "/home/yangyy/Documents/obsidian-vault"
  ]
}
```

**路径缺失的 Graceful Skip 策略**（v1→v2 新增，来源：审查 🔴#2）：

| 情形 | 行为 |
|------|------|
| `config.json` 不存在 | 跳过 L3，输出 `L3: skipped (config not found)` |
| config 中的路径不存在 | 跳过该路径，输出 `L3: skipped (path not found: /path/to/vault)` |
| `whiteboard.json` 不存在 | 跳过 L2，输出 `L2: skipped (whiteboard not initialized)` |
| L1 配置文件不存在 | 跳过该文件，继续扫描其他 L1 文件 |

---

### T5 实现 `memory-update.py`

**设计约束**：零外部依赖，L2 JSON 写入前做格式校验

**接口设计**：

```bash
# 从文本中提取并更新
python3 memory-update.py --from-text "今天决定用 JSON 而非 chromadb" --type=decision

# 从文件中提取
python3 memory-update.py --from-file conversation.md --project=agent-os

# 查看当前 whiteboard
python3 memory-update.py --list
```

**首次运行初始化逻辑**（v1→v2 新增，来源：审查 🟡#2）：

```python
# 首次运行时自动初始化，不报错
def ensure_initialized():
    ai_memory_dir = Path.home() / '.ai-memory'
    ai_memory_dir.mkdir(exist_ok=True)
    
    whiteboard = ai_memory_dir / 'whiteboard.json'
    if not whiteboard.exists():
        whiteboard.write_text(json.dumps({
            'schema_version': '1.0',
            'last_updated': datetime.now().isoformat(),
            'entries': []
        }, ensure_ascii=False, indent=2))
    
    config = ai_memory_dir / 'config.json'
    if not config.exists():
        config.write_text(json.dumps({
            'schema_version': '1.0',
            'l3_paths': []
        }, ensure_ascii=False, indent=2))
```

**冲突检测**：
- 新条目与已有条目内容相似度 > 80%（简单字符串重叠率）→ 提示用户确认是否合并
- 同一 project 同一 type 的条目过多（>50）→ 提示压缩

---

### T6 验收

**操作**：

```bash
python3 ~/.ai-skills/quick_validate.py ~/.ai-skills/memory-manager
```

**测试夹具步骤**（v1→v2 新增，来源：审查 🟡#3）：

```bash
# Step 1：写入测试条目（确保 L2 有内容可检索）
python3 memory-update.py --from-text "[TEST] 验收测试条目，请勿删除" --type=learning --project=_test

# Step 2：验证 L2 检索
python3 memory-search.py "验收测试" --layer=L2
# 预期：返回上一步写入的条目

# Step 3：验证 graceful skip（L3 路径不配置时）
python3 memory-search.py "验收测试"
# 预期：L1/L2 有结果，L3 输出 skipped 而非报错

# Step 4：清理测试数据
python3 memory-update.py --delete-project=_test
```

**验收清单**：

| 验证项 | 判定标准 |
|--------|---------|
| quick_validate.py | PASS |
| memory-update.py 写入后可被 memory-search 检索 | 测试条目检索成功 |
| L3 路径未配置时 graceful skip | 无报错，输出 `L3: skipped` |
| Whiteboard JSON 含 schema_version | 满足 Phase 1 IO 契约约束 6（数据版本化） |
| audit.py 0 CRITICAL | T1 审计结果 |

---

## 六、验收标准

| # | 标准 | 验证方式 |
|---|------|---------| 
| V1 | memory-search 能检索到 L1/L2/L3 三层内容 | 脚本执行，各层有结果 |
| V2 | Whiteboard 模板能指导从对话中提取 D/A/L | 人工验证 3 个提取示例 |
| V3 | memory-update 能写入并增量更新 whiteboard.json | 写入后文件可被 JSON 解析 |
| V4 | `memory-manager` skill 通过 `quick_validate.py` | 脚本执行 PASS |
| V5 | 新 skill 通过 `audit.py` 安全审计（0 CRITICAL） | audit.py 执行结果 |

---

## 七、不在 Phase 3 范围

| 什么 | 为什么不做 |
|------|----------|
| `memory-report.py`（记忆健康度报告） | PROJECT.md 规格中有，但 MVP 先做检索和更新 |
| `cross-agent-sync.md`（同步文档） | Git 约定足够，文档放到 references/ 可后续补充 |
| 集成到现有记忆 skill | 不破坏现有资产，phase 3 先建基础设施 |
| 沙箱测试 | 同 Phase 2，不引入额外执行环境 |

---

## v2 对 v1 审查意见的逐条回应

| 审查意见 | 类型 | v2 修订 | 状态 |
|---------|------|--------|------|
| T1（安全审计）位置不对，审计空 skill 无意义 | 🔴 | T1 移到 T5 之后，依赖链重排，任务清单编号调整 | ✅ 已修 |
| L3 路径配置机制不清晰，路径缺失时行为未定义 | 🔴 | T4 新增 config.json 配置格式 + 四种路径缺失的 graceful skip 策略 | ✅ 已修 |
| `~/.ai-memory/` 路径在前序文档中从未定义 | 🟡 | T2 新增「存储路径决策记录」三路对比表 + 决策理由 | ✅ 已修 |
| 缺少首次运行初始化逻辑 | 🟡 | T5 新增 `ensure_initialized()` 函数设计，自动创建目录和空白 JSON | ✅ 已修 |
| 验收 V1 测试数据从哪来未定义 | 🟡 | T6 新增测试夹具四步骤（写入→检索→graceful skip→清理） | ✅ 已修 |
| 依赖图 T2→T3 应为串行 | 🟢 | 依赖图改为完整串行链，T2→T3→T4→T5→T1→T6 | ✅ 已修 |
| 状态栏「规划中（v1）」重复 | 🟢 | 去掉括号内重复的 v1 | ✅ 已修 |

---

## 变更日志

| 日期 | 版本 | 变更 | 审查结果 |
|------|------|------|---------|
| 2026-03-08 | v1 | Phase 3 项目文档创建 | 🔴x2 🟡x3 🟢x2（见架构审查） |
| 2026-03-08 | v2 | 修订：T1 位置调整、L3 config 机制、存储路径决策记录、初始化逻辑、测试夹具、依赖图修正 | ✅ 再审查通过（8.8/10）|
| 2026-03-08 | v2.1 | T0-T6 全部执行完成。audit.py：1 PASS / 0 WARN / 0 CRIT。quick_validate：PASS。测试夹具四步全通过（初始化→写入→检索→graceful skip→清理）。 | ✅ 执行完成 |
