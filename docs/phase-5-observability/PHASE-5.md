# Phase 5 — 可观测性

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：构建 `skill-observability` — 执行日志 + 使用统计 + 未使用 skill 发现 + 月度报告
> **启动日期**：2026-03-12
> **完成日期**：2026-03-12
> **状态**：✅ 完成
> **前序 Phase**：Phase 4（编排 MVP）✅ 已完成
> **文档版本**：v2（基于调研 + 审查修订 + 完成）
> **驱动 Skill**：`full-cycle-builder`（Medium 规模，质量门 B ≥ 8.0）

---

## 调研结论（来自 deep-research Full Mode）

| 维度 | 决策 | 理由 |
|------|------|------|
| 日志格式 | JSONL append（一行一条记录） | 零依赖、grep 可查、追加写入原子安全 |
| 存储位置 | `~/.ai-skills/.logs/executions.jsonl` | PROJECT.md 4.2.5 明确规定 |
| 统计方式 | 按需扫描 JSONL | MVP 数据量小，按需扫描够用 |
| 报告格式 | Markdown/TXT | 目标用户是 Agent，文本输出最通用 |
| "未使用"定义 | executions.jsonl 中从未出现 + `--since` 可选 | 灵活，MVP 先做简单版本 |
| 调用方式 | 独立 CLI 脚本，Agent 手动调用后填日志 | 与 memory-update.py 相同模式 |

**引力陷阱已过滤**：~~OpenTelemetry SDK~~ / ~~SQLite~~ / ~~Grafana~~ / ~~实时聚合~~

**反面教材已学习**：SuperAGI Telemetry（PostgreSQL + Web Dashboard → 维护不下去→放弃）

---

## 一、定位

### 为什么可观测性是下一步（PROJECT.md 优先级 P4）

> 不知道哪些 skill 执行频率高/失败率高/从未使用。—— 项目缺口分析

当前 90+ skill 完全是黑盒：哪些被高频调用？哪些写了但从未用过（候选废弃）？哪些失败率高（质量问题）？`skill-observability` 提供最小可行的可见性，让工具链从「盲飞」走向「仪表盘」。

### Phase 1-4 经验回顾

| 前序 Phase 经验 | Phase 5 应用 |
|---------------|-------------|
| Phase 1：`schema_version` 数据格式版本化约束 | JSONL 每行带 `"schema_version": "1.0"` ——**Phase 5 强制继承** |
| Phase 2：零外部依赖（纯 Python stdlib） | `log-execution.py` / `report.py` / `find-unused.py` 全部 stdlib |
| Phase 2：`audit.py` 新 skill 必须通过安全审计 | T6 完成后立即运行 `audit.py` |
| Phase 3：`ensure_initialized()` 自动初始化 | `log-execution.py` 首次运行自动创建 `.logs/` 目录 |
| Phase 3：测试夹具四步验收 | T7 设计类似的端到端验收（写入 → 检索 → 报告 → 清理） |
| Phase 4：YAML 子集状态机解析 | `report.py` 的 JSONL 解析参考同样的逐行状态机策略 |

### 关键设计决策

| 决策 | 选项 | 决定 | 理由 |
|------|------|------|------|
| 日志采集方式 | 其他 skill 主动 import vs 独立 CLI | **独立 CLI 脚本** | 不破坏现有 skill 独立性；与 memory-update.py 同模式 |
| 未使用时间窗 | 固定30天 vs 可选 --since | **默认无限 + --since 可选** | 灵活，MVP 先做简单版本 |
| input 参数记录 | 完整值 vs 只记字段名 | **只记字段名（不记值）** | 防止凭据意外写入日志；符合 Phase 2 安全审计约束 |
| 并发安全 | 文件锁 vs 无锁 | **单 Agent 假设，无需文件锁** | PROJECT.md 约束 5 明确：单 Agent 执行假设 |

---

## 二、前置条件

| 条件 | 状态 |
|------|------|
| Phase 2 `audit.py` 可用于安全审计 | ✅ |
| `quick_validate.py` 在 `~/.ai-skills/.system/skill-creator/scripts/` | ✅ |
| `~/.ai-skills/.logs/` 目录（可不存在，首次运行自动创建） | ⬜ 首次运行时创建 |
| 至少有一个 skill 目录可供 `find-unused.py` 对比 | ✅（`~/.ai-skills/` 有 90+ skill） |

---

## 三、任务清单

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0 | 创建目录结构和 SKILL.md | 前置 | `~/.ai-skills/skill-observability/SKILL.md` | ✅ |
| T1 | 定义日志 JSONL schema | 设计 | `references/log-schema.md` | ✅ |
| T2 | 实现执行日志记录脚本 | 开发 | `scripts/log-execution.py`（147 行） | ✅ |
| T3 | 实现未使用 skill 查找 | 开发 | `scripts/find-unused.py`（134 行） | ✅ |
| T4 | 实现月度报告生成 | 开发 | `scripts/report.py`（186 行） | ✅ |
| T5 | 运行 `audit.py` 安全审计 | 验证 | 1 PASS / 0 WARN / 0 CRIT | ✅ |
| T6 | 端到端验收 | 验收 | 8/8 验收项通过 | ✅ |

### 依赖关系

```
T0（目录 + SKILL.md）
  ↓
T1（log-schema.md）
  ↓
T2（log-execution.py）──→ T3（find-unused.py，依赖日志文件存在）
                          ↓
                       T4（report.py，依赖日志文件存在）
                          ↓
                       T5（安全审计）
                          ↓
                       T6（端到端验收）
```

---

## 四、各任务详细设计

### T0 创建目录结构和 SKILL.md

**目录结构**（与 PROJECT.md 4.2.5 节对齐）：

```
~/.ai-skills/skill-observability/
├── SKILL.md
├── references/
│   └── log-schema.md          # JSONL schema 定义
└── scripts/
    ├── log-execution.py        # 执行日志记录（可被 Agent 手动调用）
    ├── find-unused.py          # 查找从未使用的 skill
    └── report.py               # 月度/全量报告生成
```

**SKILL.md frontmatter 要求**：
- `name: skill-observability`
- `description` 含触发词：`可观测`、`observability`、`执行日志`、`使用统计`、`未使用 skill`
- **不声明 `io:` 字段** — observability 是治理类工具（元能力），不参与 IO 链编排

---

### T1 定义日志 JSONL schema

**`references/log-schema.md`** 定义以下 schema：

```json
{
  "schema_version": "1.0",
  "timestamp": "2026-03-12T00:00:00Z",
  "skill_name": "translate",
  "agent": "gemini",
  "status": "success",
  "duration_seconds": null,
  "input_fields": ["file", "to", "mode"],
  "output_file": "translation.md",
  "notes": "可选备注"
}
```

**字段规范**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schema_version` | string | ✅ | 当前为 `"1.0"`，破坏性变更时递增 |
| `timestamp` | string | ✅ | ISO 8601 UTC，`datetime.utcnow().isoformat() + "Z"` |
| `skill_name` | string | ✅ | skill 目录名（如 `translate`） |
| `agent` | string | ✅ | 执行 agent 标识：`gemini` / `claude` / `codex` / `unknown` |
| `status` | string | ✅ | `success` / `failure` / `partial` |
| `duration_seconds` | number \| null | ⬜ | 执行耗时（秒），无法获取时填 null |
| `input_fields` | array[string] | ⬜ | 输入字段名列表（不记值，防止凭据泄露）|
| `output_file` | string \| null | ⬜ | 输出文件路径（可选）|
| `notes` | string \| null | ⬜ | 备注（可选，如失败原因） |

**安全约束**：`input_fields` 只记字段名，**严禁记录字段值**（防止 API key、密码等敏感数据入日志）。

---

### T2 实现 `log-execution.py`

**CLI 接口**：

```bash
# 记录一次成功执行（input-fields 逗号分隔）
python3 log-execution.py \
  --skill translate \
  --agent gemini \
  --status success \
  --input-fields file,to,mode \
  --output-file translation.md

# 记录失败
python3 log-execution.py \
  --skill skill-lint \
  --agent claude \
  --status failure \
  --notes "skill 目录不存在"

# 记录时附带耗时
python3 log-execution.py \
  --skill memory-search \
  --agent gemini \
  --status success \
  --duration 3.5

# Dry-run（不写文件，只打印 JSON 到 stdout）
python3 log-execution.py --skill translate --agent gemini --status success --dry-run
```

> v2→v3 变更：`--input-fields` 改为逗号分隔（`file,to,mode`），来源：project-audit 🔴#1

**实现要点**：

1. `ensure_log_dir()` — 首次运行自动创建 `~/.ai-skills/.logs/` 目录
2. 追加写入（`open(path, 'a')`）——不读不重写，原子安全
3. 必填字段校验：`skill_name`、`agent`、`status`
4. `status` 枚举校验：只接受 `success` / `failure` / `partial`
5. `--dry-run` 模式：打印 JSON 到 stdout，不写文件
6. 零外部依赖：只用 `json`、`argparse`、`datetime`、`os`、`sys`

---

### T3 实现 `find-unused.py`

**CLI 接口**：

```bash
# 找出从未出现在 executions.jsonl 中的 skill
python3 find-unused.py --skills-dir ~/.ai-skills

# 附加时间窗口（只考虑指定日期后的日志）
python3 find-unused.py --skills-dir ~/.ai-skills --since 2026-01-01

# 指定日志文件路径（默认 ~/.ai-skills/.logs/executions.jsonl）
python3 find-unused.py --skills-dir ~/.ai-skills --log-file /custom/path/executions.jsonl
```

**实现要点**：

1. 遍历 `--skills-dir` 下所有有 `SKILL.md` 的子目录 → 得到「已知 skill 集合」
2. 扫描 JSONL，提取 `skill_name` 字段 → 得到「已执行 skill 集合」（考虑 `--since` 过滤）
3. 差集 = 未使用 skill 列表
4. 输出格式：Markdown 表格（`skill_name` + `SKILL.md 路径`），便于 Agent 阅读
5. 处理边界：日志不存在时输出友好提示（`"尚无执行日志，请先运行 log-execution.py 记录数据"`）

---

### T4 实现 `report.py`

**CLI 接口**：

```bash
# 全量报告（统计全部日志）
python3 report.py

# 指定时间窗口
python3 report.py --since 2026-03-01 --until 2026-03-31

# 指定日志文件
python3 report.py --log-file /custom/path/executions.jsonl

# 输出到文件
python3 report.py --output report-2026-03.md
```

**报告包含内容**：

```
# Skill Observability Report
生成时间：YYYY-MM-DD HH:MM UTC
日志范围：全量 / 2026-03-01 ~ 2026-03-31

## 总览
- 总执行次数：N
- 成功次数：N（成功率 XX%）
- 失败次数：N
- 涉及 skill 数：N
- 涉及 agent 数：N

## Top 10 高频 Skill
| Skill | 执行次数 | 成功率 |

## 失败率 Top 5 Skill
| Skill | 失败次数 | 失败率 |

## 各 Agent 使用分布
| Agent | 执行次数 | 占比 |

## 耗时统计（如有 duration_seconds 数据）
| 指标 | 值 |
  有耗时记录的执行数 / 平均耗时 / 最长耗时 / 最短耗时

## 从未执行的 Skill（需运行 find-unused.py）
> 提示：运行 find-unused.py 查看未使用 skill 列表

> v2→v3 变更：补充耗时统计模块设计，来源：project-audit 🟡#2
```

**实现要点**：

1. 逐行解析 JSONL（容错：跳过格式错误的行，记录错误行数）
2. 使用 `collections.Counter` 统计频率
3. 报告以 Markdown 格式输出
4. 日志不存在时输出友好提示

---

### T5 安全审计

```bash
python3 ~/.ai-skills/skill-security-audit/scripts/audit.py ~/.ai-skills/skill-observability
```

**验收标准**：0 CRITICAL。

---

### T6 端到端验收（脚本化）

**验收脚本** `test-observability.sh`（放在 `phase-5-observability/` 下作为执行记录）：

```bash
#!/bin/bash
set -e
SKILLS_DIR="${HOME}/.ai-skills"
OBS_DIR="${SKILLS_DIR}/skill-observability/scripts"
TEST_LOG="/tmp/test-obs-executions.jsonl"

echo "═══ Step 1: log-execution --dry-run ═══"
python3 "$OBS_DIR/log-execution.py" \
  --skill translate --agent gemini --status success \
  --input-fields file to mode --output-file translation.md --dry-run

echo "═══ Step 2: log-execution 写入测试日志 ═══"
python3 "$OBS_DIR/log-execution.py" \
  --skill translate --agent gemini --status success \
  --log-file "$TEST_LOG"

python3 "$OBS_DIR/log-execution.py" \
  --skill skill-lint --agent claude --status failure \
  --notes "test failure" --log-file "$TEST_LOG"

python3 "$OBS_DIR/log-execution.py" \
  --skill memory-search --agent gemini --status success \
  --duration 2.5 --log-file "$TEST_LOG"

echo "═══ Step 3: report.py 读取测试日志 ═══"
python3 "$OBS_DIR/report.py" --log-file "$TEST_LOG"

echo "═══ Step 4: find-unused.py（对比 skills 目录）═══"
python3 "$OBS_DIR/find-unused.py" \
  --skills-dir "$SKILLS_DIR" --log-file "$TEST_LOG"

echo "═══ Step 5: 错误处理 — 无效 status 枚举 ═══"
python3 "$OBS_DIR/log-execution.py" \
  --skill translate --agent gemini --status invalid_status 2>&1 || true

echo "═══ Step 6: 错误处理 — 日志不存在时的 report ═══"
python3 "$OBS_DIR/report.py" --log-file "/tmp/nonexistent.jsonl" || true

echo "═══ Step 7: quick_validate.py ═══"
python3 "$SKILLS_DIR/.system/skill-creator/scripts/quick_validate.py" \
  "$SKILLS_DIR/skill-observability"

echo "═══ Step 8: 清理测试日志 ═══"
rm -f "$TEST_LOG"

echo "═══ 全部验收通过 ═══"
```

**验收清单**：

| 验证项 | 判定标准 |
|--------|--------|
| `--dry-run` 正确输出 JSON 到 stdout，不写文件 | stdout 有 JSON 输出，不存在日志文件 |
| 连续写入 3 条记录 | JSONL 文件有 3 行，每行是合法 JSON |
| `report.py` 总览数据正确 | 总执行 3 次，成功 2、失败 1 |
| `find-unused.py` 输出 Markdown 表格 | 至少包含从未执行过的 skill |
| 无效 `--status` 报错友好 | 输出明确错误信息，exit code 非零 |
| 日志不存在时 `report.py` 友好提示 | 不 crash，输出友好提示 |
| `quick_validate.py` PASS | skill 格式校验通过 |
| `audit.py` 0 CRITICAL | 安全审计通过 |

---

## 五、验收标准

| # | 标准 | 验证方式 |
|---|------|---------| 
| V1 | `log-execution.py` 能追加写入合法 JSONL | T6 Step 2 |
| V2 | `report.py` 统计数据正确（总览 + Top 排行） | T6 Step 3 |
| V3 | `find-unused.py` 能发现从未执行的 skill | T6 Step 4 |
| V4 | 错误处理友好（无效枚举、文件不存在） | T6 Step 5-6 |
| V5 | skill 通过 `quick_validate.py` + `audit.py` | T5 + T6 Step 7 |
| V6 | `schema_version` 字段在每条记录中存在 | T6 Step 2 输出验证 |

---

## 六、不在 Phase 5 范围

| 什么 | 为什么不做 |
|------|----------|
| SQLite / 数据库存储 | JSONL + grep 覆盖 MVP 场景，不引入依赖 |
| 实时监控 / Web Dashboard | 用户是 Agent，文本报告更通用；反面教材 SuperAGI |
| 自动触发（hook 进 skill） | MVP 手动调用，等有真实需求再做集成 |
| 日志轮转 / 压缩归档 | MVP 不做，数据量小不需要 |
| OpenTelemetry 集成 | 引力陷阱，JSONL 已覆盖 90% 场景 |

---

## 七、`skill-observability` 目录结构

```
skill-observability/
├── SKILL.md                    # T0 创建
├── references/
│   └── log-schema.md           # T1：JSONL schema 定义
└── scripts/
    ├── log-execution.py        # T2：执行日志记录
    ├── find-unused.py          # T3：未使用 skill 查找
    └── report.py               # T4：月度/全量报告
```

---

## 八、全周期状态

| Phase | 状态 | 评分 | 备注 |
|-------|------|------|------|
| 0 上下文+骨架 | ✅ | — | Medium 规模，CLI 工具 |
| 1.1 调研 v1 | ✅ | — | deep-research Full Mode：5 方案对比 |
| 1.2 审查 | ✅ | 8.5 | 补充了采集机制 + input_fields 安全约束 |
| 1.3 修订 v2 | ✅ | — | 已吸收入规划文档 |
| 1.4 质量门 A | ✅ | 8.5 | ≥ 8.0 通过（Medium） |
| 2.1 规划 v1 | ✅ | — | 本文档 |
| 2.2 审查 | ✅ | 8.5 | 🔴x0 🟡x3（均可在编码中吸收） |
| 2.3 修订 v2 | ✅ | — | input-fields 改为逗号分隔、排除系统目录、JSONL 容错 |
| 2.4 质量门 B | ✅ | 8.5 | ≥ 8.0 通过（Medium） |
| 3.1 编码 | ✅ | — | 3 个脚本：467 行总计 |
| 3.2 代码审查 | ✅ | — | argparse nargs bug 修复 |
| 3.3 踩坑检查 | ✅ | — | CRLF 换行符踩坑（WSL 环境） |
| 3.4 质量门 C | ✅ | — | 8/8 验收项通过 |
| 4 部署 | ✅ | — | 已安装到 ~/.ai-skills/skill-observability/ |
| 5 经验沉淀 | ✅ | — | 踩坑记录入库 |

---

## 九、踩坑记录

| # | 踩坑项 | 根因 | 修复 | 预防 |
|---|--------|------|------|------|
| P5-1 | `argparse nargs="*"` 会吞掉后续 flag | `--input-fields a b --dry-run` 中 `--dry-run` 被当作 input-fields 的值 | 改为逗号分隔单字符串 `--input-fields a,b,c` | 避免 `nargs="*"` 与后续 flag 共存 |
| P5-2 | Windows→WSL 路径写入的文件带 CRLF | 通过 `\\wsl.localhost\` UNC 路径写的文件自动是 CRLF | `sed -i 's/\r$//'` 转换 | WSL 项目中写文件后立即 `sed -i` 或配置 `.gitattributes` |
| P5-3 | **跳过子 Skill 调用（流程违规）** | Phase 2.2 未正式调用 `project-audit`（自己简单写了审查意见）、Phase 2.3 未调用 `design-iteration`（说"已吸收"就跳过）、Phase 3.2 未调用 `code-review`。根因：Agent 默认倾向于"自己直接做"而非"先读 Skill 再按流程做"，把 Skill 当"可选参考"而非"必须执行的 checklist" | 已将规则写入 `~/.gemini/GEMINI.md` 全局 user rules：遇到"调用 XXX skill"必须先 view_file 读 SKILL.md 再按流程执行 | 全局规则强制执行 + full-cycle-builder 反模式列表更新 |
---

## 十、审查对照表

> 来源：project-planner Phase 级执行文档模板要求

### v2→v3（project-audit 补跑审查）

| 审查意见 | 类型 | v3 修订 | 状态 |
|---------|------|--------|------|
| CLI 用法示例 `--input-fields` 空格分隔与实现不一致 | 🔴 | 更新为逗号分隔 `file,to,mode` + 变更标注 | ✅ 已修 |
| 定位标题 "P4" 表述有歧义 | 🟡 | 改为「为什么可观测性是下一步（PROJECT.md 优先级 P4）」 | ✅ 已修 |
| 报告设计缺少耗时统计模块 | 🟡 | 补充耗时统计设计 + 变更标注 | ✅ 已修 |
| find-unused.py --exclude 参数 | 🟢 | Backlog | ⏭️ 延后 |

### code-review 审查

| 审查意见 | 类型 | 处置 | 状态 |
|---------|------|------|------|
| report.py generate_report 函数偏长（~90 行） | 🟡 | Backlog，不影响功能 | ⏭️ 延后 |

---

## 变更日志

| 日期 | 版本 | 变更 | 审查结果 |
|------|------|------|---------|
| 2026-03-12 | v1 | Phase 5 项目文档创建，基于 deep-research Full Mode 调研 + full-cycle-builder 工作流 | — |
| 2026-03-12 | v2 | Phase 5 完成。产出 skill-observability（SKILL.md + log-schema.md + 3 脚本 467 行）。审计 1 PASS / 0 WARN / 0 CRIT。8/8 验收通过 | 未正式审查（流程违规 P5-3）|
| 2026-03-12 | v2.1 | 新增踩坑 P5-3：跳过子 Skill 调用。已写入全局 user rules | — |
| 2026-03-12 | v3 | 补跑 project-audit（🔴x1 🟡x2）+ design-iteration 修订 + code-review（LGTM）。补齐 project-planner 模板要求的审查对照表 + 变更日志审查结果列 | 🔴x0 🟡x0（收敛）|

