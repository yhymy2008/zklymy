"""流式读取大 CSV 的表头（前3行），判断哪个含 md5_hash。"""
import csv

files = [
    r"C:\Users\CNYangMe8\Downloads\20260825_panda.csv",
    r"C:\Users\CNYangMe8\Downloads\big.csv",
]

def detect_enc(path):
    for enc in ("utf-8-sig", "gbk", "utf-8"):
        try:
            with open(path, "r", encoding=enc) as f:
                f.read(8192)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8-sig"

for p in files:
    print("=" * 30)
    print("FILE:", p)
    enc = detect_enc(p)
    print("编码:", enc)
    with open(p, "r", encoding=enc, newline="") as f:
        reader = csv.reader(f)
        for i in range(3):
            try:
                row = next(reader)
            except StopIteration:
                break
            print(f"  行{i+1}: {row[:15]}")
