# -*- coding: utf-8 -*-
"""
读取 Excel 文件，对指定列进行 MD5 加密，加密结果写入另一列。

用法示例：
    python md5_excel.py -i data.xlsx -c "手机号" -t "手机号MD5"
    python md5_excel.py -i data.xlsx -c B -t md5_hash --sheet "Sheet1"
    python md5_excel.py -i data.xlsx -c 3 -t "hash" --overwrite

参数说明：
    -i, --input      输入 Excel 文件路径（.xlsx / .xlsm）
    -s, --sheet       工作表名（默认第一个工作表）
    -c, --column      源列：支持列名（如 "手机号"）、列字母（如 "B"）、或列序号（1 表示第 1 列）
    -t, --target      目标列名（默认 "md5_hash"；若不存在会自动追加到表尾）
    -o, --output      输出文件路径（默认在原文件名后加 _md5）
    --overwrite       直接覆盖原文件（否则另存为新文件）

依赖：openpyxl  （安装：pip install openpyxl）
"""

import argparse
import hashlib
import os
import re
import sys

try:
    from openpyxl import load_workbook
    from openpyxl.utils import get_column_letter, column_index_from_string
except ImportError:
    sys.exit("缺少依赖 openpyxl，请先执行: pip install openpyxl")


def md5_hex(text):
    """对文本计算 MD5（UTF-8 编码），空值返回空字符串。"""
    if text is None:
        return ""
    return hashlib.md5(str(text).encode("utf-8")).hexdigest()


def parse_column(col, header_row):
    """
    把 -c 参数解析为列索引（1-based）。
    支持三种写法：表头名称 / 列字母（A、B、AB）/ 列序号（1、2、3）。
    """
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


def main():
    parser = argparse.ArgumentParser(description="Excel 指定列 MD5 加密")
    parser.add_argument("-i", "--input", required=True, help="输入 Excel 文件路径")
    parser.add_argument("-s", "--sheet", default=None, help="工作表名（默认第一个）")
    parser.add_argument("-c", "--column", required=True, help="源列：列名 / 列字母 / 列序号")
    parser.add_argument("-t", "--target", default="md5_hash", help="目标列名（默认 md5_hash）")
    parser.add_argument("-o", "--output", default=None, help="输出文件路径")
    parser.add_argument("--overwrite", action="store_true", help="直接覆盖原文件")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        sys.exit(f"输入文件不存在：{args.input}")
    if os.path.isdir(args.input):
        sys.exit(f"输入路径是一个文件夹，不是 Excel 文件：{args.input}\n"
                 f"请用 -i 指定具体的 .xlsx / .xlsm 文件，例如：\n"
                 f"    python md5_excel.py -i {args.input}\\data.xlsx -c \"手机号\"")

    # 打开工作簿（保留原格式与样式）
    wb = load_workbook(args.input)
    ws = wb[args.sheet] if args.sheet else wb.active

    # 取表头行（第一行），确定源列与目标列位置
    header = [cell.value for cell in ws[1]]
    src_idx = parse_column(args.column, header)
    if src_idx < 1 or src_idx > ws.max_column:
        sys.exit(f"源列序号越界：{src_idx}（最大列数 {ws.max_column}）")

    # 目标列：若表头已存在同名列则复用，否则追加到最后一列
    tgt_idx = None
    for idx, val in enumerate(header, start=1):
        if val is not None and str(val).strip() == args.target:
            tgt_idx = idx
            break
    if tgt_idx is None:
        tgt_idx = ws.max_column + 1
        ws.cell(row=1, column=tgt_idx, value=args.target)

    # 逐行加密（每处理 1000 条打印一次进度）
    total = ws.max_row - 1
    count = 0
    for row in range(2, ws.max_row + 1):
        src_cell = ws.cell(row=row, column=src_idx)
        val = src_cell.value
        # 跳过整行为空的情况（源值为空则写空串）
        ws.cell(row=row, column=tgt_idx, value=md5_hex(val))
        count += 1
        if count % 1000 == 0:
            pct = count * 100 // total if total else 100
            print(f"进度: 已处理 {count}/{total} 条 ({pct}%)")
    if count % 1000 != 0:
        print(f"进度: 已处理 {count}/{total} 条 (100%)")

    # 保存
    output = args.input if args.overwrite else (args.output or
                os.path.splitext(args.input)[0] + "_md5" + os.path.splitext(args.input)[1])
    wb.save(output)
    print(f"完成：已加密 {count} 行，源列 -> {args.target}，保存至 {output}")


if __name__ == "__main__":
    main()
