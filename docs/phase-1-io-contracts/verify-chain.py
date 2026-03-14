#!/usr/bin/env python3
"""
verify-chain.py — 验证 skill 编排链的 IO 类型匹配

读取试点 skill 的 SKILL.md frontmatter 中的 io 声明，
验证编排链中相邻 skill 的 output/input 类型是否匹配。

用法：
    python3 verify-chain.py
    python3 verify-chain.py --skills-dir ~/.ai-skills
"""

import os
import sys
import re
import json

# -------------------------------------------------------------------
# 配置
# -------------------------------------------------------------------

DEFAULT_SKILLS_DIR = os.path.expanduser("~/.ai-skills")

# 要验证的编排链
CHAINS = [
    {
        "name": "x-to-markdown → translate → post-to-wechat",
        "skills": [
            "baoyu-danger-x-to-markdown",
            "translate",
            "baoyu-post-to-wechat",
        ],
    },
    {
        "name": "url-to-markdown → translate → post-to-wechat",
        "skills": [
            "baoyu-url-to-markdown",
            "translate",
            "baoyu-post-to-wechat",
        ],
    },
]

# 类型兼容规则（from -> [to]）
COMPATIBILITY_RULES = {
    "markdown_file": ["text"],
    "text": ["markdown_file", "url"],
}


# -------------------------------------------------------------------
# YAML frontmatter 解析（轻量级，不依赖 PyYAML）
# -------------------------------------------------------------------

def parse_frontmatter(filepath):
    """解析 SKILL.md 的 YAML frontmatter，提取 io 字段。
    
    使用简单的行解析，不依赖外部库。
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 提取 frontmatter 块
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None

    fm_text = match.group(1)

    # 检查是否有 io 字段
    if "\nio:" not in f"\n{fm_text}":
        return None

    # 解析 io 块
    io_data = {"input": [], "output": []}
    current_section = None  # "input" or "output"
    current_item = None

    in_io_block = False
    for line in fm_text.split("\n"):
        stripped = line.strip()

        if stripped == "io:":
            in_io_block = True
            continue

        if not in_io_block:
            continue

        # 检测是否离开 io 块（遇到不缩进的非空行）
        if stripped and not line.startswith(" ") and not line.startswith("\t"):
            break

        if stripped == "input:":
            current_section = "input"
            continue
        elif stripped == "output:":
            current_section = "output"
            continue

        if current_section and stripped.startswith("- type:"):
            type_val = stripped.replace("- type:", "").strip()
            current_item = {"type": type_val}
            io_data[current_section].append(current_item)
        elif current_section and current_item and stripped.startswith("description:"):
            current_item["description"] = stripped.replace("description:", "").strip()
        elif current_section and current_item and stripped.startswith("required:"):
            current_item["required"] = stripped.replace("required:", "").strip() == "true"
        elif current_section and current_item and stripped.startswith("path_pattern:"):
            val = stripped.replace("path_pattern:", "").strip().strip('"').strip("'")
            current_item["path_pattern"] = val

    return io_data


def check_type_match(output_type, input_types):
    """检查 output_type 是否匹配 input_types 中的任何一个。
    
    返回 (matched, match_kind, matched_type)
    """
    # 精确匹配
    if output_type in input_types:
        return True, "exact", output_type

    # 兼容匹配
    compatible = COMPATIBILITY_RULES.get(output_type, [])
    for inp_type in input_types:
        if inp_type in compatible:
            return True, "compatible", inp_type

    return False, "none", None


def verify_chain(chain_def, skills_dir):
    """验证一条编排链的 IO 类型匹配。"""
    chain_name = chain_def["name"]
    skill_names = chain_def["skills"]

    print(f"\n{'='*60}")
    print(f"验证编排链: {chain_name}")
    print(f"{'='*60}")

    # 加载所有 skill 的 IO 声明
    skill_ios = {}
    all_found = True

    for skill_name in skill_names:
        skill_path = os.path.join(skills_dir, skill_name, "SKILL.md")
        if not os.path.exists(skill_path):
            print(f"  ❌ skill 不存在: {skill_name}")
            all_found = False
            continue

        io_data = parse_frontmatter(skill_path)
        if io_data is None:
            print(f"  ⚠️  skill 无 IO 声明: {skill_name}")
            all_found = False
            continue

        skill_ios[skill_name] = io_data
        input_types = [i["type"] for i in io_data["input"]]
        output_types = [o["type"] for o in io_data["output"]]
        print(f"  📋 {skill_name}")
        print(f"     input:  {input_types}")
        print(f"     output: {output_types}")

    if not all_found:
        print(f"\n  ❌ 编排链验证失败：部分 skill 缺失或无 IO 声明")
        return False

    # 验证相邻 skill 的 output → input 匹配
    print(f"\n  --- 匹配检查 ---")
    all_matched = True

    for i in range(len(skill_names) - 1):
        current_skill = skill_names[i]
        next_skill = skill_names[i + 1]

        current_output = skill_ios[current_skill]["output"]
        next_input = skill_ios[next_skill]["input"]

        if not current_output:
            print(f"  ❌ {current_skill} 没有声明 output")
            all_matched = False
            continue

        output_type = current_output[0]["type"]
        input_types = [inp["type"] for inp in next_input]

        matched, match_kind, matched_type = check_type_match(output_type, input_types)

        if matched:
            icon = "✅" if match_kind == "exact" else "🔄"
            kind_label = "精确匹配" if match_kind == "exact" else "兼容匹配"
            print(f"  {icon} {current_skill} [{output_type}] → {next_skill} [{matched_type}] ({kind_label})")
        else:
            print(f"  ❌ {current_skill} [{output_type}] → {next_skill} {input_types} (类型不匹配！)")
            all_matched = False

    if all_matched:
        print(f"\n  ✅ 编排链匹配通过")
    else:
        print(f"\n  ❌ 编排链匹配失败")

    return all_matched


def main():
    skills_dir = DEFAULT_SKILLS_DIR

    # 支持 --skills-dir 参数
    if "--skills-dir" in sys.argv:
        idx = sys.argv.index("--skills-dir")
        if idx + 1 < len(sys.argv):
            skills_dir = sys.argv[idx + 1]

    print(f"Skills 目录: {skills_dir}")
    print(f"验证 {len(CHAINS)} 条编排链")

    results = []
    for chain in CHAINS:
        result = verify_chain(chain, skills_dir)
        results.append(result)

    # 总结
    print(f"\n{'='*60}")
    print(f"总结")
    print(f"{'='*60}")

    passed = sum(1 for r in results if r)
    total = len(results)

    for i, chain in enumerate(CHAINS):
        icon = "✅" if results[i] else "❌"
        print(f"  {icon} {chain['name']}")

    print(f"\n  {passed}/{total} 条链通过")

    if passed == total:
        print(f"\n🎉 所有编排链验证通过！Phase 1 IO 契约验收标准 V3 达成。")
        sys.exit(0)
    else:
        print(f"\n⚠️  部分编排链未通过，请检查上方详细信息。")
        sys.exit(1)


if __name__ == "__main__":
    main()
