"""快速在 Downloads 的 xlsx 中搜索目标 md5（只扫 xlsx/xls）。"""
import os
from openpyxl import load_workbook

TARGET = "0000b11b600609f69c45178133be1829"
root = r"C:\Users\CNYangMe8\Downloads"
hits = 0
for dp, dns, fns in os.walk(root):
    for f in fns:
        if not f.lower().endswith((".xlsx", ".xls")):
            continue
        p = os.path.join(dp, f)
        try:
            wb = load_workbook(p, read_only=True, data_only=True)
            for name in wb.sheetnames:
                ws = wb[name]
                for r in ws.iter_rows(values_only=True):
                    for v in r:
                        if v is not None and str(v).strip().lower() == TARGET:
                            print(f"[xlsx] {p} sheet={name}")
                            hits += 1
                            break
            wb.close()
        except Exception:
            pass
print(f"--- done, hits={hits}")
