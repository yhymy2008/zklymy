"""流式检查 20260826_update_pan.csv：表头 + 目标 md5 行上下文。"""
import csv

TARGET = "0000b11b600609f69c45178133be1829"
P = r"C:\Users\CNYangMe8\Downloads\20260826_update_pan.csv"

def detect_enc(path):
    for enc in ("utf-8-sig", "gbk", "utf-8"):
        try:
            with open(path, "r", encoding=enc) as f:
                f.read(8192)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8-sig"

enc = detect_enc(P)
print("编码:", enc)
with open(P, "r", encoding=enc, newline="") as f:
    reader = csv.reader(f)
    header = next(reader)
    print("列数:", len(header))
    print("表头:", header)
    md5_idx = next((i for i, h in enumerate(header) if "md5" in str(h).lower()), None)
    print("md5列:", (md5_idx, header[md5_idx]) if md5_idx is not None else None)
    cnt = 0
    for rno, row in enumerate(reader, 2):
        for i, v in enumerate(row):
            if v is not None and str(v).strip().lower() == TARGET:
                cnt += 1
                print(f"--- 命中 行{rno} 列{i} (列名{header[i] if i < len(header) else '?'})")
                print("  整行:", row[:20])
                break
    print(f"目标md5总命中: {cnt}")
