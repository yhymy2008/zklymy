"""在 big.csv / panda.csv 中流式搜索目标 md5，输出所有命中行。"""
import csv

TARGET = "0000b11b600609f69c45178133be1829"
files = [
    (r"C:\Users\CNYangMe8\Downloads\big.csv", "utf-8-sig"),
    (r"C:\Users\CNYangMe8\Downloads\20260825_panda.csv", "utf-8-sig"),
]

for p, enc in files:
    print("=" * 30)
    print("FILE:", p)
    cnt = 0
    with open(p, "r", encoding=enc, newline="") as f:
        reader = csv.reader(f)
        for rno, row in enumerate(reader, 1):
            for i, v in enumerate(row):
                if v is not None and str(v).strip().lower() == TARGET:
                    cnt += 1
                    print(f"  命中 行{rno} 列{i}: {row}")
                    break
    print(f"  总命中: {cnt}")
