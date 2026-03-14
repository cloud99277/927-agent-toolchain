# Phase 4 — 编排 MVP

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：构建 `agent-orchestrator` — 基于 IO 契约的线性链式 Skill 编排 MVP
> **启动日期**：2026-03-09
> **状态**：✅ 完成（2026-03-09）
> **前序 Phase**：Phase 3（记忆管理）✅ 已完成
> **文档版本**：v2（基于架构审查修订）
> **驱动 Skill**：`full-cycle-builder`（Medium 规模，质量门 B ≥ 8.0）

> **Phase 1 调研结论**：YAML 子集解析器（方案 B）+ verify-chain.py 核心函数复用 + MVP 边界为纯线性链 + 变量替换。调研 8.5/10 通过质量门 A。

---

## 一、定位

### 为什么编排是 P3

> 复杂任务需人工串联多个 skill。—— 项目缺口分析

当前 90+ skill 只能单独调用。用户要完成「获取推文 → 翻译 → 发布」三步操作，需要手动逐个调用。`agent-orchestrator` 让这种串联自动化：定义一次 YAML 链，反复执行。

### Phase 1-3 经验回顾

| 前序 Phase 经验 | Phase 4 应用 |
|---------------|-------------|
| Phase 1：IO 契约定义了 skill 的标准 IO 格式 | orchestrator 读取 IO 声明做链匹配——这是 Phase 4 的**核心基础** |
| Phase 1：`verify-chain.py` 实现了 frontmatter 解析 + 类型匹配 | **直接作为种子代码**复用到 `run-chain.py` |
| Phase 1：`type-registry.json` 定义了 7 种标准类型 + 兼容规则 | orchestrator 动态加载类型注册表（同时解决 Phase 2 Backlog B6） |
| Phase 2：新 skill 必须通过 `audit.py` 安全审计 | T6 完成后立即运行 `audit.py` |
| Phase 2：零外部依赖约束 | Python stdlib 没有 YAML 解析器 → 自写简单子集解析器 |
| Phase 3：`ensure_initialized()` 首次运行自动初始化 | run-chain.py 不需要预配置，首次运行即可用 |
| Phase 3：测试夹具四步验收 | T7 设计类似的端到端验收（定义链 → 验证 → 执行） |

### 关键设计决策（来自 Phase 1 调研）

| 决策 | 选项 | 决定 | 理由 |
|------|------|------|------|
| YAML 解析 | A.JSON / B.YAML子集解析器 / C.Agent原生 | **B 为主 + C 补充** | verify-chain.py 已证明简单解析器可行；Agent 可直接阅读 YAML 链 |
| 执行语义 | 真正调用 agent / 生成执行计划 | **验证 + 执行计划** | 真正调用 agent 需要 agent-specific CLI 适配，违反跨 Agent 约束。MVP 定位为「验证链合法性 + 输出分步执行指引」 |
| verify-chain.py 复用 | 全量复用 / 部分提取 | **提取核心函数** | parse_frontmatter + check_type_match 直接复用，CHAINS 硬编码替换为 YAML 动态加载 |
| 类型匹配规则来源 | 硬编码 / 动态加载 | **从 type-registry.json 动态加载** | 同时解决 Phase 2 Backlog B6 |
| MVP 边界 | 含条件/循环 vs 纯线性 | **纯线性 + 变量替换** | 条件跳过和质量门循环放入 Backlog |

---

## 二、前置条件

| 条件 | 状态 |
|------|------|
| Phase 1 IO 契约完成（type-registry.json + IO-CONVENTION.md） | ✅ |
| Phase 1 verify-chain.py 可用作种子代码 | ✅ |
| 至少 5 个 skill 有 IO 声明 | ✅（x-to-md, translate, post-to-wechat, url-to-md, skill-lint） |
| Phase 2 audit.py 可用于安全审计 | ✅ |
| `full-cycle-builder` 作为真实编排链参考 | ✅ |

---

## 三、任务清单

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0 | 创建 `agent-orchestrator` 目录结构和 SKILL.md | 前置 | `skills/agent-orchestrator/SKILL.md` | ✅ |
| T1 | 定义编排链 YAML schema | 设计 | `references/chain-schema.md` | ✅ |
| T2 | 实现 YAML 子集解析器 | 开发 | `scripts/run-chain.py` 的 parse_chain_yaml() | ✅ |
| T3 | 从 verify-chain.py 提取并升级核心函数 | 开发 | `scripts/run-chain.py` 的 IO 匹配模块 | ✅ |
| T4 | 实现链式执行器（验证 + 执行计划输出） | 开发 | `scripts/run-chain.py` 完整版 | ✅ |
| T5 | 创建 3 条预定义编排链模板 | 实施 | `chains/*.yaml` | ✅ |
| T6 | 运行 `audit.py` 安全审计 | 验证 | 0 CRIT / 1 WARN | ✅ |
| T7 | 端到端验收 | 验收 | 7/7 验收项通过 | ✅ |

### 依赖关系

```
T0（目录 + SKILL.md）
  ↓
T1（chain-schema.md）
  ↓
T2（YAML 解析器）──→ T3（IO 匹配模块，复用 verify-chain.py）
                        ↓
                     T4（完整 run-chain.py）
                        ↓
                     T5（3 条预定义链）
                        ↓
                     T6（安全审计）
                        ↓
                     T7（端到端验收）
```

---

## 四、各任务详细设计

### T0 创建目录结构和 SKILL.md

**目录结构**（与 PROJECT.md 4.2.4 节对齐）：

```
~/.ai-skills/agent-orchestrator/
├── SKILL.md
├── chains/                         # 预定义编排链
│   ├── translate-tweet-publish.yaml
│   ├── url-translate-publish.yaml
│   └── fetch-analyze-report.yaml
├── references/
│   └── chain-schema.md             # 编排链 YAML schema
└── scripts/
    └── run-chain.py                # 链式执行器
```

**SKILL.md frontmatter 要求**：
- `name: agent-orchestrator`
- `description` 含触发词：`编排`、`orchestrate`、`chain`、`pipeline`、`串联`
- **不声明 `io:` 字段** — orchestrator 是编排者（元能力），不参与被编排

> **v1→v2 变更**：移除 io 声明。orchestrator 调用其他 skill，不会被其他 skill 的 output 喂入，不适用 IO 契约。来源：审查 🔴#1

---

### T1 定义编排链 YAML schema

**基于 PROJECT.md 4.2.4 草案 + Phase 1 调研决策，定义正式 schema**：

```yaml
# chain-schema 示例
schema_version: "1.0"
name: translate-tweet-publish
description: 获取推文、翻译、发布到微信
variables:
  - name: URL
    description: 推文 URL
    required: true
steps:
  - skill: baoyu-danger-x-to-markdown
    input:
      url: "$URL"
    output: content.md
  - skill: translate
    input:
      file: content.md
      to: zh-CN
      mode: normal
    output: translation.md
  - skill: baoyu-post-to-wechat
    input:
      file: translation.md
```

**YAML 子集解析器支持范围**（回应调研盲点 1）：

| 支持 | 不支持 |
|------|--------|
| flat key-value（`name: value`） | 多行字符串（`\|`、`>`） |
| 列表（`- item`） | 锚点和引用（`&`、`*`） |
| 列表下的 key-value（`- skill: name`） | YAML 标签（`!!`） |
| inline dict（`{k: v, k2: v2}`） | 多文档（`---` 分隔符） |
| 字符串值（带/不带引号） | 复杂嵌套（>2 层） |
| `$VAR` 变量引用 | 条件表达式 |
| 注释（`#`） | 合并键（`<<:`） |

---

### T2 实现 YAML 子集解析器

**输入**：`.yaml` 文件路径  
**输出**：Python dict，结构与上述 schema 对应

**实现约束**：
- 纯 Python stdlib（re + 字符串操作）
- 基于 verify-chain.py 的 `parse_frontmatter()` 经验扩展
- 行级解析，逐行状态机
- 支持 `#` 注释（取该行 `#` 后内容为注释，忽略引号内的 `#`）

**错误处理策略**（v1→v2 新增，来源：审查 🔴#2）：

| 遇到的情况 | 行为 |
|-----------|------|
| 不支持的 YAML 语法（`|`、`>`、`&`、`*`、`<<:`） | 输出明确错误：`Line X: 不支持的 YAML 语法 'Y'。agent-orchestrator 仅支持 YAML 子集，详见 chain-schema.md` |
| 缺少必填字段（name、steps） | 输出：`Chain file missing required field: 'name'` |
| steps 为空 | 输出：`Chain has no steps defined` |
| 文件不存在 | 输出：`Chain file not found: path/to/file.yaml` |

---

### T3 从 verify-chain.py 提取并升级核心函数

**提取**：
- `parse_frontmatter()` → 原样复用
- `check_type_match()` → 原样复用
- `COMPATIBILITY_RULES` → **替换为从 type-registry.json 动态加载**

**动态加载逻辑**：

```python
def load_compatibility_rules(type_registry_path):
    """从 type-registry.json 的 compatibility_rules 加载类型兼容规则"""
    with open(type_registry_path, 'r') as f:
        registry = json.load(f)
    rules = {}
    for rule in registry.get('compatibility_rules', []):
        rules[rule['from']] = rule['to']
    return rules
```

**type-registry.json 查找路径**（优先级，v1→v2 修订，来源：审查 🟡#1）：
1. `--type-registry` 参数指定
2. `~/.ai-skills/.system/io-contracts/type-registry.json`（标准位置）
3. 内置回退值（verify-chain.py 的硬编码规则）

> **v1→v2 变更**：去掉开发位置路径。部署后该路径不存在，保留会误导。

---

### T4 实现链式执行器

**run-chain.py 接口设计**（回应调研盲点 2）：

```bash
# 验证链（只检查 IO 类型匹配，不执行）
python3 run-chain.py validate chains/translate-tweet-publish.yaml

# 查看执行计划（输出分步指引）
python3 run-chain.py plan chains/translate-tweet-publish.yaml --var URL=https://x.com/...

# 显示已注册的链
python3 run-chain.py list

# 指定 skills 目录（v1→v2 新增，来源：审查 🟡#3）
python3 run-chain.py validate chains/xxx.yaml --skills-dir ~/.ai-skills

# 版本
python3 run-chain.py --version
```

**执行语义**：`run-chain.py` 定位为**验证器 + 计划生成器**，不直接调用 agent。输出格式为人类/Agent 可读的分步执行指引：

```
═══ 编排链: translate-tweet-publish ═══
描述: 获取推文、翻译、发布到微信

Step 1/3: baoyu-danger-x-to-markdown
  输入: url = https://x.com/...
  输出: content.md
  IO 匹配: ✅ (url → url, 精确匹配)

Step 2/3: translate
  输入: file = content.md, to = zh-CN, mode = normal
  输出: translation.md
  IO 匹配: ✅ (markdown_file → markdown_file, 精确匹配)

Step 3/3: baoyu-post-to-wechat
  输入: file = translation.md
  IO 匹配: ✅ (markdown_file → markdown_file, 精确匹配)

═══ 验证结果: 3/3 步 IO 匹配通过 ═══
```

**约束**：零外部依赖（纯 Python stdlib）。

---

### T5 创建 3 条预定义编排链

| # | 链名 | 步骤 | 验证目标 | 来源 |
|---|------|------|---------|------|
| 1 | `translate-tweet-publish` | x-to-md → translate → post-to-wechat | 精确匹配（url→url, md→md, md→md） | PROJECT.md 示例 |
| 2 | `url-translate-publish` | url-to-md → translate → post-to-wechat | 精确匹配，验证不同起点 | Phase 1 verify-chain.py |
| 3 | `lint-and-search` | skill-lint（directory → json_data）→ memory-search（text → text） | **兼容匹配**验证（json_data 与 text 的兼容性） | 新设计 |

> **v1→v2 变更**：替换单步链为多步链，新增一条覆盖兼容匹配的链（审查 🟡#2）。链 3 需要在 type-registry.json 中确认 json_data→text 的兼容规则（如无则新增）。

---

### T6 安全审计

```bash
python3 ~/.ai-skills/skill-security-audit/scripts/audit.py ~/.ai-skills/agent-orchestrator
```

**验收标准**：0 CRITICAL。

---

### T7 端到端验收（脚本化，v1→v2 新增，来源：审查 🟢#1）

**验收脚本** `test-orchestrator.sh`（放在 `phase-4-orchestrator/` 下作为执行记录）：

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${HOME}/.ai-skills"
RUN_CHAIN="${SKILLS_DIR}/agent-orchestrator/scripts/run-chain.py"
CHAINS_DIR="${SKILLS_DIR}/agent-orchestrator/chains"

echo "═══ Step 1: validate — translate-tweet-publish ═══"
python3 "$RUN_CHAIN" validate "$CHAINS_DIR/translate-tweet-publish.yaml" --skills-dir "$SKILLS_DIR"

echo "═══ Step 2: validate — url-translate-publish ═══"
python3 "$RUN_CHAIN" validate "$CHAINS_DIR/url-translate-publish.yaml" --skills-dir "$SKILLS_DIR"

echo "═══ Step 3: validate — lint-and-search (兼容匹配) ═══"
python3 "$RUN_CHAIN" validate "$CHAINS_DIR/lint-and-search.yaml" --skills-dir "$SKILLS_DIR"

echo "═══ Step 4: plan — 变量替换 ═══"
python3 "$RUN_CHAIN" plan "$CHAINS_DIR/translate-tweet-publish.yaml" --var URL=https://x.com/test/123 --skills-dir "$SKILLS_DIR"

echo "═══ Step 5: list ═══"
python3 "$RUN_CHAIN" list --chains-dir "$CHAINS_DIR"

echo "═══ Step 6: 错误处理 — 不存在的文件 ═══"
python3 "$RUN_CHAIN" validate nonexistent.yaml 2>&1 || true

echo "═══ Step 7: quick_validate.py ═══"
python3 "$SKILLS_DIR/quick_validate.py" "$SKILLS_DIR/agent-orchestrator"

echo "═══ 全部验收通过 ═══"
```

**验收清单**：

| 验证项 | 判定标准 |
|--------|--------|
| validate 对 3 条链全部通过 | IO 匹配全部 ✅（含精确+兼容匹配） |
| plan 模式变量替换正确 | $URL 被替换为实际值 |
| list 模式显示 3 条链 | 名称 + 描述正确 |
| type-registry.json 动态加载 | 不依赖硬编码兼容规则 |
| 错误处理友好 | 不存在的文件输出明确错误 |
| audit.py 0 CRITICAL | 安全审计通过 |
| quick_validate.py PASS | skill 格式校验通过 |

---

## 五、验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| V1 | run-chain.py 能完成 validate + plan 两种模式 | T7 Step 1-3 |
| V2 | YAML 编排链格式有文档化的 schema | chain-schema.md 可读性审查 |
| V3 | 至少 2 条多步链 IO 匹配通过 | T7 Step 1-2 |
| V4 | type-registry.json 兼容规则动态加载 | 修改 registry 后行为随之变化 |
| V5 | skill 通过 quick_validate.py + audit.py | T6 + T7 Step 6 |

---

## 六、不在 Phase 4 范围

| 什么 | 为什么不做 |
|------|----------|
| 条件跳过（if/when） | MVP 只做线性链，条件需要变量系统 + 条件语法 |
| 质量门/循环 | 需要状态机 + 判断逻辑，超出 MVP |
| 真正调用 Agent 执行 skill | 需要 agent-specific CLI 适配，违反跨 Agent 约束 |
| DAG / 并行编排 | 先做线性链，70% 场景够用 |
| 全仓 90+ skill 添加 IO 声明 | 渐进式采纳，不强制改造 |
| PyYAML 依赖引入 | 零依赖约束，自写简单解析器 |

---

## 七、`agent-orchestrator` 目录结构

```
agent-orchestrator/
├── SKILL.md                        # T0 创建
├── chains/                         # T5：预定义编排链
│   ├── translate-tweet-publish.yaml
│   ├── url-translate-publish.yaml
│   └── lint-and-search.yaml
├── references/
│   └── chain-schema.md             # T1：YAML schema 定义
└── scripts/
    └── run-chain.py                # T2-T4：链式执行器
```

---

## 变更日志

| 日期 | 版本 | 变更 | 审查结果 |
|------|------|------|---------|
| 2026-03-09 | v1 | Phase 4 项目文档创建 | 🔴x2 🟡x3 🟢x1（见审查结论） |
| 2026-03-09 | v2 | 修订：移除 orchestrator io 声明（元能力不参与被编排）、YAML 解析器错误处理策略、去掉开发位置路径、替换单步链为多步兼容匹配链、增加 --skills-dir 参数、验收脚本化 | 待再审查 |
| 2026-03-09 | v3 | 完成审查修订：部署 type-registry.json 到标准位置、修复链 3 内容覆盖兼容匹配、修复布尔值解析、创建验收脚本、SKILL.md 格式修正、PROJECT.md 描述统一 | 🔴x0 🟡x0（收敛） |

---

## v2 对 v1 审查意见的逐条回应

| 审查意见 | 类型 | v2 修订 | 状态 |
|---------|------|--------|------|
| orchestrator 的 io 声明引用了不存在的类型 | 🔴 | 移除 io 声明，orchestrator 是元能力不参与被编排 | ✅ 已修 |
| YAML 解析器遇到不支持语法时行为未定义 | 🔴 | 新增错误处理策略表（4 种情况的明确行为） | ✅ 已修 |
| type-registry 查找路径含开发位置 | 🟡 | 去掉 ~/projects/agent-os/ 路径，只保留标准位置+参数+回退 | ✅ 已修 |
| 链 3 只有 1 步不是真正的链 | 🟡 | 替换为 lint-and-search 多步链，覆盖兼容匹配 | ✅ 已修 |
| 缺少 --skills-dir 参数 | 🟡 | T4 接口设计新增 --skills-dir 参数 | ✅ 已修 |
| 验收可以脚本化 | 🟢 | T7 改为 test-orchestrator.sh 脚本化验收 | ✅ 已修 |

---

## v3 对完成审查意见的逐条回应

| 审查意见 | 类型 | v3 修订 | 状态 |
|---------|------|--------|------|
| lint-and-search.yaml 文档与实现严重不符 | 🔴 | 替换为 lint-and-publish 链（skill-lint → baoyu-post-to-wechat），覆盖 json_data→text 兼容匹配 | ✅ 已修 |
| type-registry.json 未部署到标准位置 | 🔴 | 部署到 ~/.ai-skills/.system/io-contracts/，新增 json_data→text 兼容规则 | ✅ 已修 |
| quick_validate.py 不存在 | 🟡 | 确认文件在 .system/skill-creator/scripts/ 下，修正验收脚本路径 | ✅ 已修 |
| 验收脚本 test-orchestrator.sh 未创建 | 🟡 | 创建 8 步验收脚本并成功运行 | ✅ 已修 |
| _clean_value() 布尔值 false 被当作 truthy | 🟡 | 增加 true/false/null 识别逻辑 | ✅ 已修 |
| SKILL.md 使用了 > 折叠标量 | 🟢 | 改为单行 description | ✅ 已修 |
| run-chain.py 行数 630 不准确 | 🟢 | 更新 PROJECT.md 为 639 行 | ✅ 已修 |
| 审计结果描述不统一 | 🟢 | 统一为 0 PASS / 1 WARN / 0 CRIT | ✅ 已修 |
