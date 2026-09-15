# -*- coding: utf-8 -*-
"""
诊断 B 文件查找键的重复/冲突原因：
1. 统计原始键与归一化键（与 lookup_merge.py 相同逻辑）
2. 找出归一化后合并的键，并显示每条原始键的 repr、类型、样本行
3. 打印冲突摘要，便于判断是"真实重复"还是"归一化误合并"

用法：
    python diagnose_dup.py -b <B文件> -bk <查找键>
"""
import argparse
import csv
import os
import re
import sys
from collections import defaultdict

try:
    from openpyxl import load_workbook
except ImportError:
    sys.exit("缺少依赖 openpyxl")


def parse_column(col, header_row):
    col = str(col).strip()
    for idx, cell in enumerate(header_row, start=1):
        if cell is not None and str(cell).strip() == col:
            return idx
    if re.fullmatch(r"[A-Za-z]{1,3}", col):
        from openpyxl.utils import column_index_from_string
        return column_index_from_string(col.upper())
    if col.isdigit():
        return int(col)
    sys.exit(f"未找到列：{col}")


def normalize_key(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return str(value).strip()


def load_rows(path, sheet=None):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        for enc in ("utf-8-sig", "gbk", "utf-8"):
            try:
                with open(path, "r", encoding=enc, newline="") as f:
                    return list(csv.reader(f))
            except UnicodeDecodeError:
                continue
        sys.exit("CSV 编码无法识别")
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet] if sheet else wb.active
    return [[cell.value for cell in row] for row in ws.iter_rows()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-b", "--b-file", required=True, help="B 文件路径")
    ap.add_argument("-bk", "--b-key", required=True, help="B 查找键列：列名/列字母/列序号")
    ap.add_argument("--sheet", default=None, help="B 文件工作表（xlsx 时）")
    ap.add_argument("-n", "--max-show", type=int, default=5, help="每个冲突键最多显示的行数")
    args = ap.parse_args()

    rows = load_rows(args.b_file, args.sheet)
    header = rows[0]
    key_idx = parse_column(args.b_key, header)
    print(f"B 文件共 {len(rows) - 1} 行数据，查找列：第 {key_idx} 列 {header[key_idx - 1]!r}\n")

    # 原始键 -> 归一化键
    raw_keys = []
    groups = defaultdict(list)   # 归一化键 -> [(raw, row_idx, row)]
    for r_idx, row in enumerate(rows[1:], start=2):
        if all(v is None for v in row):
            continue
        raw = row[key_idx - 1] if key_idx <= len(row) else None
        norm = normalize_key(raw)
        raw_keys.append((raw, norm, r_idx, row))
        groups[norm].append((raw, r_idx, row))

    dup = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"有效键 {len(groups)} 个，其中归一化后出现重复的键 {len(dup)} 个\n")

    if not dup:
        print("未发现归一化键冲突。若仍出现 1:N 展开，说明 B 文件中该键确实有真实重复记录，请检查 B 数据本身。")
        return

    for i, (norm, items) in enumerate(sorted(dup.items(), key=lambda x: -len(x[1])), 1):
        raw_types = defaultdict(list)
        for raw, _, _ in items:
            raw_types[type(raw).__name__ + ("(文本)" if isinstance(raw, str) else "")].append(raw)
        type_desc = ", ".join(f"{t} x{len(v)}" for t, v in raw_types.items())
        print(f"=== 冲突 {i}: 归一化键 {norm!r}，共 {len(items)} 行（原始类型: {type_desc}）")
        for raw, r_idx, row in items[: args.max_show]:
            vals = ", ".join(repr(c)[:40] for c in row[:8])
            print(f"    第 {r_idx} 行  raw={raw!r}  ->  {vals}")
        if len(items) > args.max_show:
            print(f"    ... 其余 {len(items) - args.max_show} 行省略")
        print()


if __name__ == "__main__":
    main()
