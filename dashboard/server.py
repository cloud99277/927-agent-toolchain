#!/usr/bin/env python3
"""Agent Toolchain Dashboard — Zero-dependency local web server.

Provides a visual CRUD interface for managing ~/.ai-skills/ skill repository.
Uses only Python stdlib (http.server + json + pathlib). No Flask, no npm.

Usage:
    python3 dashboard/server.py [--port 8927] [--skills-dir ~/.ai-skills]
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import mimetypes
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote

# ── Config ──────────────────────────────────────────────────────────────

DEFAULT_PORT = 8927
DEFAULT_SKILLS_DIR = Path.home() / ".ai-skills"
STATIC_DIR = Path(__file__).parent / "static"

# Directories to skip when listing skills
SKIP_DIRS = {".git", ".system", ".logs", "__pycache__", ".github"}
SKIP_FILES = {".gitignore", ".env", "README.md", "SKILLS-SYSTEM-REVIEW.md"}


# ── Helpers ─────────────────────────────────────────────────────────────

def parse_skill_md(skill_dir: Path) -> dict:
    """Parse SKILL.md frontmatter and body."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return {"name": skill_dir.name, "description": "", "body": "", "has_skill_md": False}

    text = skill_md.read_text(encoding="utf-8", errors="replace")
    result = {
        "name": skill_dir.name,
        "has_skill_md": True,
        "description": "",
        "frontmatter": {},
        "body": text,
    }

    # Parse YAML frontmatter
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.DOTALL)
    if fm_match:
        fm_text, body = fm_match.groups()
        result["body"] = text  # Keep full text for editing
        # Simple YAML-like parsing (no PyYAML dependency)
        for line in fm_text.split("\n"):
            line = line.strip()
            if ":" in line and not line.startswith("#"):
                key, _, val = line.partition(":")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                result["frontmatter"][key] = val
        result["description"] = result["frontmatter"].get("description", "")
        # If description is multi-line (starts with >), grab from body
        if result["description"] in (">", "|", ">-"):
            desc_lines = []
            in_desc = False
            for line in fm_text.split("\n"):
                if line.strip().startswith("description:"):
                    in_desc = True
                    continue
                if in_desc:
                    if line.startswith("  ") or line.startswith("\t"):
                        desc_lines.append(line.strip())
                    else:
                        break
            result["description"] = " ".join(desc_lines)

    return result


def get_skill_info(skill_dir: Path) -> dict:
    """Get comprehensive info about a skill."""
    parsed = parse_skill_md(skill_dir)

    # Count files and check for scripts
    file_count = sum(1 for _ in skill_dir.rglob("*") if _.is_file())
    has_scripts = (skill_dir / "scripts").is_dir()
    has_references = (skill_dir / "references").is_dir()

    # Get modification time
    try:
        mtime = max(f.stat().st_mtime for f in skill_dir.rglob("*") if f.is_file())
        modified = datetime.fromtimestamp(mtime).isoformat()
    except (ValueError, OSError):
        modified = None

    # Determine category based on name patterns
    name = skill_dir.name
    if name.startswith("baoyu-") or name in ("translate", "article-writing", "content-for-x", "content-engine", "post-to-x"):
        category = "content"
    elif name in ("full-cycle-builder", "deep-research", "project-audit", "design-iteration",
                   "code-review", "project-planner", "project-retrospective"):
        category = "methodology"
    elif name in ("agent-orchestrator", "skill-security-audit", "skill-observability",
                   "memory-manager", "scheduled-tasks", "skill-lint", "skill-stocktake",
                   "skill-creator", "find-skills", "mcp-export", "upload-to-github"):
        category = "infrastructure"
    elif name in ("brain-link", "conversation-distiller", "sync-to-brain", "history-reader",
                   "history-chat", "strategic-compact", "iterative-retrieval",
                   "remembering-conversations", "continuous-learning-v2"):
        category = "memory"
    elif any(kw in name for kw in ("patterns", "testing", "tdd", "verification", "security",
                                     "coding-standards", "docker", "deployment", "e2e", "eval")):
        category = "dev-patterns"
    else:
        category = "tools"

    return {
        "name": name,
        "description": parsed["description"][:200],
        "has_skill_md": parsed["has_skill_md"],
        "has_scripts": has_scripts,
        "has_references": has_references,
        "file_count": file_count,
        "modified": modified,
        "category": category,
    }


def get_execution_stats(skills_dir: Path) -> dict:
    """Parse execution logs for usage statistics."""
    log_file = skills_dir / ".logs" / "executions.jsonl"
    stats = {"total_executions": 0, "by_skill": {}, "by_agent": {}, "recent": []}

    if not log_file.exists():
        return stats

    try:
        lines = log_file.read_text(encoding="utf-8", errors="replace").strip().split("\n")
        for line in lines:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                skill = entry.get("skill_name", "unknown")
                agent = entry.get("agent", "unknown")
                stats["total_executions"] += 1
                stats["by_skill"][skill] = stats["by_skill"].get(skill, 0) + 1
                stats["by_agent"][agent] = stats["by_agent"].get(agent, 0) + 1
                stats["recent"].append({
                    "skill": skill,
                    "agent": agent,
                    "status": entry.get("status", "unknown"),
                    "timestamp": entry.get("timestamp", ""),
                })
            except json.JSONDecodeError:
                continue
        # Keep only last 20 recent entries
        stats["recent"] = stats["recent"][-20:][::-1]
    except Exception:
        pass

    return stats


def get_repo_status(path: str) -> dict:
    """Get git status for a repository."""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-1"],
            capture_output=True, text=True, cwd=path, timeout=5
        )
        last_commit = result.stdout.strip() if result.returncode == 0 else "N/A"

        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, cwd=path, timeout=5
        )
        dirty = len(result.stdout.strip().split("\n")) if result.stdout.strip() else 0

        result = subprocess.run(
            ["git", "remote", "-v"],
            capture_output=True, text=True, cwd=path, timeout=5
        )
        has_remote = "origin" in result.stdout

        return {
            "path": path,
            "last_commit": last_commit,
            "dirty_files": dirty,
            "has_remote": has_remote,
            "status": "clean" if dirty == 0 else "dirty",
        }
    except Exception as e:
        return {"path": path, "error": str(e)}


# ── Request Handler ─────────────────────────────────────────────────────

class DashboardHandler(BaseHTTPRequestHandler):
    skills_dir = DEFAULT_SKILLS_DIR

    def log_message(self, format, *args):
        """Override to reduce log noise."""
        if "/api/" in str(args[0]) if args else True:
            super().log_message(format, *args)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))

    def send_error_json(self, status, message):
        self.send_json({"error": message}, status)

    def read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body) if body else {}

    def serve_static(self, filepath):
        """Serve a static file."""
        if not filepath.exists() or not filepath.is_file():
            self.send_error(404, "File not found")
            return
        mime, _ = mimetypes.guess_type(str(filepath))
        mime = mime or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", f"{mime}; charset=utf-8" if "text" in (mime or "") else mime)
        self.end_headers()
        self.wfile.write(filepath.read_bytes())

    # ── Routes ──────────────────────────────────────────────────────

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        # Static files
        if path == "/" or path == "/index.html":
            self.serve_static(STATIC_DIR / "index.html")
        elif path.startswith("/static/"):
            rel = path[len("/static/"):]
            self.serve_static(STATIC_DIR / rel)

        # API: List all skills
        elif path == "/api/skills":
            skills = []
            for d in sorted(self.skills_dir.iterdir()):
                if d.is_dir() and d.name not in SKIP_DIRS and not d.name.startswith("."):
                    skills.append(get_skill_info(d))
            self.send_json({"skills": skills, "total": len(skills)})

        # API: Get skill detail
        elif path.startswith("/api/skills/") and path.count("/") == 3:
            name = path.split("/")[3]
            skill_path = self.skills_dir / name
            if not skill_path.exists() or not skill_path.is_dir():
                self.send_error_json(404, f"Skill '{name}' not found")
                return
            info = get_skill_info(skill_path)
            parsed_md = parse_skill_md(skill_path)
            info["content"] = parsed_md["body"]
            info["frontmatter"] = parsed_md.get("frontmatter", {})
            # List all files
            files = []
            for f in sorted(skill_path.rglob("*")):
                if f.is_file():
                    rel = str(f.relative_to(skill_path))
                    files.append({"path": rel, "size": f.stat().st_size})
            info["files"] = files
            self.send_json(info)

        # API: Get file content within a skill
        elif path.startswith("/api/skills/") and "/file/" in path:
            parts = path.split("/file/", 1)
            name = parts[0].split("/")[3]
            file_rel = parts[1]
            file_path = self.skills_dir / name / file_rel
            if not file_path.exists() or not file_path.is_file():
                self.send_error_json(404, "File not found")
                return
            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                self.send_json({"path": file_rel, "content": content})
            except Exception as e:
                self.send_error_json(500, str(e))

        # API: Execution stats
        elif path == "/api/stats":
            self.send_json(get_execution_stats(self.skills_dir))

        # API: Repository status
        elif path == "/api/repos":
            repos = {
                "skills_repo": get_repo_status(str(self.skills_dir)),
                "toolchain_repo": get_repo_status(
                    str(Path.home() / "projects" / "agent-toolchain")
                ),
            }
            self.send_json(repos)

        else:
            self.send_error_json(404, "Not found")

    def do_POST(self):
        path = unquote(urlparse(self.path).path)

        # API: Create new skill
        if path == "/api/skills":
            data = self.read_body()
            name = data.get("name", "").strip()
            if not name:
                self.send_error_json(400, "Skill name is required")
                return
            if not re.match(r"^[a-z0-9][a-z0-9-]*$", name):
                self.send_error_json(400, "Invalid name. Use lowercase, numbers, hyphens only.")
                return
            skill_path = self.skills_dir / name
            if skill_path.exists():
                self.send_error_json(409, f"Skill '{name}' already exists")
                return

            description = data.get("description", "")
            content = data.get("content", "")
            if not content:
                content = f"""---
name: {name}
description: {description}
---

# {name}

{description}
"""
            skill_path.mkdir(parents=True)
            (skill_path / "SKILL.md").write_text(content, encoding="utf-8")

            # Create optional directories
            if data.get("create_scripts"):
                (skill_path / "scripts").mkdir()
            if data.get("create_references"):
                (skill_path / "references").mkdir()

            self.send_json({"message": f"Skill '{name}' created", "name": name}, 201)

        # API: Git commit + push
        elif path == "/api/repos/sync":
            data = self.read_body()
            repo = data.get("repo", "skills")
            repo_path = str(self.skills_dir) if repo == "skills" else str(
                Path.home() / "projects" / "agent-toolchain"
            )
            message = data.get("message", f"dashboard: sync at {datetime.now().isoformat()}")
            try:
                subprocess.run(["git", "add", "-A"], cwd=repo_path, check=True, timeout=10)
                result = subprocess.run(
                    ["git", "commit", "-m", message],
                    cwd=repo_path, capture_output=True, text=True, timeout=10
                )
                if result.returncode != 0 and "nothing to commit" in result.stdout:
                    self.send_json({"message": "Nothing to commit", "status": "clean"})
                    return
                subprocess.run(["git", "push"], cwd=repo_path, check=True, timeout=30)
                self.send_json({"message": "Synced successfully", "status": "pushed"})
            except subprocess.CalledProcessError as e:
                self.send_error_json(500, f"Git error: {e}")
            except Exception as e:
                self.send_error_json(500, str(e))

        else:
            self.send_error_json(404, "Not found")

    def do_PUT(self):
        path = unquote(urlparse(self.path).path)

        # API: Update skill SKILL.md
        if path.startswith("/api/skills/") and path.count("/") == 3:
            name = path.split("/")[3]
            skill_path = self.skills_dir / name
            if not skill_path.exists():
                self.send_error_json(404, f"Skill '{name}' not found")
                return
            data = self.read_body()
            content = data.get("content")
            if content is None:
                self.send_error_json(400, "Content is required")
                return
            (skill_path / "SKILL.md").write_text(content, encoding="utf-8")
            self.send_json({"message": f"Skill '{name}' updated"})

        # API: Update a specific file within a skill
        elif path.startswith("/api/skills/") and "/file/" in path:
            parts = path.split("/file/", 1)
            name = parts[0].split("/")[3]
            file_rel = parts[1]
            file_path = self.skills_dir / name / file_rel
            if not file_path.parent.exists():
                file_path.parent.mkdir(parents=True)
            data = self.read_body()
            content = data.get("content", "")
            file_path.write_text(content, encoding="utf-8")
            self.send_json({"message": f"File '{file_rel}' updated"})

        else:
            self.send_error_json(404, "Not found")

    def do_DELETE(self):
        path = unquote(urlparse(self.path).path)

        if path.startswith("/api/skills/") and path.count("/") == 3:
            name = path.split("/")[3]
            skill_path = self.skills_dir / name
            if not skill_path.exists():
                self.send_error_json(404, f"Skill '{name}' not found")
                return
            shutil.rmtree(skill_path)
            self.send_json({"message": f"Skill '{name}' deleted"})

        else:
            self.send_error_json(404, "Not found")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


# ── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agent Toolchain Dashboard")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port (default: {DEFAULT_PORT})")
    parser.add_argument("--skills-dir", type=str, default=str(DEFAULT_SKILLS_DIR),
                        help=f"Skills directory (default: {DEFAULT_SKILLS_DIR})")
    args = parser.parse_args()

    DashboardHandler.skills_dir = Path(args.skills_dir)

    if not DashboardHandler.skills_dir.exists():
        print(f"Error: Skills directory not found: {args.skills_dir}", file=sys.stderr)
        sys.exit(1)

    server = HTTPServer(("0.0.0.0", args.port), DashboardHandler)
    url = f"http://localhost:{args.port}"
    print(f"""
╔══════════════════════════════════════════════════════╗
║         🛠️  Agent Toolchain Dashboard                ║
╠══════════════════════════════════════════════════════╣
║  URL:        {url:<39} ║
║  Skills:     {str(DashboardHandler.skills_dir):<39} ║
║  Press Ctrl+C to stop                                ║
╚══════════════════════════════════════════════════════╝
""")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✋ Dashboard stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
