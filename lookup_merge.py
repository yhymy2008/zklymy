# -*- coding: utf-8 -*-
"""
数据查找匹配程序：用 A 文件的指定列，在 B 文件的指定列中查找，
匹配成功后，把 B 文件中该记录的其他字段追加到 A 文件对应记录上。
A 文件与 B 文件均可为 .csv 或 .xlsx/.xlsm 格式，互不限制。

匹配规则：
    - 默认 1:N 展开：A 中某条记录在 B 中匹配到 N 条时，B 的全部 N 条都会写入结果，
      该 A 记录原样复制 N 份（每份追加对应的 B 字段）。
    - 若 B 中同一查找键的多条记录其实是冗余重复、希望只取一条，
      可加 --first-match 关闭 1:N 展开（同键只保留 B 中第一条）。
    - 新增"时间差_小时"列：当 A 含 event_time 列、B 含 buytime 列时，
      自动计算 B.buytime - A.event_time 的差值（单位小时，正数表示 B 时间更晚）。

用法示例：
    python lookup_merge.py -a data.csv -b base.xlsx -ak "手机号" -bk "手机号"
    python lookup_merge.py -a data.xlsx -b base.xlsx -ak A -bk B --sheet "Sheet1" --sheet-a "Sheet2"
    python lookup_merge.py -a data.csv -b base.csv -ak 3 -bk 1 -c "姓名,年龄,城市"
    python lookup_merge.py -a data.xlsx -b base.csv -ak "id" -bk "ID" --prefix "B_"
    python lookup_merge.py -a buy.csv -b event.xlsx -ak "Mobile" -bk "md5_hash" --a-time Buytime --b-time event_time

参数说明：
    -a, --input-a     A 文件路径（.csv 或 .xlsx，被匹配方，结果写回它）
    -b, --input-b     B 文件路径（.csv 或 .xlsx，数据源，从中取值）
    -s, --sheet       B 文件的工作表名（B 为 xlsx 时生效，默认第一个工作表）
    --sheet-a         A 文件的工作表名（A 为 xlsx 时生效，默认第一个工作表）
    -ak, --a-key      A 的查找列：支持列名（如 "手机号"）、列字母（如 "A"）、列序号（1 表示第 1 列）
    -bk, --b-key      B 的查找列：支持列名、列字母、列序号
    -c, --copy        B 中要复制到 A 的列，逗号分隔（默认复制 B 除查找列外的所有列）
    -p, --prefix      追加列的前缀（如 --prefix "B_" -> "B_姓名"；默认不加前缀）
    --sort-by        按 A 文件的某列排序输出：列名 / 列字母 / 列序号（默认按 -ak 查找列排序；传 none 不排序）
    -o, --output      A 输出文件路径（默认在原文件名后加 _matched，格式跟随 A 文件扩展名）
    -e, --encoding    A 文件（csv 时）的编码（默认自动检测 utf-8-sig / gbk / utf-8）
    --b-encoding      B 文件（csv 时）的编码（默认自动检测 utf-8-sig / gbk / utf-8）
    --output-encoding 输出文件（csv 时）编码（默认 utf-8-sig，Excel 可直接打开）
    --keep-duplicates 兼容参数：B 键重复时保留全部（1:N 展开已为默认行为，此参数仅保持旧命令兼容）
    --a-time         A 文件的时间列（列名/列字母/列序号；默认自动查找 buytime 列）
    --b-time         B 文件的时间列（列名/列字母/列序号；默认自动查找 event_time 列）
    --no-normalize    关闭键归一化（默认开启：去掉首尾空格、数字 1.0 转 "1"）

依赖：openpyxl  （安装：pip install openpyxl）
"""

import argparse
import csv
import os
import re
import sys
from datetime import datetime

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.utils import column_index_from_string
except ImportError:
    sys.exit("缺少依赖 openpyxl，请先执行: pip install openpyxl")

CSV_EXT = ".csv"
EXCEL_EXTS = (".xlsx", ".xlsm")
SUPPORTED_EXTS = (CSV_EXT,) + EXCEL_EXTS


def parse_column(col, header_row):
    """把 -ak / -bk / -c 参数解析为列索引（1-based）。支持列名 / 列字母 / 列序号。"""
    col = str(col).strip()
    # 1) 先按表头名称匹配（避免 "Name"/"Oneid" 这类全字母列名被误判为列字母）
    for idx, cell in enumerate(header_row, start=1):
        if cell is not None and str(cell).strip() == col:
            return idx
    # 2) 纯字母 -> 列字母（A、B、AB）
    if re.fullmatch(r"[A-Za-z]{1,3}", col):
        return column_index_from_string(col.upper())
    # 3) 纯数字 -> 列序号（1 表示第 1 列）
    if col.isdigit():
        return int(col)
    sys.exit(f"未找到列：{col}（请用列名、列字母或列序号指定）")


def normalize_key(value, normalize=True):
    """键归一化：数字 1.0 转 "1"，去首尾空格，None 转空串。normalize=False 时仅把 None 转空串。"""
    if value is None:
        return ""
    if normalize:
        if isinstance(value, float) and value.is_integer():
            value = int(value)
        return str(value).strip()
    return str(value)


def find_col(name, header):
    """在表头中大小写不敏感查找列名，返回 1-based 索引；未找到返回 None。"""
    for i, cell in enumerate(header, start=1):
        if cell is not None and str(cell).strip().lower() == name.lower():
            return i
    return None


def parse_datetime(value):
    """把常见时间字符串 / datetime / 时间戳解析为 datetime；失败返回 None。"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        ts = float(value)
        try:
            return datetime.fromtimestamp(ts if ts < 1e12 else ts / 1000.0)
        except (OverflowError, OSError, ValueError):
            return None
    s = str(value).strip()
    if not s:
        return None
    if s.replace(".", "", 1).isdigit():  # 纯数字时间戳
        try:
            ts = float(s)
            return datetime.fromtimestamp(ts if ts < 1e12 else ts / 1000.0)
        except (OverflowError, OSError, ValueError):
            return None
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
                "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M", "%Y-%m-%d", "%Y/%m/%d", "%Y%m%d %H:%M:%S", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    return None


def diff_hours(a_dt, b_dt):
    """计算 b - a 的小时差；任一无法解析时返回空字符串。"""
    if a_dt is None or b_dt is None:
        return ""
    return round((b_dt - a_dt).total_seconds() / 3600, 2)


def detect_encoding(path):
    """依次尝试 utf-8-sig / gbk / utf-8，返回首个能正常解码的编码。"""
    for enc in ("utf-8-sig", "gbk", "utf-8"):
        try:
            with open(path, "r", encoding=enc) as f:
                f.read(4096)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8-sig"  # 全失败时退回默认


def iter_table(path, encoding=None, sheet=None):
    """逐行读取 CSV / XLSX（第一个元素为表头行）。按扩展名自动识别格式。"""
    ext = os.path.splitext(path)[1].lower()
    if ext == CSV_EXT:
        enc = encoding or detect_encoding(path)
        with open(path, "r", encoding=enc, newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                yield row
    elif ext in EXCEL_EXTS:
        wb = load_workbook(path, read_only=True, data_only=True)
        ws = wb[sheet] if sheet else wb.active
        try:
            for row in ws.iter_rows(values_only=True):
                yield list(row)
        finally:
            wb.close()
    else:
        sys.exit(f"不支持的文件格式：{path}（仅支持 {'/'.join(SUPPORTED_EXTS)}）")


def write_table(path, header, rows, encoding="utf-8-sig"):
    """按扩展名写出 CSV / XLSX。"""
    ext = os.path.splitext(path)[1].lower()
    if ext == CSV_EXT:
        with open(path, "w", encoding=encoding, newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(rows)
    elif ext in EXCEL_EXTS:
        wb = Workbook()
        ws = wb.active
        ws.append(header)
        for row in rows:
            ws.append(row)
        wb.save(path)
    else:
        sys.exit(f"不支持的输出格式：{path}（仅支持 {'/'.join(SUPPORTED_EXTS)}）")


def main():
    parser = argparse.ArgumentParser(description="A 查 B（均支持 CSV/XLSX），匹配后把 B 字段追加到 A")
    parser.add_argument("-a", "--input-a", required=True, help="A 文件路径（.csv 或 .xlsx，被匹配方）")
    parser.add_argument("-b", "--input-b", required=True, help="B 文件路径（.csv 或 .xlsx，数据源）")
    parser.add_argument("-s", "--sheet", default=None, help="B 的工作表名（B 为 xlsx 时生效，默认第一个）")
    parser.add_argument("--sheet-a", default=None, help="A 的工作表名（A 为 xlsx 时生效，默认第一个）")
    parser.add_argument("-ak", "--a-key", required=True, help="A 的查找列：列名 / 列字母 / 列序号")
    parser.add_argument("-bk", "--b-key", required=True, help="B 的查找列：列名 / 列字母 / 列序号")
    parser.add_argument("-c", "--copy", default=None, help="要复制的 B 列，逗号分隔（默认除查找列外全部）")
    parser.add_argument("-p", "--prefix", default="", help="追加列前缀（默认空）")
    parser.add_argument("-o", "--output", default=None, help="输出文件路径（默认跟随 A 扩展名）")
    parser.add_argument("-e", "--encoding", default=None, help="A 文件（csv 时）编码（默认自动检测）")
    parser.add_argument("--b-encoding", default=None, help="B 文件（csv 时）编码（默认自动检测）")
    parser.add_argument("--output-encoding", default="utf-8-sig", help="输出 csv 编码（默认 utf-8-sig）")
    parser.add_argument("--keep-duplicates", action="store_true",
                        help="兼容参数：B 键重复时保留全部（1:N 展开已为默认行为）")
    parser.add_argument("--first-match", action="store_true",
                        help="B 中同一查找键有多条时只取第一条（关闭 1:N 展开，恢复一对一）")
    parser.add_argument("--a-time", default=None, help="A 文件时间列：列名/列字母/列序号（默认自动找 event_time）")
    parser.add_argument("--b-time", default=None, help="B 文件时间列：列名/列字母/列序号（默认自动找 buytime）")
    parser.add_argument("--no-normalize", action="store_true", help="关闭键归一化")
    parser.add_argument("--sort-by", default=None,
                        help="按 A 文件的某列排序输出：列名 / 列字母 / 列序号（默认按 -ak 查找列；传 none 不排序）")
    args = parser.parse_args()

    normalize = not args.no_normalize

    if not os.path.exists(args.input_a):
        sys.exit(f"A 文件不存在：{args.input_a}")
    if not os.path.exists(args.input_b):
        sys.exit(f"B 文件不存在：{args.input_b}")

    ext_b = os.path.splitext(args.input_b)[1].lower()
    ext_a = os.path.splitext(args.input_a)[1].lower()
    if ext_a not in SUPPORTED_EXTS or ext_b not in SUPPORTED_EXTS:
        sys.exit(f"A / B 文件仅支持 {'/'.join(SUPPORTED_EXTS)} 格式")

    # ---------- 读取 B（csv/xlsx），构造 查找键 -> 数据行 的映射 ----------
    if args.sheet and ext_b == CSV_EXT:
        print("提示：B 文件为 CSV，--sheet 参数已忽略")
    b_iter = iter_table(args.input_b, args.b_encoding, args.sheet)
    b_header = next(b_iter)
    b_key_idx = parse_column(args.b_key, b_header)

    # 决定要复制的 B 列（默认：除查找列外的所有列）
    if args.copy:
        copy_cols = [parse_column(c, b_header) for c in args.copy.split(",")]
    else:
        copy_cols = [i for i in range(1, len(b_header) + 1) if i != b_key_idx]

    b_map = {}          # 归一化键 -> 匹配数据行列表（1:N 展开用）
    duplicate_keys = 0  # 同一查找键出现多行的键数
    b_rows = 0
    for row in b_iter:
        if all(v is None for v in row):
            continue
        b_rows += 1
        key = normalize_key(row[b_key_idx - 1] if b_key_idx <= len(row) else None, normalize)
        if key == "":
            continue
        if key in b_map:
            duplicate_keys += 1
            if args.first_match:
                continue  # --first-match：同键只保留第一条
        b_map.setdefault(key, []).append(row)
    mode = "只取第一条（--first-match）" if args.first_match else "保留全部匹配（1:N 展开）"
    print(f"B 文件共 {b_rows} 条数据，有效查找键 {len(b_map)} 个，重复键 {duplicate_keys} 个（{mode}）")

    # ---------- 读取 A（csv/xlsx）并逐行匹配 ----------
    enc = args.encoding or detect_encoding(args.input_a)
    print(f"读取 A 文件：{args.input_a}{'（编码 ' + enc + '）' if ext_a == CSV_EXT else ''}")

    a_iter = iter_table(args.input_a, args.encoding, args.sheet_a)
    a_header = next(a_iter)
    a_key_idx = parse_column(args.a_key, a_header)
    if a_key_idx > len(a_header):
        sys.exit(f"A 文件查找列越界：第 {a_key_idx} 列（A 文件共 {len(a_header)} 列）")

    # 新增列名（避免与 A 已有列重名时自动加 _2）
    def unique_name(name):
        if name not in a_header:
            return name
        i = 2
        while f"{name}_{i}" in a_header:
            i += 1
        return f"{name}_{i}"

    new_cols = [unique_name(args.prefix + str(b_header[i - 1])) for i in copy_cols]

    # 时间差列：自动检测 A 的 event_time 与 B 的 buytime（可用 --a-time / --b-time 覆盖）
    a_time_idx = parse_column(args.a_time, a_header) if args.a_time else find_col("event_time", a_header)
    b_time_idx = parse_column(args.b_time, b_header) if args.b_time else find_col("buytime", b_header)
    diff_col = None
    if a_time_idx is not None and b_time_idx is not None:
        diff_col = unique_name("时间差_小时")
        print(f"时间差列：{diff_col}（B 第 {b_time_idx} 列 {b_header[b_time_idx - 1]} - A 第 {a_time_idx} 列 {a_header[a_time_idx - 1]}，单位小时）")
    else:
        print("提示：未同时找到 A 的 event_time 列与 B 的 buytime 列，跳过时间差列（可用 --a-time / --b-time 指定）")

    rows = list(a_iter)

    # 逐行匹配（1:N 展开：B 中每条匹配都写出一行；每处理 1000 条打印一次进度）
    total = len(rows)
    matched_a = 0        # 至少匹配到 1 条 B 记录的 A 记录数
    matched_records = 0  # 展开后匹配行总数
    out_rows = []
    for idx, row in enumerate(rows, start=1):
        key = normalize_key(row[a_key_idx - 1] if a_key_idx <= len(row) else None, normalize)
        matches = b_map.get(key, [])
        a_time = parse_datetime(row[a_time_idx - 1]) if diff_col and a_time_idx and a_time_idx <= len(row) else None
        if matches:
            matched_a += 1
            matched_records += len(matches)
            for m in matches:
                new_row = list(row)  # A 记录原样复制一份
                for ci in copy_cols:
                    new_row.append(m[ci - 1] if ci <= len(m) else "")
                if diff_col:
                    b_time = parse_datetime(m[b_time_idx - 1]) if b_time_idx <= len(m) else None
                    new_row.append(diff_hours(a_time, b_time))
                out_rows.append(new_row)
        else:
            new_row = list(row) + [""] * len(copy_cols)
            if diff_col:
                new_row.append("")
            out_rows.append(new_row)

        if idx % 1000 == 0:
            pct = idx * 100 // total if total else 100
            print(f"进度: 已处理 {idx}/{total} 条 ({pct}%)")
    if total == 0:
        print("进度: A 文件无数据记录")
    elif total % 1000 != 0:
        print(f"进度: 已处理 {total}/{total} 条 (100%)")

    unmatched = total - matched_a
    print(f"A 文件共 {total} 条记录：至少匹配 1 条 {matched_a} 条，未匹配 {unmatched} 条；"
          f"匹配到 B 记录共 {matched_records} 条，展开后输出 {len(out_rows)} 行")
    rows = out_rows

    # ---------- 排序（默认按 A 查找列） ----------
    sort_col = None
    if str(args.sort_by or "").strip().lower() != "none":
        sort_col = a_key_idx if not args.sort_by else parse_column(args.sort_by, a_header)

    if sort_col:
        def sort_key(row):
            # 空值排最后；数值按数值大小排，文本按字符串排
            val = row[sort_col - 1] if sort_col <= len(row) else ""
            if val is None or val == "":
                return (1, 0, "")
            try:
                return (0, 0, float(val))
            except (ValueError, TypeError):
                return (0, 1, str(val).strip())

        rows.sort(key=sort_key)
        print(f"已按 A 文件第 {sort_col} 列（{a_header[sort_col - 1]}）排序")

    # ---------- 写出结果（格式跟随 A 文件扩展名） ----------
    output = args.output or os.path.splitext(args.input_a)[0] + "_matched" + os.path.splitext(args.input_a)[1]
    header_out = a_header + new_cols + ([diff_col] if diff_col else [])
    write_table(output, header_out, rows, args.output_encoding)

    extra_cols = new_cols + ([diff_col] if diff_col else [])
    print(f"完成：新增列 {len(extra_cols)} 个（{', '.join(extra_cols)}）")
    print(f"保存至：{output}")


if __name__ == "__main__":
    main()
