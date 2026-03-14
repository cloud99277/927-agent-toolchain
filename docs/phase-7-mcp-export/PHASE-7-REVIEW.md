# Phase 7 — 架构审查报告

> **审查视角**：顶级系统架构师
> **审查对象**：Phase 7 全部交付物（PHASE-7.md + SKILL.md + mcp-schema-mapping.md + export-mcp.py + PROJECT.md 更新）
> **审查日期**：2026-03-14
> **审查类型**：已完成 Phase 的实施验证（设计 + 代码 + 文档一致性）

---

## 总评

**方向正确率：8.5/10**

Phase 7 成功完成了"只做导出、不做运行时"的核心定位，在约束范围内交付了一个实用的 MCP 兼容导出工具。代码质量适中（457 行，结构清晰），frontmatter 解析器成功处理了多行 description 和嵌套 io 结构。最大风险是 annotations 推断的粗粒度导致部分 skill 的行为提示与实际不符。

---

## 🔴 结构性问题（1 个）

### 问题 1：`TYPE_REGISTRY_REL` 常量声明但未使用

**诊断**：`export-mcp.py` 第 34 行声明了 `TYPE_REGISTRY_REL = ".system/io-contracts/type-registry.json"`，但代码中从未读取 type-registry.json 文件。IO 类型到 JSON Schema 的映射完全硬编码在 `IO_TYPE_TO_JSON_SCHEMA` 字典中（第 43-51 行）。

**后果**：
- 如果 type-registry.json 新增了类型（如 Phase 4 新增的 `json_data→text` 规则），export-mcp.py 不会自动感知
- 违反 PHASE-7.md §四 T2 实现要点第 4 条——"**type-registry 加载**：读取 `~/.ai-skills/.system/io-contracts/type-registry.json` 获取类型定义"
- **文档承诺 ≠ 代码实现**

**建议**：要么实际读取 type-registry.json 并从中动态构建映射，要么在文档中明确标注"当前为硬编码映射，未来可升级为动态加载"，并移除或注释掉 `TYPE_REGISTRY_REL` 常量以避免误导。

---

## 🟡 设计盲点（4 个）

### 盲点 1：annotations `readOnlyHint` 推断逻辑粗放

**缺什么**：当前用"是否有 `scripts/` 目录"来推断 `readOnlyHint`。但部分纯 SKILL.md 的 skill（如 `baoyu-post-to-wechat`）虽无 scripts 目录，实际上会指导 Agent 执行有副作用的操作（发布到微信）。
**实际影响**：`baoyu-post-to-wechat` 被标记为 `readOnlyHint: true`，但它实际上会发布内容。MCP 客户端可能因此跳过确认提示。
**建议**：
- 在 mcp-schema-mapping.md 中增加"已知局限"章节，说明 annotations 是粗粒度启发式推断
- 考虑在 SKILL.md frontmatter 中支持可选的 `mcp_annotations:` 覆盖字段（Backlog）

### 盲点 2：PHASE-7.md 头部状态未更新

**缺什么**：PHASE-7.md 第 6-8 行仍然是：
```
> **状态**：🔧 进行中
> **文档版本**：v1（调研 + 规划）
```
但 Phase 7 已经完成。文档头部和底部全周期状态表不一致。
**建议**：更新为 `✅ 完成` 和 `v2（完成）`。

### 盲点 3：任务清单状态列未更新

**缺什么**：PHASE-7.md §三 任务清单中，T0-T4 全部仍然标为 `⬜`，但实际已全部完成。
**建议**：更新为 `✅`。

### 盲点 4：多行 `description: >` 解析的空行终止策略与实际 YAML 行为有微妙差异

**缺什么**：代码中对 `>` 折叠块的终止条件是"遇到空行就终止"（第 109-116 行）。但标准 YAML 折叠块的终止是"遇到缩进回退到上层"。如果某个 SKILL.md 的 description 多行折叠块中间包含空行（合法 YAML），解析会提前截断。
**实际影响**：当前 96 个 skill 中这种场景概率很低（大部分 description 是连续文本），但长期可能出现。
**建议**：在 PHASE-7.md 踩坑记录或 Backlog 中标注此局限。

---

## 🟢 优化建议（3 个）

### 建议 1：`--help` / `-h` 已正确支持 ✅

argparse 已自动支持，无需额外处理。

### 建议 2：考虑 `--validate` 模式

导出后自动检查每个 tool 的 JSON 结构合规性。可作为 Backlog，当用户实际接入 MCP 客户端时按需添加。

### 建议 3：导出 JSON 中 `stats` 字段是非标准扩展

MCP `tools/list` 响应标准中只有 `tools` 数组和可选的 `nextCursor`。当前 `stats`、`schema_version`、`mcp_spec_version` 是自定义扩展。这不影响兼容性（MCP 客户端会忽略未知字段），但建议在 mcp-schema-mapping.md 中明确标注"顶层字段中只有 `tools` 是 MCP 标准字段，其余为 Agent Toolchain 扩展"。

---

## 实施验证

| 检查项 | 结果 |
|--------|------|
| 文档承诺 vs 代码实现 | 🟡 `TYPE_REGISTRY_REL` 声明但未使用（🔴 问题 1） |
| 代码行为 vs 文档描述 | ✅ 一致（96 skill 导出、IO 映射、annotations 推断） |
| 设计约束 vs 代码遵守 | ✅ 零外部依赖、纯 Python stdlib |
| 前序 Phase 约束兑现 | ✅ `schema_version` 有、`quick_validate` 通过、`audit.py` 通过 |
| 错误处理 | ✅ 不存在的 skill 返回友好提示 + exit code 1 |
| CLI 接口功能 | ✅ 5 种模式（默认/--output/--skill/--stats/--pretty）全功能 |

---

## 修改建议汇总表

| # | 类型 | 建议 | 影响范围 | 优先级 |
|---|------|------|---------|--------|
| 1 | 🔴 | `TYPE_REGISTRY_REL` 声明但未使用，文档承诺动态加载但实际硬编码 | export-mcp.py + PHASE-7.md | 修复（改文档或改代码） |
| 2 | 🟡 | `readOnlyHint` 推断粗放，纯文档 skill 可能有副作用 | mcp-schema-mapping.md | Backlog |
| 3 | 🟡 | PHASE-7.md 头部状态未更新（仍显示"进行中"） | PHASE-7.md | 立即修复 |
| 4 | 🟡 | 任务清单 T0-T4 状态仍为 ⬜ | PHASE-7.md | 立即修复 |
| 5 | 🟡 | 多行 description 空行终止策略与标准 YAML 有差异 | export-mcp.py | Backlog |
| 6 | 🟢 | `stats` 等顶层字段标注为非 MCP 标准扩展 | mcp-schema-mapping.md | 低优 |

---

## 结论

**条件通过**。

- 🔴 问题 1 是**名实不符**——文档声称动态加载 type-registry.json 但代码未实现。但鉴于当前硬编码映射与 type-registry.json 内容一致，且 7 种类型短期不会变更，这个问题的实际影响为**低**。建议通过修改文档方式收敛（标注"当前版本使用硬编码映射"）。
- 🟡 问题 3、4 是文档更新遗漏，立即可修。
- 其余 🟡 可归入 Backlog。

**评分**：**8.0/10**（扣分项：🔴 文档-代码不一致 -1.0、🟡 文档状态遗漏 -0.5）

**收敛标准**：修复 🔴 问题 1（改文档标注）+ 修复 🟡 问题 3/4（更新状态）后，审查通过。
