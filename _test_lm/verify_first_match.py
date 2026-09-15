# -*- coding: utf-8 -*-
"""验证 --first-match：B 同键多条时只取第一条（关闭 1:N 展开）"""
import csv
import os
import subprocess
import sys

BASE = r"c:\Users\CNYangMe8\Documents\work\AI_coding"
TMP = os.path.join(BASE, "_test_lm")
SCRIPT = os.path.join(BASE, "lookup_merge.py")
A = os.path.join(TMP, "a_time.csv")
B = os.path.join(TMP, "b_time.csv")
OUT = os.path.join(TMP, "out_first_match.csv")

env = dict(os.environ, PYTHONIOENCODING="utf-8")


def run(args):
    r = subprocess.run([sys.executable, SCRIPT] + args,
                       capture_output=True, text=True, encoding="utf-8", env=env)
    sys.stdout.write(r.stdout + (r.stderr or ""))
    sys.stdout.flush()
    assert r.returncode == 0, f"运行失败: {r.stderr}"
    with open(OUT, encoding="utf-8-sig") as f:
        return list(csv.reader(f))


def main():
    # 无 --first-match：张三1 + 李四3(1:N展开) + 王五1(未匹配) = 5 行数据 + 表头 = 6 行
    data = run(["-a", A, "-b", B, "-ak", "手机号", "-bk", "手机号", "-o", OUT])
    assert len(data) == 6, f"1:N 行数错误: {len(data)}"
    print(f"[1:N 默认] 数据行 {len(data) - 1}（预期 5）OK")

    # 加 --first-match：李四只取第一条 -> 张三1 + 李四1 + 王五1 = 3 行数据 + 表头 = 4 行
    data = run(["-a", A, "-b", B, "-ak", "手机号", "-bk", "手机号", "-o", OUT, "--first-match"])
    assert len(data) == 4, f"--first-match 行数错误: {len(data)}"
    assert data[1][1] == "张三" and data[2][1] == "李四" and data[3][1] == "王五", f"行内容错误: {data}"
    print(f"[--first-match] 数据行 {len(data) - 1}（预期 3）OK")
    print("验证通过：--first-match 生效，同键多条只取第一条")


if __name__ == "__main__":
    main()
