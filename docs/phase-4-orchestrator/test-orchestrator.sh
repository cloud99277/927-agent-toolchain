#!/bin/bash
# Phase 4 端到端验收脚本
# 来源：PHASE-4.md T7 设计
set -e
SKILLS_DIR="${HOME}/.ai-skills"
RUN_CHAIN="${SKILLS_DIR}/agent-orchestrator/scripts/run-chain.py"
CHAINS_DIR="${SKILLS_DIR}/agent-orchestrator/chains"
AUDIT_PY="${SKILLS_DIR}/skill-security-audit/scripts/audit.py"
VALIDATE_PY="${SKILLS_DIR}/.system/skill-creator/scripts/quick_validate.py"

echo "═══ Step 1: validate — translate-tweet-publish ═══"
python3 "$RUN_CHAIN" validate "$CHAINS_DIR/translate-tweet-publish.yaml" --skills-dir "$SKILLS_DIR"
echo ""

echo "═══ Step 2: validate — url-translate-publish ═══"
python3 "$RUN_CHAIN" validate "$CHAINS_DIR/url-translate-publish.yaml" --skills-dir "$SKILLS_DIR"
echo ""

echo "═══ Step 3: validate — lint-and-search (兼容匹配) ═══"
python3 "$RUN_CHAIN" validate "$CHAINS_DIR/lint-and-search.yaml" --skills-dir "$SKILLS_DIR"
echo ""

echo "═══ Step 4: plan — 变量替换 ═══"
python3 "$RUN_CHAIN" plan "$CHAINS_DIR/translate-tweet-publish.yaml" --var URL=https://x.com/test/123 --skills-dir "$SKILLS_DIR"
echo ""

echo "═══ Step 5: list ═══"
python3 "$RUN_CHAIN" list --chains-dir "$CHAINS_DIR"
echo ""

echo "═══ Step 6: 错误处理 — 不存在的文件 ═══"
python3 "$RUN_CHAIN" validate nonexistent.yaml 2>&1 || true
echo ""

echo "═══ Step 7: quick_validate.py ═══"
python3 "$VALIDATE_PY" "$SKILLS_DIR/agent-orchestrator"
echo ""

echo "═══ Step 8: audit.py ═══"
python3 "$AUDIT_PY" "$SKILLS_DIR/agent-orchestrator"
echo ""

echo "═══ 全部验收通过 ═══"
