[简体中文](README.md) | [English](README_EN.md)

<div align="center">

# 🛠️ Agent Toolchain

**让你的 AI Agent 从「什么都能聊」变成「什么都能做」。**

[![Author](https://img.shields.io/badge/Author-Cloud927-blue?style=flat-square)](https://github.com/cloud99277)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Skills](https://img.shields.io/badge/Skills-106+-orange?style=flat-square)](#-这套系统能做什么)
[![Zero Infra](https://img.shields.io/badge/Zero_Infra-No_DB_No_Server-purple?style=flat-square)](#-核心设计约束)

</div>

## 💡 为什么做这个

当你用 Claude Code、Codex CLI 或 Gemini CLI 这些 AI Agent 写代码时，你有没有遇到过这些问题？

- 🤯 **每个 Agent 的 skill 配置各管各的**，换一个 Agent 就得重新配置一遍
- 🔁 **重复工作无法复用**——上次教会 Claude 做的事，Gemini 完全不知道
- 🎰 **Skill 质量参差不齐**——有的能跑，有的是摆设，有的甚至有安全风险
- 📦 **编排多步任务像拼积木**——手动一个一个调用，步骤多了就乱

**Agent Toolchain 解决的就是这些问题。**

它不是又一个 AI 框架。它是一套纯文件系统的 Skill 操作系统——零数据库、零服务器、零常驻进程。一个 `~/.ai-skills/` 目录，所有 Agent 共享。

## 🔥 这套系统能做什么

### 🏗️ 6 层架构，一个目录搞定

```
~/.ai-skills/
├── 🏛️ 治理层    skill-lint · skill-security-audit · skill-observability
├── 🔗 编排层    agent-orchestrator（YAML 声明式链）· scheduled-tasks
├── 🧠 记忆层    memory-manager · brain-link · conversation-distiller
├── 📋 协议层    IO 契约 · MCP 兼容导出
├── ⚡ 能力层    106+ 个即用型 Skill
└── 🤝 共享层    symlink → Claude / Codex / Gemini / 任何 Agent
```

### 🛡️ 安全，不是口号

```bash
$ python3 audit.py ~/.ai-skills --all

Total: 106 skills | PASS: 106 | WARN: 0 | CRIT: 0
```

6 维度静态扫描：凭据泄露 · 数据外传 · 网络越界 · IO 越界 · 逆向 API 合规 · 供应链

### 🔄 一条 YAML，串联多个 Skill

```yaml
# chains/translate-tweet-publish.yaml
name: translate-tweet-publish
steps:
  - skill: baoyu-danger-x-to-markdown
    input: { url: "$URL" }
  - skill: translate
    input: { from_prev: markdown_file }
  - skill: baoyu-post-to-wechat
    input: { from_prev: markdown_file }
```

### 🌐 一键导出 MCP 协议

```bash
$ python3 export-mcp.py --stats

Exported: 106 tools (5 with IO schema)
Output: mcp-tools.json (68KB)
```

让你的 Skill 被任何 MCP 兼容的 Agent 自动发现。

## 🚀 5 分钟上手

```bash
# 1. 克隆
git clone https://github.com/cloud99277/927-agent-toolchain.git
cd 927-agent-toolchain

# 2. 把 skills 复制到统一仓库
cp -r skills/* ~/.ai-skills/

# 3. 为你的 Agent 创建 symlink（任选一个或全部）
ln -s ~/.ai-skills ~/.claude/skills      # Claude Code
ln -s ~/.ai-skills ~/.codex/skills       # Codex CLI
ln -s ~/.ai-skills ~/.gemini/skills      # Gemini CLI

# 4. 验证
python3 ~/.ai-skills/mcp-export/scripts/export-mcp.py --stats
```

## 📦 仓库结构

```
927-agent-toolchain/
├── skills/                        # ⭐ 核心：所有 Skill 源码
│   ├── skill-security-audit/      #   6 维度安全扫描器
│   ├── memory-manager/            #   三层记忆模型
│   ├── agent-orchestrator/        #   YAML 链式编排
│   ├── skill-observability/       #   执行日志 + 月报
│   ├── scheduled-tasks/           #   两级定时调度
│   ├── mcp-export/                #   MCP 协议导出
│   ├── full-cycle-builder/        #   质量门驱动全周期开发
│   ├── deep-research/             #   体系化领域调研
│   ├── project-audit/             #   文档架构审查
│   ├── design-iteration/          #   审查驱动设计迭代
│   ├── code-review/               #   结构化代码审查
│   └── ...                        #   共 15 个 Skill
│
├── docs/                          # 设计文档与规范
│   ├── phase-1-io-contracts/      #   IO 契约规范 + type-registry
│   ├── phase-2-security-audit/    #   安全审计设计
│   ├── phase-3-memory-manager/    #   记忆管理设计
│   ├── phase-4-orchestrator/      #   编排器设计
│   ├── phase-5-observability/     #   可观测性设计
│   ├── phase-6-scheduler/         #   调度器设计
│   └── phase-7-mcp-export/        #   MCP 导出设计
│
└── PROJECT.md                     # 项目顶层设计文档（775+ 行）
```

## ⚙️ 核心设计约束

| 约束 | 为什么 |
|------|--------|
| 🚫 **零基础设施** | 不需要装数据库、起服务器、配 Docker。一个目录就是全部 |
| 📄 **文档即协议** | SKILL.md 的 frontmatter 就是 Skill 的 API 契约 |
| 🔒 **安全默认** | 无网络端口、凭据不硬编码、逆向 API 必须加 `danger-` 前缀 |
| 🤝 **Agent 无关** | 不绑定任何特定 Agent，通过 symlink 适配所有 |
| 🏃 **8 天节奏** | 每个 Phase 只做 1 件事，全项目 8 天交付 |

## 🗺️ 8 个 Phase 的旅程

> 这个项目从零到完整只用了 8 天。每个 Phase 的设计文档都在 `docs/` 目录下。

| Phase | 做了什么 | 核心产出 |
|-------|---------|---------|
| **0** | 架构设计 | 6 层架构、5 条设计约束 |
| **1** | IO 契约 | 标准化 Skill 输入输出格式 |
| **2** | 安全审计 | `audit.py` — 6 维度扫描器 |
| **3** | 记忆管理 | `memory-manager` — 三层记忆模型 |
| **4** | 链式编排 | `agent-orchestrator` — YAML 声明式 |
| **5** | 可观测性 | `skill-observability` — 日志 + 月报 |
| **6** | 定时调度 | `scheduled-tasks` — cron + Agent CLI |
| **7** | MCP 导出 | `export-mcp.py` — 协议级兼容 |

## 🙏 致谢

- [Claude Code](https://docs.anthropic.com/) — Skill 标准格式来源
- [Fabric](https://github.com/danielmiessler/fabric) — Unix 管道式编排的启发
- [MCP](https://modelcontextprotocol.io/) — 工具发现协议

## 📄 许可证

[MIT License](LICENSE) — 随便用，注明来源就好。

---

<div align="center">

**Made with ❤️ by [Cloud927](https://github.com/cloud99277)**

*用 AI Agent 构建的 AI Agent 工具链。没错，它自己就是自己的用户。*

</div>
