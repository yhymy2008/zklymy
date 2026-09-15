"""在常见位置搜索包含指定 md5 值或 md5/Oneid 命名的数据文件。"""
import os

target = "0000b11b600609f69c45178133be1829"
search_roots = [
    r"C:\Users\CNYangMe8\Desktop",
    r"C:\Users\CNYangMe8\Downloads",
    r"C:\Users\CNYangMe8\Documents",
]
excl_dirs = {"node_modules", ".venv", ".git", "AppData", "Windows", "Program Files",
             "Program Files (x86)", ".cache", "pip"}

candidates = []
for root in search_roots:
    if not os.path.isdir(root):
        continue
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in excl_dirs and not d.startswith(".")]
        for f in fns:
            low = f.lower()
            if low.endswith((".xlsx", ".xls", ".csv")):
                candidates.append(os.path.join(dp, f))

print("候选数据文件（xlsx/xls/csv）:")
for f in candidates:
    print("  ", f)
print("--- total", len(candidates))

# 在候选文件中查找 md5 值（xlsx 用 openpyxl 读，csv 用文本读）
print("\n包含目标 md5 值的文件:")
from openpyxl import load_workbook
found = 0
for path in candidates:
    try:
        if path.lower().endswith(".csv"):
            with open(path, "r", encoding="utf-8-sig", errors="replace") as fh:
                for line in fh:
                    if target in line:
                        print("  [csv]", path, "->", line.strip()[:120])
                        found += 1
                        break
        else:
            wb = load_workbook(path, read_only=True, data_only=True)
            for name in wb.sheetnames:
                ws = wb[name]
                for r in ws.iter_rows(values_only=True):
                    for v in r:
                        if v is not None and str(v).strip().lower() == target:
                            print("  [xlsx]", path, "sheet=", name)
                            found += 1
                            break
            wb.close()
    except Exception as e:
        pass
print("--- hits", found)
