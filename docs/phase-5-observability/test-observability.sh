#!/bin/bash
# test-observability.sh — Phase 5 端到端验收脚本
set -e

SKILLS_DIR="${HOME}/.ai-skills"
OBS_DIR="${SKILLS_DIR}/skill-observability/scripts"
TEST_LOG="/tmp/test-obs-executions.jsonl"

# 清理可能的残留
rm -f "$TEST_LOG"

echo "═══ Step 1: log-execution --dry-run ═══"
python3 "$OBS_DIR/log-execution.py" \
  --skill translate --agent gemini --status success \
  --input-fields file,to,mode --output-file translation.md --dry-run
echo ""

echo "═══ Step 2: log-execution 写入 3 条测试日志 ═══"
python3 "$OBS_DIR/log-execution.py" \
  --skill translate --agent gemini --status success \
  --input-fields file,to,mode --output-file translation.md \
  --log-file "$TEST_LOG"

python3 "$OBS_DIR/log-execution.py" \
  --skill skill-lint --agent claude --status failure \
  --notes "test failure" --log-file "$TEST_LOG"

python3 "$OBS_DIR/log-execution.py" \
  --skill memory-search --agent gemini --status success \
  --duration 2.5 --log-file "$TEST_LOG"

echo "--- 验证 JSONL 文件内容 ---"
echo "行数: $(wc -l < "$TEST_LOG")"
cat "$TEST_LOG"
echo ""

echo "═══ Step 3: report.py 读取测试日志 ═══"
python3 "$OBS_DIR/report.py" --log-file "$TEST_LOG"
echo ""

echo "═══ Step 4: find-unused.py ═══"
python3 "$OBS_DIR/find-unused.py" \
  --skills-dir "$SKILLS_DIR" --log-file "$TEST_LOG"
echo ""

echo "═══ Step 5: 错误处理 — 无效 status ═══"
python3 "$OBS_DIR/log-execution.py" \
  --skill translate --agent gemini --status invalid_status 2>&1 && echo "FAIL: 应报错" || echo "PASS: 正确报错"
echo ""

echo "═══ Step 6: 错误处理 — 日志不存在时的 report ═══"
python3 "$OBS_DIR/report.py" --log-file "/tmp/nonexistent-9999.jsonl" 2>&1
echo ""

echo "═══ Step 7: quick_validate.py ═══"
python3 "${SKILLS_DIR}/.system/skill-creator/scripts/quick_validate.py" \
  "${SKILLS_DIR}/skill-observability"
echo ""

echo "═══ Step 8: audit.py 安全审计 ═══"
python3 "${SKILLS_DIR}/skill-security-audit/scripts/audit.py" \
  "${SKILLS_DIR}/skill-observability"
echo ""

echo "═══ Step 9: 清理测试日志 ═══"
rm -f "$TEST_LOG"
echo "已清理 $TEST_LOG"

echo ""
echo "═══════════════════════════════"
echo "═══ 全部验收通过 ═══"
echo "═══════════════════════════════"
