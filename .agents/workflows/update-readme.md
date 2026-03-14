---
description: How to safely update repository documentation (READMEs) avoiding translation drift
---

# Update README Workflow

When updating documentation or modifying a `README` file in this repository or the `927-ai-skills` repository, you MUST follow these steps to ensure bilingual consistency. We maintain both Simplified Chinese (`README.md`) and English (`README_EN.md`) versions.

## Steps

1. **Verify Existing Files**:
   Use `list_dir` to confirm the presence of both `README.md` and `README_EN.md` in the target repository root.
   
2. **Read Both Versions**:
   Use `view_file` to read the current contents of BOTH language files so you understand how sections map to each other.

3. **Plan the Changes**:
   Determine exactly what needs to be added, changed, or removed in both languages.

4. **Apply Chinese Updates First**:
   Use `multi_replace_file_content` or `replace_file_content` to apply your planned changes to `README.md` (Chinese).

5. **Apply English Updates Immediately**:
   Use `multi_replace_file_content` or `replace_file_content` to apply the EXACT SAME logical changes, translated accurately, to `README_EN.md` (English).
   
6. **Verify Parity**:
   Check if the structure, links, bullet points, and semantics match precisely between the two versions. `[简体中文](README.md) | [English](README_EN.md)` links must remain intact at the top.

7. **Commit Changes**:
   Once BOTH files are updated, commit them together utilizing the repository's git norms.
