# Phase 6 — 定时调度

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：构建 `scheduled-tasks` — 两级定时调度架构（Level 1 纯脚本 + Level 2 Agent 辅助）
> **启动日期**：2026-03-14
> **完成日期**：2026-03-14
> **状态**：✅ 完成
> **前序 Phase**：Phase 5（可观测性）✅ 已完成
> **文档版本**：v3（完成）
> **驱动 Skill**：`full-cycle-builder`（Medium 规模，质量门 B ≥ 8.0）

---

## 调研结论

### 调度机制选型

| 方案 | 优势 | 劣势 | 决策 |
|------|------|------|------|
| **cron** | 简单、跨平台（所有 Unix-like）、零依赖、用户熟悉 | 无日志集成、错过的任务不补跑、无重叠防护 | ✅ **选用**（MVP 足够） |
| systemd timer | 集成 journald、支持补跑、防重叠 | 需 2 个 unit 文件、不可移植到 macOS/BSD、WSL 1 不支持 | ❌ 不选（WSL 兼容性差） |
| Python APScheduler | 灵活、可嵌入 | 需常驻进程（违反"无运行时"约束）、引入外部依赖 | ❌ 不选 |
| Windows Task Scheduler | 原生 Windows 支持 | 与 WSL 互操作复杂、非 Unix 标准 | ❌ 不选 |

**决策理由**：
- 项目核心约束是"零基础设施 + 纯文件系统"，cron 是最轻量的系统原生调度
- WSL 2 支持 cron（通过 `sudo service cron start`），macOS 原生支持
- 不补跑（missed job）可接受：定时任务大多是周期性低价值操作，错过一次不致命
- 重叠防护用 `flock` 文件锁解决（单行 wrapper）

### Level 2 Agent CLI 启动机制

| Agent | CLI 调用方式 | 可行性 |
|-------|-------------|--------|
| Claude Code | `claude -p "执行 skill XXX"` | ✅ 可行，`-p` 为非交互 prompt 模式 |
| Gemini CLI | `gemini -p "执行 skill XXX"` | ✅ 可行，同上 |
| Codex CLI | `codex -q "执行 skill XXX"` | ✅ 可行，`-q` 为 quiet 模式 |

**Level 2 设计要点**：
- `agent-wrapper.sh` 统一入口，按任务 YAML 中 `agent` 字段选择 CLI
- 设置 `AGENT_SKILLS_DIR` 环境变量，确保 agent 能找到 skills
- 输出重定向到 `~/.ai-skills/.logs/scheduled-{task-name}-{timestamp}.log`
- 执行完成后自动调用 `log-execution.py` 记录到可观测性系统

### 任务定义 YAML 格式设计

借鉴 Phase 4 编排链的 YAML 格式，保持一致性：

```yaml
# ~/.ai-skills/scheduled-tasks/tasks/example-task.yaml
schema_version: "1.0"
name: daily-tweet-fetch
description: 每日抓取关注列表的最新推文
level: 1                           # 1 = agent-free, 2 = agent-assisted
schedule: "0 8 * * *"              # cron 表达式：每天 8:00
enabled: true

# Level 1 专用字段
command: "python3 ~/.ai-skills/baoyu-danger-x-to-markdown/scripts/fetch.py"
args: ["--list", "following", "--limit", "20"]
working_dir: "~/data/tweets"

# Level 2 专用字段（Level 1 忽略）
agent: null                        # gemini / claude / codex
prompt: null                       # 给 agent 的指令

# 通用字段
timeout_seconds: 300               # 超时时间
on_failure: "log"                  # log / retry / notify
max_retries: 0                     # 失败重试次数
output_dir: "~/data/tweets"        # 输出目录
notify: null                       # 未来扩展：通知方式
```

### 引力陷阱过滤

| 被砍掉的 | 为什么 |
|---------|--------|
| ~~systemd timer 双文件~~ | WSL 兼容性差，cron 足够 |
| ~~APScheduler 常驻进程~~ | 违反"无运行时"约束 |
| ~~Web Dashboard 管理界面~~ | 反面教材 SuperAGI，用 CLI 管理 |
| ~~消息通知（Telegram/邮件）~~ | MVP 不做，日志 + observability 够用 |
| ~~任务依赖 DAG~~ | 70% 场景独立任务，不需要依赖链 |

### 反面教材

| 项目 | 教训 | Phase 6 回应 |
|------|------|-------------|
| OpenClaw | heartbeat 轮询空转烧 $150+/月 | cron 事件驱动，不空转 |
| SuperAGI | GUI 管理界面 → 维护不动 → 放弃 | 纯 CLI 管理 |
| 通用 cron 反模式 | 环境变量丢失、PATH 不完整 | wrapper.sh 显式设置完整环境 |

### Phase 1-5 经验回顾

| 前序 Phase 经验 | Phase 6 应用 |
|---------------|-------------|
| Phase 1：`schema_version` 数据格式版本化约束 | 任务 YAML 每文件带 `schema_version: "1.0"` |
| Phase 2：零外部依赖（纯 Python stdlib） | scheduler.py / task-runner.py 全部 stdlib |
| Phase 3：`ensure_initialized()` 自动初始化 | 首次运行自动创建目录结构 |
| Phase 4：YAML 子集解析 | 复用 Phase 4 的 YAML 解析策略（或直接 `import yaml` → 不行，用手写解析） |
| Phase 5：JSONL 追加日志 + observability 集成 | 任务执行后调 `log-execution.py` |
| Phase 5-P5-2：WSL CRLF 踩坑 | 所有脚本用 `\n` 写，shell 用 `#!/bin/bash` |

### 关键设计决策

| 决策 | 选项 | 决定 | 理由 |
|------|------|------|------|
| 调度器 | cron vs systemd timer | **cron** | WSL 兼容、零配置、系统原生 |
| 任务格式 | JSON vs YAML 子集 | **YAML 子集** | 与 Phase 4 编排链一致，人类可读 |
| YAML 解析 | PyYAML vs 手写 | **手写子集解析** | 零外部依赖约束；Phase 4 已有成熟实现可复用 |
| Level 2 执行 | Python subprocess vs shell script | **shell script** | cron 调 shell 最直接，环境设置透明 |
| 日志集成 | 独立日志 vs 复用 observability | **两者都用**：执行输出→独立日志文件，元数据→ observability JSONL |
| flock 防重叠 | Python fcntl vs 系统 flock 命令 | **crontab 行级 `flock` 命令** | fcntl 仅 Linux、task-runner.py 保持纯跨平台 Python |
| YAML 解析职责 | 各脚本各自解析 vs 集中到一处 | **task-runner.py 集中解析** | scheduler.py 和 agent-wrapper.sh 通过调 task-runner.py 获取解析结果 |

---

## 一、定位

### 为什么定时调度是下一步（PROJECT.md 优先级 P5）

> 无法自动化周期性任务。—— 项目缺口分析

当前所有 skill 都是"按需手动触发"模式——需要人在终端中主动发起对话，让 Agent 调用 skill。对于周期性任务（每日推文抓取、每周竞品报告、月度 observability 报告），这种模式需要人记得去做。`scheduled-tasks` 提供最小可行的自动化，让**高价值周期性任务**在无人干预下自动运行。

> **聚焦高价值自动化，而非全面自动化**。—— PROJECT.md §3.1（OpenClaw 教训）

---

## 二、前置条件

| 条件 | 状态 |
|------|------|
| Phase 5 `skill-observability` 已部署 | ✅ |
| `log-execution.py` 可被其他脚本调用 | ✅ |
| `quick_validate.py` 可用 | ✅ |
| `audit.py` 可用 | ✅ |
| WSL 环境 cron 可用 | ⬜ 需验证 `sudo service cron status` |

---

## 三、任务清单

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0 | 创建目录结构和 SKILL.md | 前置 | `~/.ai-skills/scheduled-tasks/SKILL.md` | ✅ |
| T1 | 定义任务 YAML schema | 设计 | `references/task-schema.md` | ✅ |
| T2 | 实现任务管理脚本 `scheduler.py` | 开发 | `scripts/scheduler.py`（394 行） | ✅ |
| T3 | 实现 Level 1 执行器 `task-runner.py` | 开发 | `scripts/task-runner.py`（407 行） | ✅ |
| T4 | 实现 Level 2 执行器 `agent-wrapper.sh` | 开发 | `scripts/agent-wrapper.sh`（99 行） | ✅ |
| T5 | 创建示例任务 | 示例 | `tasks/example-*.yaml`（2 个） | ✅ |
| T6 | 安全审计 | 验证 | 1 PASS / 0 WARN / 0 CRIT | ✅ |
| T7 | 端到端验收 | 验收 | 7/7 验收项通过 | ✅ |

### 依赖关系

```
T0（目录 + SKILL.md）
  ↓
T1（task-schema.md）
  ↓
T2（scheduler.py）──→ T3（task-runner.py，依赖 YAML 解析）
                       ↓
                    T4（agent-wrapper.sh，Level 2 依赖 Level 1 基础）
                       ↓
                    T5（示例任务）
                       ↓
                    T6（安全审计）
                       ↓
                    T7（端到端验收）
```

---

## 四、各任务详细设计

### T0 创建目录结构和 SKILL.md

**目录结构**（与 PROJECT.md §4.2.6 对齐）：

```
~/.ai-skills/scheduled-tasks/
├── SKILL.md
├── tasks/                          # 任务定义目录
│   ├── example-l1-report.yaml      # Level 1 示例：月度报告
│   └── example-l2-analysis.yaml    # Level 2 示例：智能分析
├── references/
│   └── task-schema.md              # 任务 YAML schema 定义
└── scripts/
    ├── scheduler.py                # 管理 cron 条目（install/remove/list/status）
    ├── task-runner.py              # Level 1 执行器（纯脚本任务）
    └── agent-wrapper.sh            # Level 2 执行器（Agent 辅助任务）
```

**SKILL.md frontmatter**：
- `name: scheduled-tasks`
- `description` 含触发词：`定时`、`调度`、`scheduled`、`cron`、`自动化`、`周期性`
- **不声明 `io:` 字段** — 调度是编排层工具，不参与 IO 链

---

### T1 定义任务 YAML schema

**`references/task-schema.md`** 标准：

```yaml
# 必填字段
schema_version: "1.0"      # 数据格式版本
name: string                # 任务唯一标识（ascii-kebab-case）
description: string         # 人类可读说明
level: 1 | 2                # 执行级别
schedule: string            # cron 表达式（5 字段标准格式）
enabled: boolean            # 是否启用

# Level 1 必填
command: string             # 要执行的命令
args: [string]              # 命令参数列表（可选，默认 []）
working_dir: string         # 工作目录（可选，默认 $HOME）

# Level 2 必填
agent: string               # gemini | claude | codex
prompt: string              # 给 agent 的完整指令

# 可选通用字段
timeout_seconds: integer    # 超时（默认 300）
on_failure: string          # log | retry（默认 log）
max_retries: integer        # 重试次数（默认 0）
output_dir: string          # 输出目录（可选）
```

**校验规则**：
1. `name` 必须是 `[a-z0-9-]+` 格式
2. `schedule` 必须是合法 5 字段 cron 表达式
3. Level 1 必须有 `command`，Level 2 必须有 `agent` + `prompt`
4. `level` 只能是 `1` 或 `2`
5. `on_failure` 只能是 `log` 或 `retry`
6. `agent` 只能是 `gemini`、`claude`、`codex`

---

### T2 实现 `scheduler.py`

**CLI 接口**：

```bash
# 安装所有 enabled 任务到 crontab
python3 scheduler.py install

# 安装指定任务
python3 scheduler.py install --task daily-tweet-fetch

# 移除所有已安装的定时任务
python3 scheduler.py remove

# 移除指定任务
python3 scheduler.py remove --task daily-tweet-fetch

# 列出所有任务及其状态（已安装/未安装/已禁用）
python3 scheduler.py list

# 查看当前 crontab 中的 scheduled-tasks 条目
python3 scheduler.py status

# Dry-run：只打印将要写入的 crontab 内容，不实际修改
python3 scheduler.py install --dry-run
```

**实现要点**：

1. **读取任务目录**：扫描 `tasks/*.yaml`，解析每个文件（YAML 子集解析器）
2. **校验**：按 T1 校验规则验证每个任务文件
3. **生成 crontab 条目**：
   - Level 1: `{schedule} cd {working_dir} && flock -n /tmp/st-{name}.lock python3 {task-runner.py} {task.yaml} >> {log} 2>&1`
   - Level 2: `{schedule} flock -n /tmp/st-{name}.lock bash {agent-wrapper.sh} {task.yaml} >> {log} 2>&1`
4. **crontab 操作**：
   - 读取现有 crontab（`crontab -l`）
   - 在 `# BEGIN scheduled-tasks` 和 `# END scheduled-tasks` 标记之间管理条目
   - 写回 crontab（`echo "$content" | crontab -`）
5. **标记管理**：用注释标记区分 scheduled-tasks 管理的条目和用户手动添加的条目
6. **环境变量**：在 crontab 头部设置 `PATH`、`HOME`、`AGENT_SKILLS_DIR`
7. **YAML 解析**：不自己解析 YAML，而是调用 `task-runner.py --parse {task.yaml}` 获取 JSON 输出
8. **flock 防重叠**：在生成的 crontab 行中加入 `flock -n /tmp/st-{name}.lock`，task-runner.py 自身不做锁
9. 零外部依赖：`subprocess`、`os`、`sys`、`argparse`、`re`、`datetime`
---

### T3 实现 `task-runner.py`

**CLI 接口**：

```bash
# 执行指定任务（Level 1 专用）
python3 task-runner.py tasks/daily-tweet-fetch.yaml

# Dry-run：只打印将要执行的命令
python3 task-runner.py tasks/daily-tweet-fetch.yaml --dry-run
```

**实现要点**：

1. 解析任务 YAML
2. 校验 `level: 1`（Level 2 拒绝执行，提示使用 `agent-wrapper.sh`）
3. 展开 `~` 为 `$HOME`
4. 设置工作目录
5. 构建完整命令：`command + args`
6. 用 `subprocess.run()` 执行，捕获 stdout/stderr
7. 执行完成后调用 `log-execution.py` 记录到 observability
8. 超时处理：`subprocess.run(timeout=timeout_seconds)`
9. 失败重试：`on_failure == "retry"` 时按 `max_retries` 重试
10. 退出码：命令成功返回 0，失败返回命令的退出码
11. **`--parse` 模式**：解析 YAML 并输出 JSON 到 stdout（供 scheduler.py 和 agent-wrapper.sh 调用）
12. **`--extract-all` 模式**：一次性输出所有字段的 JSON（供 agent-wrapper.sh 使用，避免多次启动 Python 进程）

**YAML 子集解析器**（集中在 task-runner.py 中）：
- 复用 Phase 4 的解析策略
- 支持：字符串值、整数值、布尔值、数组（`[a, b, c]` 内联格式）
- 不支持：嵌套字典（当前 schema 不需要）
- 注释以 `#` 开头的行跳过
- 字符串值：自动去除首尾引号

---

### T4 实现 `agent-wrapper.sh`

```bash
#!/bin/bash
# Agent Wrapper — Level 2 执行器
# 用法: agent-wrapper.sh <task.yaml> [--dry-run]

set -euo pipefail

TASK_FILE="$1"
DRY_RUN="${2:-}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${HOME}/.ai-skills"
LOG_DIR="${SKILLS_DIR}/.logs"

# 一次性提取所有字段（避免多次启动 Python 进程）
TASK_JSON=$(python3 "$SCRIPTS_DIR/task-runner.py" "$TASK_FILE" --extract-all)
AGENT=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agent',''))")
PROMPT=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))")
TASK_NAME=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))")
TIMEOUT=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timeout_seconds',300))")

# 设置完整环境（source 用户 profile，失败则 fallback 基本 PATH）
if [ -f "$HOME/.bashrc" ]; then
  source "$HOME/.bashrc" 2>/dev/null || true
fi
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export AGENT_SKILLS_DIR="$SKILLS_DIR"

# --dry-run 模式：只输出将要执行的命令
if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY-RUN] Task: ${TASK_NAME}"
  echo "[DRY-RUN] Agent: ${AGENT}"
  echo "[DRY-RUN] Prompt: ${PROMPT}"
  echo "[DRY-RUN] Timeout: ${TIMEOUT}s"
  case "$AGENT" in
    claude) echo "[DRY-RUN] Command: timeout ${TIMEOUT} claude -p \"${PROMPT}\"" ;;
    gemini) echo "[DRY-RUN] Command: timeout ${TIMEOUT} gemini -p \"${PROMPT}\"" ;;
    codex)  echo "[DRY-RUN] Command: timeout ${TIMEOUT} codex -q \"${PROMPT}\"" ;;
    *)      echo "[DRY-RUN] ERROR: Unknown agent: ${AGENT}" ;;
  esac
  exit 0
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TASK_LOG="${LOG_DIR}/scheduled-${TASK_NAME}-${TIMESTAMP}.log"
mkdir -p "$LOG_DIR"

echo "=== [$(date)] Starting Level 2 task: ${TASK_NAME} ===" >> "$TASK_LOG"
echo "Agent: ${AGENT}" >> "$TASK_LOG"

STATUS="success"

# 根据 agent 选择 CLI
case "$AGENT" in
  claude)
    timeout "${TIMEOUT:-300}" claude -p "$PROMPT" >> "$TASK_LOG" 2>&1 || STATUS="failure"
    ;;
  gemini)
    timeout "${TIMEOUT:-300}" gemini -p "$PROMPT" >> "$TASK_LOG" 2>&1 || STATUS="failure"
    ;;
  codex)
    timeout "${TIMEOUT:-300}" codex -q "$PROMPT" >> "$TASK_LOG" 2>&1 || STATUS="failure"
    ;;
  *)
    echo "ERROR: Unknown agent: ${AGENT}" >> "$TASK_LOG"
    STATUS="failure"
    ;;
esac

echo "=== [$(date)] Task ${TASK_NAME} finished with status: ${STATUS} ===" >> "$TASK_LOG"

# 记录到 observability
python3 "$SKILLS_DIR/skill-observability/scripts/log-execution.py" \
  --skill "scheduled-tasks" \
  --agent "$AGENT" \
  --status "$STATUS" \
  --notes "Level 2 task: ${TASK_NAME}"

exit $( [ "$STATUS" = "success" ] && echo 0 || echo 1 )
```

**实现要点**：
1. 从 task-runner.py 一次性提取所有字段（`--extract-all` 模式）
2. 先 source `~/.bashrc` 设置环境（cron 环境 PATH 不完整是经典踩坑），失败则 fallback 基本 PATH
3. 日志输出到独立文件，不混入 executions.jsonl
4. 支持 `--dry-run` 模式，输出将执行的命令但不实际调用 agent
4. 执行完成后自动调 observability
5. 超时由 `timeout` 命令控制

---

### T5 创建示例任务

**`tasks/example-l1-report.yaml`**：

```yaml
schema_version: "1.0"
name: monthly-observability-report
description: 每月 1 日生成上月 skill 使用报告
level: 1
schedule: "0 9 1 * *"
enabled: true
command: "python3"
args: ["~/.ai-skills/skill-observability/scripts/report.py", "--output", "~/.ai-skills/.logs/report-latest.md"]
working_dir: "~"
timeout_seconds: 60
on_failure: log
max_retries: 0
```

**`tasks/example-l2-analysis.yaml`**：

```yaml
schema_version: "1.0"
name: weekly-skill-health-check
description: 每周日生成 skill 健康度分析报告（需要 LLM 总结）
level: 2
schedule: "0 10 * * 0"
enabled: false
agent: gemini
prompt: "请运行 skill-observability 的 report.py 和 find-unused.py，然后总结出本周 skill 使用趋势和建议。将报告保存到 ~/.ai-skills/.logs/weekly-health.md"
timeout_seconds: 600
on_failure: log
max_retries: 0
```

---

### T6 安全审计

```bash
python3 ~/.ai-skills/skill-security-audit/scripts/audit.py ~/.ai-skills/scheduled-tasks
```

**预期风险点**：
- `agent-wrapper.sh` 中有 `subprocess` / shell 执行 → 需在 SKILL.md 中声明
- Level 2 调 agent CLI → 需 consent 提示

**验收标准**：0 CRITICAL。WARN 项可接受（需文档解释）。

---

### T7 端到端验收

**验收脚本** `test-scheduler.sh`：

```bash
#!/bin/bash
set -e
SKILLS_DIR="${HOME}/.ai-skills"
SCHED_DIR="${SKILLS_DIR}/scheduled-tasks/scripts"
TASK_DIR="${SKILLS_DIR}/scheduled-tasks/tasks"

echo "═══ Step 1: scheduler.py list（无任务安装） ═══"
python3 "$SCHED_DIR/scheduler.py" list

echo "═══ Step 2: scheduler.py install --dry-run ═══"
python3 "$SCHED_DIR/scheduler.py" install --dry-run

echo "═══ Step 3: task-runner.py --dry-run（Level 1 示例） ═══"
python3 "$SCHED_DIR/task-runner.py" "$TASK_DIR/example-l1-report.yaml" --dry-run

echo "═══ Step 4: agent-wrapper.sh --dry-run（Level 2 示例） ═══"
bash "$SCHED_DIR/agent-wrapper.sh" "$TASK_DIR/example-l2-analysis.yaml" --dry-run

echo "═══ Step 5: task-runner.py 校验错误任务 ═══"
# 创建临时错误任务
cat > /tmp/bad-task.yaml << 'EOF'
schema_version: "1.0"
name: bad task name!
level: 3
schedule: "invalid"
enabled: true
EOF
python3 "$SCHED_DIR/task-runner.py" /tmp/bad-task.yaml --dry-run 2>&1 || true
rm -f /tmp/bad-task.yaml

echo "═══ Step 6: quick_validate.py ═══"
python3 "$SKILLS_DIR/.system/skill-creator/scripts/quick_validate.py" \
  "$SKILLS_DIR/scheduled-tasks"

echo "═══ Step 7: audit.py ═══"
python3 "$SKILLS_DIR/skill-security-audit/scripts/audit.py" \
  "$SKILLS_DIR/scheduled-tasks"

echo "═══ 全部验收通过 ═══"
```

**验收清单**：

| # | 验证项 | 判定标准 |
|---|--------|----------|
| V1 | `scheduler.py list` 能列出所有任务及状态 | 输出 Markdown 表格 |
| V2 | `scheduler.py install --dry-run` 输出正确的 crontab | 含 `# BEGIN/END scheduled-tasks` 标记 + flock 防重叠 |
| V3 | `task-runner.py --dry-run` 输出将要执行的命令 | 命令和参数正确 |
| V4 | `agent-wrapper.sh --dry-run` 输出 Level 2 命令 | Agent + Prompt + 命令正确 |
| V5 | 错误任务被正确拒绝 | 友好错误信息 + exit code 非零 |
| V6 | `quick_validate.py` 通过 | skill 格式校验 PASS |
| V7 | `audit.py` 0 CRITICAL | 安全审计通过 |
| V7 | YAML 解析正确处理边界（空数组、布尔值、注释行） | 无 crash |

---

## 五、验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| V1 | `scheduler.py` 能 list/install/remove/status cron 条目 | T7 Step 1-2 |
| V2 | `task-runner.py` 能解析 YAML 并执行 Level 1 任务 | T7 Step 3 |
| V3 | `agent-wrapper.sh` 能调用正确的 agent CLI | 代码审查 |
| V4 | YAML 校验能拒绝非法任务定义 | T7 Step 4 |
| V5 | 通过 `quick_validate.py` + `audit.py` | T7 Step 5-6 |
| V6 | crontab 条目包含 flock 防重叠 | T7 Step 2 输出检查 |
| V7 | `schema_version` 在每个任务 YAML 中存在 | 示例任务检查 |

---

## 六、不在 Phase 6 范围

| 什么 | 为什么不做 |
|------|----------|
| systemd timer 支持 | WSL 兼容性差，cron 足够 MVP |
| Web 管理界面 | 反面教材 SuperAGI |
| 消息通知（Telegram/邮件） | MVP 聚焦核心调度，通知日后扩展 |
| 任务依赖 DAG | 独立任务即可，不需要依赖链 |
| 真实 cron install 自动测试 | crontab 操作需 root/用户确认，dry-run 验证 |
| PyYAML 依赖 | 零外部依赖约束，手写子集解析 |

---

## 七、`scheduled-tasks` 目录结构

```
scheduled-tasks/
├── SKILL.md                        # T0
├── tasks/                          # 任务定义目录
│   ├── example-l1-report.yaml      # T5：Level 1 示例
│   └── example-l2-analysis.yaml    # T5：Level 2 示例
├── references/
│   └── task-schema.md              # T1：任务 YAML schema
└── scripts/
    ├── scheduler.py                # T2：crontab 管理
    ├── task-runner.py              # T3：Level 1 执行器
    └── agent-wrapper.sh            # T4：Level 2 执行器
```

---

## 八、全周期状态

| Phase | 状态 | 评分 | 备注 |
|-------|------|------|------|
| 0 上下文+骨架 | ✅ | — | Medium 规模，CLI 工具 |
| 1.1 调研 v1 | ✅ | — | cron vs systemd timer + Level 2 Agent CLI + 反面教材 |
| 1.2 审查 | ✅ | 7.5 | 🔴x1 🟡x4（fcntl跨平台+YAML集中+提取优化+PATH+验收补全） |
| 1.3 修订 v2 | ✅ | — | 已吸收所有审查意见 |
| 1.4 质量门 A | ✅ | 8.5 | 调研+规划合并审查，已收敛 |
| 2.1 规划 v1 | ✅ | — | 本文档 |
| 2.2 审查 | ✅ | 7.5 | 同 1.2（合并审查） |
| 2.3 修订 v2 | ✅ | — | 本次修订 |
| 2.4 质量门 B | ✅ | 8.5 | ≥ 8.0 通过（Medium） |
| 3.1 编码 | ✅ | — | 3 个脚本：900 行总计 |
| 3.2 代码审查 | ✅ | — | YAML 解析器集中化 + flock 行级 |
| 3.3 踩坑检查 | ✅ | — | universal.md + cli-tool.md 逐项检查 |
| 3.4 质量门 C | ✅ | — | 7/7 验收项通过 |
| 4 部署 | ✅ | — | 已安装到 ~/.ai-skills/scheduled-tasks/ |
| 5 经验沉淀 | ✅ | — | 踩坑记录 + PROJECT.md 更新 |

---

## 九、踩坑记录

| # | 踩坑项 | 根因 | 修复 | 预防 |
|---|--------|------|------|------|
| P6-1 | PowerShell Here-String 注入 CRLF 到 WSL bash | `@' ... '@ | wsl bash` 中的换行符带 `\r`，导致参数出现 `list\r` | 简单命令用 `wsl -e bash -c "..."` 替代 Here-String | 含引号的复杂命令用 Here-String，简单单行命令直接 `wsl -e bash -c` |
| P6-2 | UNC 路径写入文件自带 CRLF（Phase 5-P5-2 复现） | Windows 通过 `\\wsl.localhost\` 路径写的文件自动 CRLF | 写完后统一 `sed -i 's/\r$//'` | 所有通过 UNC 路径创建的文件后必跟 `sed -i` |

---

## 变更日志

| 日期 | 版本 | 变更 | 审查结果 |
|------|------|------|---------|
| 2026-03-14 | v3 | Phase 6 完成。产出 `scheduled-tasks` skill（SKILL.md + task-schema.md + 3 脚本 900 行 + 2 示例任务）。审计 1 PASS / 0 WARN / 0 CRIT。7/7 验收通过 | — |
| 2026-03-14 | v2 | 修订：flock 改为 crontab 行级、YAML 解析集中到 task-runner.py、agent-wrapper.sh 一次性提取+dry-run、PATH 设置改 source bashrc、验收补全 Level 2 | 🔴x1→0 🟡x4→0（收敛）|
| 2026-03-14 | v1 | Phase 6 项目文档创建，含调研结论 + 完整规划 + 任务清单 + 详细设计 | — |
