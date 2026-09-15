# -*- coding: utf-8 -*-
"""验证 lookup_merge.py：A 默认自动查找 event_time 列，B 默认自动查找 buytime 列"""
import csv
import os
import subprocess
import sys

BASE = r"c:\Users\CNYangMe8\Documents\work\AI_coding"
TMP = os.path.join(BASE, "_test_lm")
SCRIPT = os.path.join(BASE, "lookup_merge.py")
A = os.path.join(TMP, "a_swap.csv")
B = os.path.join(TMP, "b_swap.csv")
OUT = os.path.join(TMP, "out_swap.csv")


def write(path, rows):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        csv.writer(f).writerows(rows)


def main():
    # A 含 event_time（无 buytime）；B 含 buytime（无 event_time）
    write(A, [
        ["手机号", "姓名", "event_time"],
        ["13800000001", "张三", "2026-01-01 10:00:00"],
        ["13800000002", "李四", "2026-02-01 08:30:00"],
    ])
    write(B, [
        ["手机号", "城市", "buytime"],
        ["13800000001", "上海", "2026-01-01 14:30:00"],
        ["13800000002", "北京", "2026-02-01 10:00:00"],
        ["13800000002", "北京", "2026-02-02 09:00:00"],
    ])
    # 不带 --a-time / --b-time，依赖默认自动检测
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    r = subprocess.run(
        [sys.executable, SCRIPT, "-a", A, "-b", B, "-ak", "手机号", "-bk", "手机号", "-o", OUT],
        capture_output=True, text=True, encoding="utf-8", env=env)
    sys.stdout.write(r.stdout + (r.stderr or ""))
    sys.stdout.flush()
    print(r.stdout)
    if r.returncode != 0:
        print("STDERR:", r.stderr)
        sys.exit(1)
    with open(OUT, encoding="utf-8-sig") as f:
        data = list(csv.reader(f))
    header = data[0]
    print("表头:", header)
    # 1) 表头应含时间差列
    assert "时间差_小时" in header, f"缺少时间差列: {header}"
    # 2) 李四 1:N 展开为 2 行 -> 表头 + 3 行数据 = 4 行
    assert len(data) == 4, f"行数错误: {len(data)}"
    assert data[1][1] == "张三" and data[1][3] == "上海", f"张三错误: {data[1]}"
    # 时间差 = buytime - event_time
    # 张三: 14:30 - 10:00 = 4.5 小时
    assert data[1][5] == "4.5", f"张三时间差错误: {data[1][5]}"
    # 李四第1条: 10:00 - 08:30 = 1.5 小时
    assert data[2][1] == "李四" and data[2][4] == "2026-02-01 10:00:00" and data[2][5] == "1.5", f"李四1错误: {data[2]}"
    # 李四第2条(1:N): 2026-02-02 09:00 - 08:30 = 24.5 小时
    assert data[3][1] == "李四" and data[3][4] == "2026-02-02 09:00:00" and data[3][5] == "24.5", f"李四2错误: {data[3]}"
    print("验证通过：A 默认找到 event_time，B 默认找到 buytime，1:N 展开与时间差计算正确")


if __name__ == "__main__":
    main()
