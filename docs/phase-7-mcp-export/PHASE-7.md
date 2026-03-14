# Phase 7 — MCP 兼容导出

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：构建 `mcp-export` — 将 SKILL.md frontmatter 导出为 MCP Tool JSON Schema
> **启动日期**：2026-03-14
> **状态**：✅ 完成
> **前序 Phase**：Phase 6（定时调度）✅ 已完成
> **文档版本**：v2（完成）
> **驱动 Skill**：`full-cycle-builder`（Small 规模，质量门 B ≥ 7.5）

---

## 调研结论（Quick Mode）

### MCP Tool Schema 格式（2025-03-26 规范）

根据 [MCP 官方规范](https://modelcontextprotocol.io/specification/2025-03-26/server/tools)，`tools/list` 响应中每个 Tool 的 JSON 结构为：

```json
{
  "name": "tool_name",
  "description": "Human-readable description of functionality",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Parameter description"
      }
    },
    "required": ["param1"]
  },
  "annotations": {
    "title": "Human-readable display name",
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### SKILL.md → MCP Tool 映射设计

| SKILL.md frontmatter | MCP Tool JSON | 映射策略 |
|---------------------|---------------|---------|
| `name` | `name` | 直接映射（kebab-case → snake_case 或保留） |
| `description` | `description` | 直接映射 |
| `io.input[].type` | `inputSchema.properties` | 基于 type-registry.json 转换为 JSON Schema 类型 |
| `io.input[].description` | `inputSchema.properties.*.description` | 直接映射 |
| `io.input[].required` | `inputSchema.required` | 默认 true，除非标注 `required: false` |
| `io.output` | — | MCP Tool 输出通过 `content[]` 返回，不放入 schema |
| （无对应） | `annotations.title` | 从 `name` 生成可读标题 |
| （推断） | `annotations.readOnlyHint` | 纯文档类 skill → `true`，有 scripts/ → `false` |
| （推断） | `annotations.destructiveHint` | 默认 `false`（Agent Toolchain skill 大多非破坏性） |
| （推断） | `annotations.openWorldHint` | 根据 audit.py 网络请求扫描结果推断 |

### IO 类型 → JSON Schema 类型映射

| type-registry 类型 | JSON Schema 映射 |
|-------------------|-----------------|
| `text` | `{"type": "string"}` |
| `markdown_file` | `{"type": "string", "description": "Path to Markdown file"}` |
| `url` | `{"type": "string", "format": "uri"}` |
| `image_file` | `{"type": "string", "description": "Path to image file"}` |
| `json_data` | `{"type": "string", "description": "Path to JSON file or inline JSON"}` |
| `html_file` | `{"type": "string", "description": "Path to HTML file"}` |
| `directory` | `{"type": "string", "description": "Path to directory"}` |

### 无 `io:` 声明的 skill 处理

~85/90 个 skill 没有 `io:` 声明。对这些 skill：
- `inputSchema` 设为 `{"type": "object"}` （空输入，表示 Agent 自由传参）
- `description` 保持原样（MCP 客户端靠 description 理解用途）
- 这符合 MCP 规范：inputSchema 为空 object 表示"无需结构化参数"

### 导出范围决策

| 决策 | 选项 | 决定 | 理由 |
|------|------|------|------|
| 导出格式 | 单文件 vs 每 skill 一个文件 | **单文件** `tools.json` | MCP `tools/list` 返回的就是数组，统一导出最直接 |
| name 格式 | kebab-case vs snake_case | **保留 kebab-case** | MCP 规范中 name 是"unique identifier"，不要求 snake_case |
| 是否导出 disabled skill | 是/否 | **全部导出** | 筛选是客户端/LLM 的事，导出尽量全面 |
| 输出目录 | 固定 vs 可配置 | **`--output` 参数指定**，默认 stdout | CLI 工具标准做法 |

### 引力陷阱过滤

| 被砍掉的 | 为什么 |
|---------|--------|
| ~~MCP Server 运行时~~ | 违反"零基础设施"约束，只做导出 |
| ~~JSON-RPC 通信协议实现~~ | 导出 schema 不需要通信层 |
| ~~MCP Registry 注册~~ | 超出 MVP，可未来扩展 |
| ~~outputSchema 导出~~ | MCP outputSchema 是可选的，MVP 不做 |

---

## 一、定位

### 为什么 MCP 导出是最后一步（PROJECT.md 优先级 P6）

> MCP 是行业标准方向，不是"引入依赖"而是"导出接口"。—— PROJECT.md §4.2.7

前 6 个 Phase 建立了完整的内部工具链。Phase 7 让这个工具链可以被外部 MCP 兼容 Agent **发现和理解**。从"内部工具链"升级为"可对外输出能力的体系"。

---

## 二、前置条件

| 条件 | 状态 |
|------|------|
| Phase 1 IO 契约 + type-registry.json 已部署 | ✅ |
| 5 个试点 skill 有 `io:` 声明 | ✅ |
| `quick_validate.py` 可用 | ✅ |
| `audit.py` 可用 | ✅ |

---

## 三、任务清单

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0 | 创建目录结构和 SKILL.md | 前置 | `~/.ai-skills/mcp-export/SKILL.md` | ✅ |
| T1 | 定义映射规则文档 | 设计 | `references/mcp-schema-mapping.md` | ✅ |
| T2 | 实现导出脚本 `export-mcp.py` | 开发 | `scripts/export-mcp.py` | ✅ |
| T3 | 安全审计 + 格式校验 | 验证 | 1 PASS / 0 WARN / 0 CRIT | ✅ |
| T4 | 端到端验收 | 验收 | 8/8 验收项通过 | ✅ |

### 依赖关系

```
T0（目录 + SKILL.md）
  ↓
T1（映射规则文档）
  ↓
T2（export-mcp.py）
  ↓
T3（安全审计）
  ↓
T4（端到端验收）
```

---

## 四、各任务详细设计

### T0 创建目录结构和 SKILL.md

**目录结构**（与 PROJECT.md §4.2.7 对齐）：

```
~/.ai-skills/mcp-export/
├── SKILL.md                     # MCP 导出工具 skill 定义
├── references/
│   └── mcp-schema-mapping.md    # SKILL.md → MCP JSON 映射规则
└── scripts/
    └── export-mcp.py            # 导出脚本
```

**SKILL.md frontmatter**：
- `name: mcp-export`
- `description` 含触发词：`MCP`、`Model Context Protocol`、`导出`、`JSON schema`、`tools/list`

---

### T1 定义映射规则文档

`references/mcp-schema-mapping.md` 内容：
- MCP Tool JSON 结构定义（基于 2025-03-26 规范）
- SKILL.md frontmatter → MCP Tool 映射表
- type-registry.json 类型 → JSON Schema 映射表
- 无 `io:` 声明 skill 的处理策略
- annotations 推断规则

---

### T2 实现 `export-mcp.py`

**CLI 接口**：

```bash
# 导出所有 skill 到 stdout
python3 export-mcp.py

# 导出到文件
python3 export-mcp.py --output tools.json

# 导出指定 skill
python3 export-mcp.py --skill translate --skill baoyu-danger-x-to-markdown

# 统计模式（不输出 JSON，只输出统计信息）
python3 export-mcp.py --stats

# 导出时带 pretty print
python3 export-mcp.py --pretty
```

**实现要点**：

1. **扫描 skill 目录**：遍历 `~/.ai-skills/*/SKILL.md`
2. **解析 frontmatter**：提取 `---` 之间的 YAML（手写子集解析器，零外部依赖）
3. **IO 声明解析**：
   - 有 `io:` → 解析 input/output 字段，映射为 `inputSchema`
   - 无 `io:` → `inputSchema` 设为 `{"type": "object"}`
4. **type-registry 映射**：硬编码 7 种 IO 类型到 JSON Schema 的映射（与 `type-registry.json` v1.0 同步，未来可升级为动态加载）
5. **annotations 推断**：
   - 有 `scripts/` 目录 → `readOnlyHint: false`
   - 无 `scripts/` 目录（纯文档 skill）→ `readOnlyHint: true`
   - `destructiveHint` 默认 `false`
   - `openWorldHint` 默认 `false`（由用户按需覆盖）
6. **输出格式**：`{"schema_version": "1.0", "mcp_spec_version": "2025-03-26", "exported_at": "...", "tools": [...]}`
7. **统计模式**：输出总 skill 数、有 IO 声明数、导出工具数
8. 零外部依赖：`os`、`sys`、`argparse`、`json`、`datetime`、`re`、`glob`

**frontmatter YAML 子集解析**：
- 复用 Phase 4/6 的 YAML 解析策略
- 支持：`name: value`、多行 `description: >` / `description: |`、嵌套 `io:` 结构
- `io:` 嵌套解析：基于缩进层级解析 `input:` / `output:` 列表

---

### T3 安全审计 + 格式校验

```bash
# 格式校验
python3 ~/.ai-skills/.system/skill-creator/scripts/quick_validate.py \
  ~/.ai-skills/mcp-export

# 安全审计
python3 ~/.ai-skills/skill-security-audit/scripts/audit.py \
  ~/.ai-skills/mcp-export
```

**验收标准**：0 CRITICAL。

---

### T4 端到端验收

**验收清单**：

| # | 验证项 | 判定标准 |
|---|--------|----------|
| V1 | `export-mcp.py` 能扫描全仓 skill | 输出包含 90+ 个 tool |
| V2 | 有 `io:` 声明的 skill 生成正确的 `inputSchema` | translate 的 inputSchema 包含 file 和 url 属性 |
| V3 | 无 `io:` 声明的 skill 生成空 `inputSchema` | `{"type": "object"}` |
| V4 | `--stats` 输出统计信息 | 总数、有 IO 数、导出数 |
| V5 | `--output` 写入文件正确 | JSON 文件可解析 |
| V6 | `quick_validate.py` 通过 | PASS |
| V7 | `audit.py` 0 CRITICAL | PASS |
| V8 | 导出的 JSON 符合 MCP Tool 结构 | 每个 tool 有 name + description + inputSchema |

---

## 五、不在 Phase 7 范围

| 什么 | 为什么不做 |
|------|----------|
| MCP Server 运行时 | 核心约束：零基础设施 |
| JSON-RPC 通信层 | 导出 schema 不需要通信 |
| MCP Registry 注册 | MVP 不做，可未来扩展 |
| outputSchema 导出 | MCP 可选字段，MVP 跳过 |
| 实际 MCP 客户端集成测试 | 需要 MCP 运行时环境，超出范围 |

---

## 六、全周期状态

| Phase | 状态 | 评分 | 备注 |
|-------|------|------|------|
| 0 上下文+骨架 | ✅ | — | Small 规模，CLI 工具 |
| 1.1 调研 v1 | ✅ | — | Quick Mode：MCP 规范 2025-03-26 |
| 1.4 质量门 A | ✅ | — | Small 跳过正式调研 |
| 2.1 规划 v1 | ✅ | — | 本文档 |
| 2.2 审查 | ✅ | 8.5 | 🔴x0 🟡x3（多行解析+嵌套解析+schema合规） |
| 2.3 修订 v2 | ✅ | — | 审查意见在编码阶段直接处理 |
| 2.4 质量门 B | ✅ | 8.5 | ≥ 7.5 通过（Small） |
| 3.1 编码 | ✅ | — | export-mcp.py 320 行 |
| 3.3 踩坑检查 | ✅ | — | universal.md + cli-tool.md 检查 |
| 3.4 质量门 C | ✅ | — | 8/8 验收项通过 |
| 4 部署 | ✅ | — | 已安装到 ~/.ai-skills/mcp-export/ |
| 5 经验沉淀 | ✅ | — | 踩坑记录 + PROJECT.md 更新 |

---

## 七、踩坑记录

| # | 踩坑项 | 根因 | 修复 | 预防 |
|---|--------|------|------|------|
| P7-1 | `_parse_io_block` 正则在 `stripped` 文本上匹配 `^\s+` | `line.lstrip()` 后再匹配带前导空格的正则，永远不匹配 | 去掉正则中的 `^\s+` 前缀，直接在 stripped 文本上匹配 | 正则匹配前确认目标字符串是否已经做过 strip |
| P7-2 | section 切换丢失最后一个 item | 切换到 output 时未先保存 input 的 pending current_item | 在 section 切换代码中加 `if current_item: io[section].append()` | 所有"状态切换"逻辑都检查"前一状态是否有未保存数据" |

---

## 变更日志

| 日期 | 版本 | 变更 | 审查结果 |
|------|------|------|---------|
| 2026-03-14 | v2 | Phase 7 完成。产出 `mcp-export` skill（SKILL.md + mcp-schema-mapping.md + export-mcp.py 320 行）。审计 1 PASS / 0 WARN / 0 CRIT。8/8 验收通过。96 个 skill 成功导出为 MCP Tool JSON | — |
| 2026-03-14 | v1 | Phase 7 文档创建。Quick Mode 调研 MCP 规范 + 完整规划 + 任务清单 + 详细设计 | 8.5/10（🔴x0 🟡x3）通过 |

