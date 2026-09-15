# -*- coding: utf-8 -*-
"""对比冲突 Oneid 的多行内容：完全重复 还是 不同业务记录"""
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
data_rows = rows[1:]

groups = defaultdict(list)
for r_idx, row in enumerate(data_rows, start=2):
    if all(v is None for v in row):
        continue
    raw = row[key_idx - 1] if key_idx <= len(row) else None
    groups[normalize_key(raw)].append((r_idx, row))

dup = {k: v for k, v in groups.items() if len(v) > 1}
print(f"重复键 {len(dup)} 个")

# 分析冲突行差异
fully_same = 0      # 所有列完全相同（导出重复）
partial_same = 0    # 除键列外有差异（同客户多条业务）
key_only = 0        # 仅键列相同，其它列全空
examples_full = []
examples_partial = []
for norm, items in sorted(dup.items(), key=lambda x: -len(x[1]))[:50]:
    rows_of_key = [r for _, r in items]
    ref = rows_of_key[0]
    diffs = []
    for r in rows_of_key[1:]:
        diff_cols = [i for i in range(max(len(ref), len(r))) if (ref[i] if i < len(ref) else None) != (r[i] if i < len(r) else None)]
        diffs.append(diff_cols)
    non_key_vals = [r for r in rows_of_key if any(v not in (None, "") for v in r[:key_idx - 1] + r[key_idx:])]
    if not non_key_vals:
        key_only += 1
    elif all(len(d) == 0 for d in diffs):
        fully_same += 1
        if len(examples_full) < 3:
            examples_full.append((norm, items))
    else:
        partial_same += 1
        if len(examples_partial) < 3:
            examples_partial.append((norm, items, diffs))

print(f"\n统计（前50个冲突键中）：")
print(f"  仅键列有值、其它全空: {key_only}")
print(f"  多行完全相同（导出重复）: {fully_same}")
print(f"  同键多行内容不同（真实多业务）: {partial_same}")

print("\n=== 完全重复示例 ===")
for norm, items in examples_full:
    print(f"键 {norm}: 行 {[i[0] for i in items]}")
    for _, r in items[:2]:
        print(f"   {[repr(c)[:18] if c is not None else None for c in r[:14]]}")

print("\n=== 内容不同的示例（列差异） ===")
for norm, items, diffs in examples_partial:
    print(f"键 {norm}: 行 {[i[0] for i in items]}, 差异列 {diffs}")
    for _, r in items[:2]:
        print(f"   {[repr(c)[:18] if c is not None else None for c in r[:14]]}")
