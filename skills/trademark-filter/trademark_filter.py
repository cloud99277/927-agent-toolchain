import pandas as pd
import json
import re
import argparse
import os

# 默认关键词：大气、瑞气、广阔、美好联想
DEFAULT_GRAND_KEYWORDS = ['天', '宇', '盛', '瑞', '弘', '尊', '嘉', '坤', '乾', '万', '亿', '极', '泰', '恒', '龙', '凤', '华', '星', '海', '悦', '金', '诺', '达', '博', '雅', '云', '沁', '禾', '灵', '凡']

def is_simple(name):
    if not name: return False
    # 2-3个汉字（简单核心）
    if re.match(r'^[\u4e00-\u9fa5]{2,3}$', name):
        return True
    # 3-6个英文字母
    if re.match(r'^[A-Z]{3,6}$', name):
        return True
    return False

def calculate_score(name, keywords):
    score = 0
    if not name: return 0
    # 关键词加分
    for kw in keywords:
        if kw in name:
            score += 2
    # 2个字通常比3个字更好记
    if len(name) == 2:
        score += 1
    return score

def main():
    parser = argparse.ArgumentParser(description="Trademark Filtering Tool")
    parser.add_argument("--input", required=True, help="Input file path (.json or .xlsx)")
    parser.add_argument("--output", required=True, help="Output file path (.json)")
    parser.add_argument("--top_n", type=int, default=100, help="Number of top results to return")
    args = parser.parse_args()

    # 读取数据
    if args.input.endswith('.json'):
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
        # 兼容字段名
        df = pd.DataFrame(data)
        if 'name' in df.columns:
            df = df.rename(columns={'name': '商标名', 'regNo': '注册号', 'category': '类别', 'goodsNum': '产品/服务'})
    elif args.input.endswith('.xlsx'):
        df = pd.read_excel(args.input)
    else:
        print("Error: Unsupported file format.")
        return

    # 检查核心列
    if '商标名' not in df.columns:
        print(f"Error: Column '商标名' not found. Available columns: {df.columns.tolist()}")
        return

    # 转换商标名为字符串
    df['商标名'] = df['商标名'].astype(str)

    # 筛选简单项
    df_filtered = df[df['商标名'].apply(is_simple)].copy()

    # 计算分数
    df_filtered['score'] = df_filtered['商标名'].apply(lambda x: calculate_score(x, DEFAULT_GRAND_KEYWORDS))

    # 排序：分数高 -> 长度短
    df_filtered['name_len'] = df_filtered['商标名'].apply(len)
    df_sorted = df_filtered.sort_values(by=['score', 'name_len'], ascending=[False, True])

    # 取前 N 个
    result = df_sorted.head(args.top_n)

    # 保存结果
    result_json = result.to_dict(orient='records')
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(result_json, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(df)} items. Filtered to {len(df_filtered)}. Top {args.top_n} saved to {args.output}")

if __name__ == "__main__":
    main()
