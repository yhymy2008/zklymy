"""检查候选 A 文件的表头、md5_hash 列、目标值出现行。"""
import csv

TARGET = "0000b11b600609f69c45178133be1829"
files = [
    r"C:\Users\CNYangMe8\Downloads\20260825_panda.csv",
    r"C:\Users\CNYangMe8\Downloads\big.csv",
    r"C:\Users\CNYangMe8\Downloads\20260826_update_pan.csv",
]

def detect_enc(path):
    for enc in ("utf-8-sig", "gbk", "utf-8"):
        try:
            with open(path, "r", encoding=enc) as f:
                f.read(4096)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8-sig"

for p in files:
    print("=" * 30)
    print("FILE:", p)
    enc = detect_enc(p)
    with open(p, "r", encoding=enc, newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        print("编码:", enc, "| 列数:", len(header))
        print("表头:", header)
        md5_idx = None
        for i, h in enumerate(header):
            if "md5" in str(h).lower():
                md5_idx = i
                print(f"  md5 列[{i}]: {h}")
        cnt = 0
        rows = []
        for rno, row in enumerate(reader, 2):
            for i, v in enumerate(row):
                if v is not None and str(v).strip().lower() == TARGET:
                    cnt += 1
                    rows.append((rno, i))
                    break
        print(f"目标md5出现: {cnt} 处，位置: {rows[:20]}")
        if md5_idx is not None:
            # 该列重复值统计
            from collections import Counter
            vals = Counter()
            with open(p, "r", encoding=enc, newline="") as f:
                r2 = csv.reader(f)
                next(r2)
                for row in r2:
                    if md5_idx < len(row) and row[md5_idx].strip():
                        vals[str(row[md5_idx]).strip().lower()] += 1
            dup = {k: v for k, v in vals.items() if v > 1}
            print(f"md5列唯一值 {len(vals)} 个，重复值 {len(dup)} 个；示例: {list(dup.items())[:10]}")
