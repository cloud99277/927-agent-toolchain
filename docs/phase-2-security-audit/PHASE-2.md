# Phase 2 — Skill 安全审计

> **所属项目**：Agent Toolchain（`~/projects/agent-os/`）
> **Phase 目标**：为 skill 仓库建立安全静态分析能力，完成首次全仓安全扫描
> **启动日期**：2026-03-08
> **状态**：✅ 已完成（frontmatter 白名单降级为 v0.2，见 audit.py 注释）
> **前序 Phase**：Phase 1（IO 契约）✅ 已完成
> **文档版本**：v3（基于综合审查修订）

---

## 一、定位

### 为什么安全审计是 P1

> 安全不能是事后想法。—— OpenClaw 反面教材

当前 90+ skill 中有大量脚本（Python/Bash），部分使用逆向工程 API（如 `baoyu-danger-x-to-markdown`）。安全风险包括：

1. **凭据泄露**：scripts/ 中可能有硬编码的 API key/token
2. **数据外传**：脚本可能包含未声明的外部 HTTP 请求
3. **权限越界**：SKILL.md 声明的能力和 scripts/ 实际行为可能不一致
4. **供应链**：脚本依赖的 npm/pip 包可能有已知漏洞

### Phase 1 经验回顾

Phase 1 的成功经验可复用到 Phase 2：

| Phase 1 经验 | Phase 2 应用 |
|-------------|-------------|
| 先做兼容性测试再设计 | 先在 3-4 个 skill 上试跑审计脚本，再推全仓 |
| 渐进式采纳 | 新 skill 必须通过审计，现有 skill 分批扫描 |
| verify-chain.py 零依赖 | audit.py 同样零外部依赖（纯 Python stdlib） |
| IO 契约定义了 skill 的输入输出声明 | 审计可交叉验证 IO 声明与脚本实际行为（IO 越界检查） |

> **v1→v2 变更**：新增 Phase 1 产出物的利用点（IO 契约交叉验证），来源：架构审查 🟡#4

---

## 二、前置条件

| 条件 | 状态 |
|------|------|
| Phase 1 IO 契约完成 | ✅ |
| 现有 `security-review` skill 已了解 | ✅（审查代码安全，不是 skill 安全） |
| 现有 `security-scan` skill 已了解 | ✅（扫描 `.claude/` 配置，不是 skill 脚本） |
| Phase 1 产出物（type-registry.json、IO 声明）可用于交叉验证 | ✅ |

---

## 三、任务清单

> **v1→v2 变更**：新增 T0 前置任务（创建目录结构和 SKILL.md），对齐 Phase 1 任务编号体例。来源：架构审查 🟡#6

| # | 任务 | 类型 | 产出物 | 状态 |
|---|------|------|--------|------|
| T0 | 创建 skill-security-audit 目录结构和 SKILL.md | 前置 | `skill-security-audit/SKILL.md` | ✅ 完成 |
| T1 | 定义审计维度、检查规则和报告 schema | 设计 | `references/audit-checklist.md` + 报告 JSON schema | ✅ 完成 |
| T2 | 实现凭据扫描模块 | 开发 | `scripts/audit.py` 中的 credentials 模块 | ✅ 完成 |
| T3 | 在 4 个代表 skill 上试跑 | 验证 | 试跑结果记录 | ✅ 完成（4/4 PASS） |
| T4 | 实现完整审计脚本（整合所有维度） | 开发 | `scripts/audit.py` | ✅ 完成（6 维度） |
| T5 | 全仓 90+ skill 首次安全扫描 | 执行 | 审计报告 | ✅ 完成（87 skills: 86 PASS / 1 WARN / 0 CRIT） |
| T6 | 编写修复指南 | 文档 | `references/remediation-guide.md` | ✅ 完成 |

### 依赖关系

```
T0（目录 + SKILL.md）
  ↓
T1（审计清单 + 报告 schema）──→ T2（凭据扫描模块）──→ T3（试跑 4 个 skill）
                                                          ↓
                                                     T4（完整审计脚本）──→ T5（全仓扫描）──→ T6（修复指南）
```

---

## 四、各任务详细设计

### T0 创建目录结构和 SKILL.md

> **v1→v2 新增**：v1 缺少此任务但验收标准 V3 要求 SKILL.md 通过校验，补充以对齐。来源：架构审查 🟡#6

**操作**：创建 `skill-security-audit/` 目录，编写 SKILL.md（含 frontmatter），确保通过 `quick_validate.py`。

---

### T1 定义审计维度和检查规则

**目标**：明确"查什么"、"怎么判定"、"怎么排除误报"和"报告格式"。

**审计维度设计**：

> **v1→v2 变更**：
> - 「权限越界」拆分为「网络越界」和「IO 越界」两个可机器化子维度（来源：架构审查 🔴#2）
> - 「供应链」从 🟡 High 降级为 🟢 Low（来源：架构审查 🔴#3）
> - 新增「IO 契约一致性」维度（来源：架构审查 🟡#4）
> - 所有维度新增「排除规则」列（来源：架构审查 🔴#1）

| 维度 | 检查方式 | 严重度 | 规则示例 | 排除规则 |
|------|---------|--------|---------|---------|
| **凭据泄露** | regex 扫描 `scripts/` | 🔴 Critical | 匹配 `sk-`, `api_key=`, `token=`, `password=` 等模式 | 排除 `.md` 文件正文；排除 `os.environ`/`process.env` 引用；支持 `.audit-ignore` 白名单 |
| **数据外传** | regex 扫描未声明的 HTTP 请求 | 🔴 Critical | 匹配 `requests.`, `httpx.`, `urllib`, `curl`, `fetch` | 排除注释行；排除 SKILL.md 中已声明网络访问的 skill |
| **网络越界** | `scripts/` 有 HTTP 请求但 SKILL.md 未声明 | 🟡 High | SKILL.md description/io 中无网络相关关键词，但 scripts/ 含 HTTP 请求 | 仅扫描 `scripts/` 目录 |
| **IO 越界** | 比对 `io:` 声明 vs `scripts/` 实际文件操作 | 🟡 High | io 只声明 `text` 输出，但脚本写入多个文件；或 io 声明 `url` 输入但脚本无 URL 处理代码 | 仅适用于已有 IO 声明的 skill（Phase 1 试点 + 新 skill） |
| **Consent 机制** | 检查 `danger-` 前缀 skill 的合规性 | 🟠 Medium | 使用逆向 API 的 skill 是否有 `danger-` 前缀标记 + SKILL.md 中是否有风险说明段落 | 仅适用于名称含 `danger-` 或 SKILL.md 中提及逆向/unofficial 的 skill |
| **供应链** | 列出 `requirements.txt` / `package.json` | 🟢 Low | 列出所有外部依赖文件及其内容 | — |

> **v1→v2 变更**：供应链检查降级为 🟢 Low 并限缩为「列出依赖文件」。原因：(1) 漏洞匹配需要查询外部数据库（PyPI/NVD），违反零依赖约束；(2) 90+ skill 中有 `requirements.txt` 的不超过 5 个，投入产出比低。漏洞匹配留给后续 Phase。来源：架构审查 🔴#3

**白名单机制**：

> **v1→v2 新增**：来源：架构审查 🔴#1

```
排除误报的三层机制：

1. 内置排除：仅扫描 scripts/ 目录（不扫 SKILL.md 正文和 references/）
2. 模式排除：排除环境变量引用（os.environ, process.env）、注释行、代码块示例
3. 显式白名单：skill 可在 SKILL.md frontmatter 中声明审计豁免
   audit:
     ignore:
       - credential_leak    # 说明：本 skill 的示例中包含 API key 模式
```

**审计报告 JSON Schema**：

> **v1→v2 新增**：来源：架构审查 🟡#7。满足项目约束 6（数据格式版本化）。

```json
{
  "schema_version": "1.0",
  "scan_date": "2026-03-08T12:00:00Z",
  "scanner_version": "0.1.0",
  "mode": "single | all",
  "results": [
    {
      "skill_path": "~/.ai-skills/translate",
      "skill_name": "translate",
      "status": "PASS | WARNING | CRITICAL",
      "findings": [
        {
          "dimension": "credential_leak | data_exfil | network_overreach | io_overreach | consent | supply_chain",
          "severity": "critical | high | medium | low",
          "file": "scripts/fetch.py",
          "line": 42,
          "matched_content": "sk-proj-abc...",
          "rule_id": "CRED-001",
          "whitelisted": false
        }
      ],
      "summary": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      }
    }
  ],
  "global_summary": {
    "total_skills": 90,
    "pass": 0,
    "warning": 0,
    "critical": 0
  }
}
```

**产出物**：`skill-security-audit/references/audit-checklist.md`（含以上维度表 + 白名单规则 + 报告 schema）

---

### T2 实现凭据扫描模块

> **v1→v2 变更**：从独立脚本 `scan-credentials.py` 调整为 `audit.py` 的子模块，通过 `audit.py --dimension=credentials` 调用。减少维护面。来源：架构审查 🟢#9

**目标**：最小可用的凭据扫描器，作为 `audit.py` 的第一个维度模块。

**扫描模式表**（初始版本）：

```python
CREDENTIAL_PATTERNS = [
    # API Keys
    r'(?i)(api[_-]?key|apikey)\s*[=:]\s*["\']?[a-zA-Z0-9_\-]{20,}',
    r'sk-[a-zA-Z0-9]{20,}',           # OpenAI
    r'sk-ant-[a-zA-Z0-9]{20,}',       # Anthropic
    r'AIza[a-zA-Z0-9_\-]{35}',        # Google
    
    # Tokens
    r'(?i)(token|secret)\s*[=:]\s*["\']?[a-zA-Z0-9_\-]{20,}',
    
    # Passwords
    r'(?i)password\s*[=:]\s*["\']?[^\s"\'\]]{8,}',
]

# 排除规则（v2 新增，来源：架构审查 🔴#1）
EXCLUSION_RULES = [
    # 仅扫描 scripts/ 目录下的文件
    "scan_scope": "scripts/",
    
    # 排除环境变量引用（正确做法，不报警）
    "safe_patterns": [
        r'os\.environ',
        r'os\.getenv',
        r'process\.env',
        r'\$\{?\w+\}?',        # shell 变量引用
    ],
    
    # 排除注释行
    "skip_comments": True,
]
```

**约束**：纯 Python stdlib，零外部依赖。

---

### T3 在 4 个代表 skill 上试跑

> **v1→v2 变更**：从 3 个增加到 4 个试跑 skill，新增一个纯文档类 skill 用于验证误报控制。来源：架构审查 🟡#5

**选择标准**：覆盖不同风险类型 **和不同误报场景**的 skill。

| # | Skill | 为什么选 | 预期发现 |
|---|-------|---------|---------| 
| 1 | `baoyu-danger-x-to-markdown` | 使用逆向 API，有 `danger-` 前缀 | 应通过 consent 检查，应有 .env 引用 |
| 2 | `translate` | 高频 skill，有 scripts/translate.py | 应无凭据泄露；验证对多文件脚本的处理 |
| 3 | `security-scan` | 安全类 skill | 应无问题（自我验证） |
| 4 | `api-design` | **纯文档类 skill**，SKILL.md 正文含大量 `api_key`、`token` 代码示例 | **应零误报**——验证排除规则对 .md 正文和 references/ 的过滤 |

**试跑验证清单**：

| 验证项 | 判定标准 |
|--------|---------|
| 真阳性率 | 已知问题全部检出 |
| 误报率 | 文档示例不应触发告警 |
| 排除规则 | .audit-ignore 和内置排除生效 |
| 报告格式 | 输出符合 JSON schema |

---

### T4 实现完整审计脚本

基于 T2 + T3 试跑经验扩展为完整的 `audit.py`：

- 整合所有审计维度（凭据 + 外传 + 网络越界 + IO 越界 + consent + 供应链列出）
- 输出符合 JSON schema 的审计报告
- 支持单 skill 和全仓两种模式
- 支持按维度单独运行

> **v1→v2 变更**：`scan-credentials.py` 不再作为独立脚本存在，而是 `audit.py` 的内置模块，通过 `--dimension` 参数调用。来源：架构审查 🟢#9

```bash
# 单 skill，全维度
python3 audit.py ~/.ai-skills/translate

# 单 skill，仅凭据扫描
python3 audit.py ~/.ai-skills/translate --dimension=credentials

# 全仓
python3 audit.py ~/.ai-skills --all

# 全仓，输出 JSON 报告
python3 audit.py ~/.ai-skills --all --output=report.json
```

---

### T5 全仓首次安全扫描

**操作**：对全仓 90+ skill 运行 audit.py，产出首次审计报告。

**产出物存储约定**：

> **v2→v3 新增**：来源：综合审查 project-audit 🔴#2

- 运行产物（如 `audit-report.json`）存放在 `phase-2-security-audit/` 目录下，作为本 Phase 的执行记录
- 后续重复扫描的报告建议存放到 `skill-security-audit/reports/` 下，与 Phase 规划解耦
- 报告文件名格式：`audit-report-YYYY-MM-DD.json`（含日期以支持历史对比）

**预期分类**：

| 结果 | 预期数量 | 处理 |
|------|---------|------|
| ✅ PASS | ~70-80 | 无需动作 |
| 🟡 WARNING | ~10-15 | 记录，Phase 2 内不修复 |
| 🔴 CRITICAL | ~2-5 | 评估是否需要立即修复 |

---

### T6 编写修复指南

针对每种审计发现类型，编写修复指南：

- 凭据泄露 → 如何迁移到 .env
- 未声明的外部请求 → 如何在 SKILL.md 中声明
- 网络越界 → 如何在 SKILL.md description 中标注网络访问
- IO 越界 → 如何添加/修正 IO 声明
- 供应链 → 如何审视外部依赖

---

## 五、验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| V1 | 审计脚本能检测到至少 4 种风险类型 | 在试跑 skill 上验证（凭据 + 外传 + 网络越界 + consent） |
| V2 | 全仓扫描报告产出且符合 JSON schema | `audit.py --all` 成功执行，输出可被 JSON 解析 |
| V3 | `skill-security-audit` skill 通过 `quick_validate.py` 和 `skill-lint` | 脚本执行 |
| V4 | 审计脚本零外部依赖 | 检查 import 语句 |
| V5 | 纯文档类 skill 零误报 | T3 试跑 `api-design` 结果 |

> **v1→v2 变更**：V1 从 3 种提升到 4 种；新增 V5 误报控制验收。来源：架构审查 🔴#1

---

## 六、不在 Phase 2 范围

| 什么 | 为什么不做 |
|------|----------|
| 修复全仓的安全问题 | Phase 2 只做"发现"，修复作为后续任务 |
| 沙箱执行 | 需要 Docker/Firejail，违反零依赖约束 |
| 持续集成 | 先做好手动审计，CI 等需求真实出现再加 |
| 审计脚本集成到 skill-lint | 可以考虑，但 Phase 2 先保持独立 |
| 供应链漏洞匹配 | 需要查询外部数据库（PyPI/NVD），违反零依赖约束。MVP 仅列出依赖文件 |

> **v1→v2 变更**：新增「供应链漏洞匹配」到排除范围。来源：架构审查 🔴#3

---

## 七、`skill-security-audit` 目录结构

```
skill-security-audit/
├── SKILL.md                        # T0 创建
├── references/
│   ├── audit-checklist.md          # T1：审计维度、排除规则、报告 schema
│   └── remediation-guide.md        # T6：修复指南
└── scripts/
    └── audit.py                    # T2-T4：主审计脚本（含凭据扫描等所有维度模块）
```

> **v1→v2 变更**：移除独立的 `scan-credentials.py`，凭据扫描作为 `audit.py` 的内置模块。来源：架构审查 🟢#9

---

## 变更日志

| 日期 | 版本 | 变更 | 审查结果 |
|------|------|------|---------|
| 2026-03-08 | v1 | Phase 2 项目文档创建 | 🔴x3 🟡x4 🟢x3（见架构审查） |
| 2026-03-08 | v2 | 修订：新增白名单/误报处理机制、拆分权限越界为可机器化维度、供应链降级、整合 IO 契约、扩展试跑 skill、补充 T0 任务、定义报告 JSON schema、统一脚本关系、细化 Consent 判定 | ✅ 再审查通过（8.5/10） |
| 2026-03-08 | v2.1 | T0-T6 全部执行完成。首次全仓扫描结果：87 skills / 86 PASS / 1 WARN（自引用）/ 0 CRIT。试跑中发现 CONS-001 误报并修复（reverse 上下文匹配优化） | ✅ 执行完成 |
| 2026-03-08 | v3 | 综合审查修订（project-audit + code-review）：修复 audit.py 3 个逻辑 bug（danger-prefix / fnmatch / CRLF）、标注 frontmatter 白名单降级、明确 audit-report.json 存储约定、添加 --version CLI、修正 supply_chain rule_id 生成、同步 audit-checklist pyproject.toml | 见 `phase-2-review.md` |

---

## v2 对 v1 审查意见的逐条回应

| 审查意见 | 类型 | v2 修订 | 状态 |
|---------|------|--------|------|
| 缺少误报处理和白名单机制 | 🔴 | T1 新增排除规则列 + 白名单三层机制；T2 新增 EXCLUSION_RULES；T3 增加 api-design 误报验证；V5 新增误报验收 | ✅ 已修 |
| 权限越界定义模糊，无法机器化 | 🔴 | 拆分为「网络越界」（regex 可做，🟡 High）和「IO 越界」（基于 Phase 1 IO 声明交叉验证，🟡 High） | ✅ 已修 |
| 供应链检查违反零依赖约束 | 🔴 | 降级为 🟢 Low，MVP 仅列出依赖文件；漏洞匹配加入「不在范围」 | ✅ 已修 |
| 缺少与 Phase 1 IO 契约的整合 | 🟡 | 新增「IO 越界」维度 + Phase 1 经验回顾新增 IO 契约利用点 + 前置条件新增 Phase 1 产出可用性 | ✅ 已修 |
| T3 试跑 skill 太安全 | 🟡 | 新增第 4 个 skill（`api-design`，纯文档类），专门验证误报控制 | ✅ 已修 |
| 任务清单中无创建 SKILL.md 任务 | 🟡 | 新增 T0 前置任务 | ✅ 已修 |
| 审计报告 JSON schema 未定义 | 🟡 | T1 中新增完整 JSON schema 定义（含 schema_version） | ✅ 已修 |
| 任务编号未与 Phase 1 对齐 | 🟢 | 新增 T0，整体编号体系对齐 | ✅ 已修 |
| scan-credentials.py 与 audit.py 关系不明 | 🟢 | 定位为 audit.py 内置模块，移除独立脚本，通过 --dimension 调用 | ✅ 已修 |
| Consent 判定标准不够细 | 🟢 | 审计维度表中细化为「danger- 前缀标记 + SKILL.md 风险说明段落」双重判定 | ✅ 已修 |

---

## audit.py 待改进项（Backlog）

> 以下 7 项来自 v3 综合审查（project-audit + code-review），均为非阻塞 🟡 优化。
> 不设固定时间，**由需求触发**——原则：需求真实出现再加。

| # | 改进项 | 触发条件 | 预估工作量 |
|---|--------|---------|-----------|
| B1 | **frontmatter 白名单实现**（Layer 3） — `get_audit_ignore_dimensions()` 当前 return [] | 某 skill 需要豁免特定维度，`.audit-ignore` 文件级粒度不够 | 30 min |
| B2 | **whitelisted findings 全景图** — 已声明网络的 skill 也记录 findings（标记 whitelisted） | 需要回答"多少 skill 做了网络请求"等全局问题 | 15 min |
| B3 | **`io:` 声明检测精确化** — 当前全文搜索 `'io:'`，应只检查 frontmatter | 某 skill 正文包含 `io:` 被误判为有 IO 声明 | 10 min |
| B4 | **空扩展名匹配收窄** — `text_extensions` 中 `''` 改为显式文件名白名单 | scripts/ 下出现无扩展名的二进制文件被错误扫描 | 5 min |
| B5 | **subprocess curl/wget 检测** — 补充 `subprocess.run(['curl', ...])` 模式 | 有 skill 用 subprocess 调用 curl 但未被检出 | 10 min |
| B6 | **IO 越界集成 type-registry** — 从 Phase 1 的 type-registry.json 动态加载类型列表 | Phase 1 IO 契约被更多 skill 采纳，硬编码类型列表过时 | 20 min |
| B7 | **试跑结果持久化** — T3 试跑产出独立 JSON 文件 | 需要回溯验证历史试跑结果 | 10 min |

> **最自然的 v0.2 时机**：下次全仓重新扫描时（如新增 10+ skill 后），顺手处理。

