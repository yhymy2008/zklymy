# -*- coding: utf-8 -*-
"""诊断 out_Oneid_md5.xlsx 的 '外呼异常名单' 表 Oneid 键冲突"""
import os
import sys
from collections import defaultdict

sys.path.insert(0, r"c:\Users\CNYangMe8\Documents\work\AI_coding")
from diagnose_dup import load_rows, normalize_key

FILE = r"c:\Users\CNYangMe8\Documents\work\AI_coding\out_Oneid_md5.xlsx"
SHEET = "外呼异常名单"
KEY = "Oneid"

rows = load_rows(FILE, SHEET)
header = rows[0]
key_idx = header.index(KEY) + 1
print(f"工作表 {SHEET}: 共 {len(rows) - 1} 行, 键列第 {key_idx} 列 {header[key_idx-1]!r}")
print(f"第2行(可能是英文字段名): {rows[1][key_idx-1]!r}")
print(f"第3行(首条数据): {rows[2][key_idx-1]!r}")

groups = defaultdict(list)
raw_types = defaultdict(list)
for r_idx, row in enumerate(rows[1:], start=2):
    if all(v is None for v in row):
        continue
    raw = row[key_idx - 1] if key_idx <= len(row) else None
    norm = normalize_key(raw)
    groups[norm].append((raw, r_idx))
    raw_types[type(raw).__name__ if raw is not None else "None"].append(raw)  # noqa

dup = {k: v for k, v in groups.items() if len(v) > 1}
print(f"\n有效键 {len(groups)} 个, 归一化后重复键 {len(dup)} 个")
print("原始值类型分布:", {k: len(v) for k, v in raw_types.items()})

if dup:
    print("\n--- 冲突键示例 ---")
    for norm, items in sorted(dup.items(), key=lambda x: -len(x[1]))[:5]:
        raws = [it[0] for it in items]
        print(f"键 {norm!r} 共 {len(items)} 行, 原始 repr 差异: {set(repr(r) for r in raws)}")
        for raw, r_idx in items[:4]:
            print(f"   第{r_idx}行 raw={raw!r} type={type(raw).__name__}")
else:
    print("\n未发现归一化冲突。Oneid 键在该表是唯一的。")
