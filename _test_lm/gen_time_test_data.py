# -*- coding: utf-8 -*-
"""生成 lookup_merge.py 新功能测试数据（1:N 展开 + 时间差列）"""
import csv
import os

tmp = r"c:\Users\CNYangMe8\Documents\work\AI_coding\_test_lm"


def w(name, rows):
    with open(os.path.join(tmp, name), "w", encoding="utf-8-sig", newline="") as f:
        cw = csv.writer(f)
        cw.writerows(rows)


# A: 含 Buytime（购买时间）
w("a_time.csv", [
    ["手机号", "姓名", "Buytime"],
    ["13800000001", "张三", "2026-01-01 10:00:00"],
    ["13800000002", "李四", "2026-02-01 08:30:00"],
    ["13800000009", "王五", "2026-03-01 12:00:00"],  # B 中不存在
])
# B: 含 event_time，13800000002 有 3 条记录（验证 1:N 展开）
w("b_time.csv", [
    ["手机号", "城市", "event_time"],
    ["13800000001", "上海", "2026-01-01 14:30:00"],
    ["13800000002", "北京", "2026-02-01 10:00:00"],
    ["13800000002", "北京", "2026-02-02 09:00:00"],
    ["13800000002", "北京", "2026-02-03 08:00:00"],
])
print("测试数据生成完成")
