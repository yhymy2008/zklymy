# -*- coding: utf-8 -*-
"""验证 lookup_merge.py 新功能：1:N 展开 + event_time-buytime 时间差列"""
import csv
import os
import subprocess
import sys

TMP = r"c:\Users\CNYangMe8\Documents\work\AI_coding\_test_lm"
SCRIPT = r"c:\Users\CNYangMe8\Documents\work\AI_coding\lookup_merge.py"
OUT = os.path.join(TMP, "out_time.csv")


def read_out(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return [row for row in csv.reader(f)]


cmd = [sys.executable, SCRIPT,
       "-a", os.path.join(TMP, "a_time.csv"),
       "-b", os.path.join(TMP, "b_time.csv"),
       "-ak", "手机号", "-bk", "手机号", "-o", OUT]
env = dict(os.environ, PYTHONIOENCODING="utf-8")
r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
print(r.stdout)
if r.returncode != 0:
    print("STDERR:", r.stderr)
    sys.exit(1)

data = read_out(OUT)
for row in data:
    print("  ", row)

header = data[0]
assert header == ["手机号", "姓名", "Buytime", "城市", "event_time", "时间差_小时"], f"表头错误: {header}"
# 13800000001 匹配 1 条；13800000002 匹配 3 条（1:N 展开）；13800000009 未匹配
# 总行数 = 1 + 3 + 1 = 5
assert len(data) == 6, f"行数错误: {len(data)}"
assert data[1][3] == "上海" and data[1][5] == "4.5", f"张三时间差错误: {data[1]}"
# 李四 3 条匹配：差值为 1.5 / 24.5 / 47.5 小时
assert data[2][4] == "2026-02-01 10:00:00" and data[2][5] == "1.5", f"李四第1条: {data[2]}"
assert data[3][4] == "2026-02-02 09:00:00" and data[3][5] == "24.5", f"李四第2条: {data[3]}"
assert data[4][4] == "2026-02-03 08:00:00" and data[4][5] == "47.5", f"李四第3条: {data[4]}"
assert data[5][3] == "" and data[5][5] == "", f"王五未匹配应留空: {data[5]}"
print(">>> 时间差 + 1:N 展开断言全部通过")
