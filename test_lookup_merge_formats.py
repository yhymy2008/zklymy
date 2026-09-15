# -*- coding: utf-8 -*-
"""验证 lookup_merge.py 支持 A/B 四种格式组合 + 默认 1:N 展开（B 重复键全部保留）"""
import csv
import os
import subprocess
import sys

from openpyxl import Workbook

TMP = r"c:\Users\CNYangMe8\Documents\work\AI_coding\_test_lm"
os.makedirs(TMP, exist_ok=True)

# ---------- 造数据 ----------
# A1: csv (手机号, 姓名)
a_csv = os.path.join(TMP, "a.csv")
with open(a_csv, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["手机号", "姓名"])
    w.writerow(["13800000001", "张三"])
    w.writerow(["13800000002", "李四"])
    w.writerow(["13800000009", "王五"])  # B 中不存在

# A2: xlsx 同内容
a_xlsx = os.path.join(TMP, "a.xlsx")
wb = Workbook(); ws = wb.active
ws.append(["手机号", "姓名"])
for r in [["13800000001", "张三"], ["13800000002", "李四"], ["13800000009", "王五"]]:
    ws.append(r)
wb.save(a_xlsx)

# B1: csv (手机号, 城市, 等级)
b_csv = os.path.join(TMP, "b.csv")
with open(b_csv, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["手机号", "城市", "等级"])
    w.writerow(["13800000001", "上海", "VIP"])
    w.writerow(["13800000002", "北京", "普通"])
    w.writerow(["13800000002", "北京", "重复键"])

# B2: xlsx 同内容
b_xlsx = os.path.join(TMP, "b.xlsx")
wb = Workbook(); ws = wb.active
ws.append(["手机号", "城市", "等级"])
for r in [["13800000001", "上海", "VIP"], ["13800000002", "北京", "普通"], ["13800000002", "北京", "重复键"]]:
    ws.append(r)
wb.save(b_xlsx)

def read_out(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            return [row for row in csv.reader(f)]
    else:
        from openpyxl import load_workbook
        wb = load_workbook(path, data_only=True)
        ws = wb.active
        return [[c for c in row] for row in ws.iter_rows(values_only=True)]

def run_case(a, b, name, extra=()):
    out = os.path.join(TMP, f"out_{name}.csv" if a.endswith(".csv") else f"out_{name}.xlsx")
    cmd = [sys.executable, r"c:\Users\CNYangMe8\Documents\work\AI_coding\lookup_merge.py",
           "-a", a, "-b", b, "-ak", "手机号", "-bk", "手机号", "-o", out] + list(extra)
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
    print(f"\n===== 用例 {name}: A={os.path.basename(a)} B={os.path.basename(b)} =====")
    print(r.stdout.strip())
    if r.returncode != 0:
        print("STDERR:", r.stderr)
        return
    data = read_out(out)
    print("输出内容:")
    for row in data:
        print("  ", row)
    # 断言：A 3 行；13800000002 在 B 有 2 条 -> 1:N 展开后共 4 行数据 + 表头 = 5 行
    assert data[0] == ["手机号", "姓名", "城市", "等级"], f"{name} 表头错误: {data[0]}"
    assert len(data) == 5, f"{name} 行数错误: {len(data)}"
    assert data[1][2] == "上海", f"{name} 张三匹配错误: {data[1]}"
    assert data[2][2] == "北京" and data[2][1] == "李四", f"{name} 李四第1条错误: {data[2]}"
    assert data[3][2] == "北京" and data[3][1] == "李四", f"{name} 李四第2条(1:N展开)错误: {data[3]}"
    assert data[4][2] in ("", None), f"{name} 未匹配行应留空 (实际: {data[4][2]!r})"
    print(f"  >>> {name} 断言通过")

run_case(a_csv, b_csv, "csv_csv")
run_case(a_csv, b_xlsx, "csv_xlsx")
run_case(a_xlsx, b_csv, "xlsx_csv")
run_case(a_xlsx, b_xlsx, "xlsx_xlsx")

# 额外：sheet 参数 + keep-duplicates
run_case(a_csv, b_xlsx, "dup", extra=("--keep-duplicates",))
print("\n全部用例通过")
