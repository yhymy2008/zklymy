# -*- coding: utf-8 -*-
"""
图标资源构建脚本
-----------------------------------------------------------------
小程序端把图标做成了 data-uri 背景图（styles/icons.wxss），
H5 端可以 100% 复用，唯一需要处理的是单位：rpx -> px（1rpx = 0.5px @375）。

用法：python tools/build-icons.py
产物：css/icons.css
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.dirname(ROOT), 'daren-miniprogram', 'styles', 'icons.wxss')
OUT = os.path.join(ROOT, 'css', 'icons.css')

HEADER = [
    '/* 由 tools/build-icons.py 自动生成，请勿手动修改 */',
    '/* 用法：<i class="ic icw-bell" style="width:21px;height:21px"></i> */',
    '/* 前缀：ic = 品牌紫 / icw = 白色 / icg = 中性灰 */',
]


def half(match):
    value = float(match.group(1)) / 2
    return ('%g' % value) + 'px'


def main():
    if not os.path.exists(SRC):
        raise SystemExit('未找到源文件：' + SRC)

    with open(SRC, 'r', encoding='utf-8') as fp:
        css = fp.read()

    count = len(re.findall(r'^\.ic-[a-z0-9-]+ \{', css, re.M))
    css = re.sub(r'([\d.]+)rpx', half, css)

    lines = css.split('\n')
    # 丢掉源文件顶部的两行注释，换成 H5 版说明
    body = lines[2:]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(HEADER + body))

    size = os.path.getsize(OUT) / 1024.0
    print('图标样式已生成：%s（%d 个类，%.1f KB）' % (os.path.relpath(OUT, ROOT), count, size))


if __name__ == '__main__':
    main()
