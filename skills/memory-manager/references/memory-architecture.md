# Memory Architecture — 三层记忆模型

> **所属 Skill**：`memory-manager`
> **文档版本**：v1
> **设计日期**：2026-03-08

---

## 一、三层模型概览

```
┌─────────────────────────────────────────────────────┐
│               Agent Memory Stack                    │
├─────────────────────────────────────────────────────┤
│  L1 身份层（Identity Layer）                         │
│  始终可用 · 定义 Agent 的行为规则和用户画像           │
│  ~/.claude/CLAUDE.md  ~/.gemini/GEMINI.md  ...      │
├─────────────────────────────────────────────────────┤
│  L2 会话层（Session Layer / Whiteboard Memory）      │
│  按需加载 · 跨会话持久化的 Decisions/Actions/Learnings│
│  ~/.ai-memory/whiteboard.json                       │
├─────────────────────────────────────────────────────┤
│  L3 知识层（Knowledge Layer）                        │
│  grep 检索 · 笔记/项目资料/研究素材                  │
│  Obsidian vault · 本地 Markdown · sync-to-brain     │
└─────────────────────────────────────────────────────┘
```

---

## 二、各层详细规格

### L1 身份层

| 属性 | 说明 |
|------|------|
| **内容** | 人格设定、用户画像、行为规则、长期偏好 |
| **文件** | `~/.claude/CLAUDE.md`、`~/.gemini/GEMINI.md`、`~/.codex/AGENTS.md` 等 |
| **读写权限** | Agent 可读；用户手动维护（不由脚本自动写入） |
| **加载策略** | 始终加载（Agent 启动时自动读取） |
| **跨 Agent** | 各 Agent 独立维护自己的身份文件，共享部分可通过软链接 |

> **memory-manager 的角色**：L1 只读检索（`memory-search.py --layer=L1`），不写入。

### L2 会话层（Whiteboard Memory）

| 属性 | 说明 |
|------|------|
| **内容** | Decisions、Actions、Learnings（见 whiteboard-template.md） |
| **文件** | `~/.ai-memory/whiteboard.json` |
| **读写权限** | `memory-manager` 可读可写 |
| **加载策略** | 按需检索（用关键词 grep，不全量加载） |
| **跨 Agent** | 所有 Agent 共享同一个 whiteboard.json（跨 Agent 共享笔记本） |
| **同步** | Git push/pull `~/.ai-memory/` 目录实现跨机器同步 |

**Whiteboard JSON Schema**：

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

### L3 知识层

| 属性 | 说明 |
|------|------|
| **内容** | 笔记、研究素材、项目文档、参考资料 |
| **文件** | Obsidian vault、本地 Markdown、sync-to-brain 产出 |
| **读写权限** | `memory-manager` 只读检索；写入由用户或其他 skill 负责 |
| **加载策略** | grep 全文检索（不全量加载）|
| **路径配置** | `~/.ai-memory/config.json` 中的 `l3_paths` 字段 |

---

## 三、存储路径决策记录

| 候选路径 | 优势 | 劣势 | 决策 |
|---------|------|------|------|
| `~/.ai-memory/` | 独立于 skill 仓库，跨 Agent 共享自然，跨机器同步方便 | 需要额外约定 | ✅ 采用 |
| `~/.ai-skills/.system/memory/` | 在 skill 仓库内，统一管理 | 与 skill 仓库耦合，skill 更新可能影响记忆数据 | ❌ 不采用 |
| `~/Documents/ai-memory/` | 用户目录，可见性好 | 路径因 OS 而异，跨平台一致性差 | ❌ 不采用 |

> **核心理由**：`~/.ai-memory/` 将 **数据与工具完全分离**。skill 仓库（`~/.ai-skills/`）可以随时更新、删除、重建，不会影响积累的记忆数据。这符合「工具是易替换的，数据是需要保护的」原则。

---

## 四、各 Agent 记忆能力对比

| Agent | 原生记忆 | memory-manager 作用 |
|-------|---------|-------------------|
| **Claude Code** | ✅ 有原生 Memory（自动 + CLAUDE.md）| 补充 L2（Whiteboard）跨会话共享；提供 L3 统一检索 |
| **Antigravity** | ✅ 有 KI（Knowledge Items）系统 | L2 补充不能写入 KI 的非正式决策；L3 检索本地资料 |
| **Gemini CLI** | ❌ 无原生记忆 | **核心受益者**：L2 提供跨会话持久化，L1 提供行为规则 |
| **Codex CLI** | ❌ 无原生记忆 | **核心受益者**：同 Gemini CLI |

---

## 五、与现有 6 个记忆 Skill 的关系

| 现有 Skill | 功能 | 与 memory-manager 的关系 |
|-----------|------|------------------------|
| `brain-link` | 生成记忆链接到 Obsidian | 产出存入 L3 → memory-search 可检索 |
| `conversation-distiller` | 从对话提炼摘要 | 产出可作为 memory-update 的输入 |
| `history-reader` | 读取对话历史 | 辅助工具，为 memory-update 提供原始材料 |
| `history-chat` | 与历史对话交互 | 独立 skill，互不干扰 |
| `sync-to-brain` | 同步到 Obsidian | 产出存入 L3 |
| `strategic-compact` | 战略摘要压缩 | 产出可作为 L2 条目写入 |

> **设计原则**：memory-manager 是**检索和写入的统一接口**，不替换现有 skill，而是成为它们产出的消费者。

---

## 六、跨机器同步策略

L2 数据（`~/.ai-memory/`）通过 Git 同步：

```bash
# 推送到远程（工作机 → 家用机）
cd ~/.ai-memory && git add -A && git commit -m "sync: $(date)" && git push

# 从远程拉取
cd ~/.ai-memory && git pull
```

> `~/.ai-memory/` 建议初始化为独立 Git 仓库（私有），与 `~/.ai-skills/` 分开管理。

---

## 七、设计约束

1. **零外部依赖**：纯 Python stdlib + subprocess（grep/ripgrep）
2. **不引入向量数据库**：JSON + grep 覆盖 80% 场景，不值得引入 chromadb
3. **单 Agent 写入假设**：同一时刻只有一个 Agent 写入 whiteboard.json，不做并发锁
4. **数据格式版本化**：所有 JSON 文件含 `schema_version` 字段，破坏性变更需迁移脚本
