[简体中文](README.md) | [English](README_EN.md)

<div align="center">

# 🛠️ Agent Toolchain

**Turn your AI Agent from "can chat about anything" into "can do anything."**

[![Author](https://img.shields.io/badge/Author-Cloud927-blue?style=flat-square)](https://github.com/cloud99277)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Skills](https://img.shields.io/badge/Skills-106+-orange?style=flat-square)](#-what-this-system-can-do)
[![Zero Infra](https://img.shields.io/badge/Zero_Infra-No_DB_No_Server-purple?style=flat-square)](#-core-design-constraints)

</div>

## 💡 Why This Exists

When you use AI Agents like Claude Code, Codex CLI, or Gemini CLI for coding, have you ever run into these problems?

- 🤯 **Every Agent manages its skills separately** — switch agents and you're starting from scratch
- 🔁 **Can't reuse work across agents** — what you taught Claude, Gemini has no idea about
- 🎰 **Skill quality is a gamble** — some work, some are decoration, some are security risks
- 📦 **Multi-step orchestration is manual pain** — calling skills one by one, losing track when things get complex

**Agent Toolchain solves exactly these problems.**

It's not another AI framework. It's a pure file-system Skill OS — zero databases, zero servers, zero daemons. One `~/.ai-skills/` directory, shared by all your agents.

## 🔥 What This System Can Do

### 🏗️ 6-Layer Architecture, One Directory

```
~/.ai-skills/
├── 🏛️ Governance    skill-lint · skill-security-audit · skill-observability
├── 🔗 Orchestration  agent-orchestrator (YAML chains) · scheduled-tasks
├── 🧠 Memory         memory-manager · brain-link · conversation-distiller
├── 📋 Protocol       IO Contracts · MCP Compatible Export
├── ⚡ Capabilities   106+ ready-to-use Skills
└── 🤝 Sharing        symlink → Claude / Codex / Gemini / any Agent
```

### 🛡️ Security That Actually Works

```bash
$ python3 audit.py ~/.ai-skills --all

Total: 106 skills | PASS: 106 | WARN: 0 | CRIT: 0
```

6-dimension static scanning: Credential Leaks · Data Exfiltration · Network Overreach · IO Violations · Reverse API Compliance · Supply Chain

### 🔄 One YAML File, Chain Multiple Skills

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

### 🌐 One-Click MCP Protocol Export

```bash
$ python3 export-mcp.py --stats

Exported: 106 tools (5 with IO schema)
Output: mcp-tools.json (68KB)
```

Make your skills discoverable by any MCP-compatible agent.

## 🚀 Get Started in 5 Minutes

```bash
# 1. Clone
git clone https://github.com/cloud99277/927-agent-toolchain.git
cd 927-agent-toolchain

# 2. Copy skills to the unified repository
cp -r skills/* ~/.ai-skills/

# 3. Create symlink for your agent (pick one or all)
ln -s ~/.ai-skills ~/.claude/skills      # Claude Code
ln -s ~/.ai-skills ~/.codex/skills       # Codex CLI
ln -s ~/.ai-skills ~/.gemini/skills      # Gemini CLI

# 4. Verify
python3 ~/.ai-skills/mcp-export/scripts/export-mcp.py --stats
```

## 📦 Repository Structure

```
927-agent-toolchain/
├── skills/                        # ⭐ Core: All skill source code
│   ├── skill-security-audit/      #   6-dimension security scanner
│   ├── memory-manager/            #   Three-layer memory model
│   ├── agent-orchestrator/        #   YAML chain orchestration
│   ├── skill-observability/       #   Execution logs + monthly reports
│   ├── scheduled-tasks/           #   Two-level scheduling
│   ├── mcp-export/                #   MCP protocol export
│   ├── full-cycle-builder/        #   Quality-gate-driven full lifecycle
│   ├── deep-research/             #   Systematic domain research
│   ├── project-audit/             #   Architectural review
│   ├── design-iteration/          #   Review-driven design iteration
│   ├── code-review/               #   Structured code review
│   └── ...                        #   15 skills total
│
├── docs/                          # Design documents & specifications
│   ├── phase-1-io-contracts/      #   IO contract spec + type-registry
│   ├── phase-2-security-audit/    #   Security audit design
│   ├── phase-3-memory-manager/    #   Memory management design
│   ├── phase-4-orchestrator/      #   Orchestrator design
│   ├── phase-5-observability/     #   Observability design
│   ├── phase-6-scheduler/         #   Scheduler design
│   └── phase-7-mcp-export/        #   MCP export design
│
└── PROJECT.md                     # Top-level project design doc (775+ lines)
```

## ⚙️ Core Design Constraints

| Constraint | Why |
|-----------|-----|
| 🚫 **Zero Infrastructure** | No databases, no servers, no Docker. One directory is everything |
| 📄 **Docs as Protocol** | SKILL.md frontmatter IS the skill's API contract |
| 🔒 **Secure by Default** | No network ports, no hardcoded creds, reverse APIs must carry `danger-` prefix |
| 🤝 **Agent Agnostic** | Not tied to any specific agent — symlinks adapt to all |
| 🏃 **8-Day Rhythm** | Each Phase does exactly one thing. Full project delivered in 8 days |

## 🗺️ The 8-Phase Journey

> This project went from zero to complete in just 8 days. Every Phase's design document is in the `docs/` directory.

| Phase | What Was Built | Key Deliverable |
|-------|---------------|-----------------|
| **0** | Architecture design | 6-layer architecture, 5 design constraints |
| **1** | IO Contracts | Standardized skill input/output format |
| **2** | Security Audit | `audit.py` — 6-dimension scanner |
| **3** | Memory Management | `memory-manager` — three-layer memory model |
| **4** | Chain Orchestration | `agent-orchestrator` — YAML declarative |
| **5** | Observability | `skill-observability` — logs + monthly reports |
| **6** | Scheduled Tasks | `scheduled-tasks` — cron + Agent CLI |
| **7** | MCP Export | `export-mcp.py` — protocol-level compatibility |

## 🙏 Acknowledgments

- [Claude Code](https://docs.anthropic.com/) — Origin of the Skill standard format
- [Fabric](https://github.com/danielmiessler/fabric) — Inspiration for Unix pipe-style orchestration
- [MCP](https://modelcontextprotocol.io/) — Tool discovery protocol

## 📄 License

[MIT License](LICENSE) — Use freely, just give credit.

---

<div align="center">

**Made with ❤️ by [Cloud927](https://github.com/cloud99277)**

*An AI Agent toolchain, built by AI Agents. Yes, it's its own user.*

</div>
