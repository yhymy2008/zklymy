# -*- coding: utf-8 -*-
"""
H5 工程自检：
  1. 校验页面引用的图标类是否都在 css/icons.css 中定义
     （漏一个图标就是一块空白，必须卡住）
  2. 校验页面之间的链接是否存在对应文件
  3. 校验 HTML 标签闭合

用法：python tools/check.py
"""
import glob
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Balance(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append('多余的闭合标签 </%s>' % tag)
            return
        if self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.errors.append('<%s> 未闭合' % self.stack.pop())
            self.stack.pop()
        else:
            self.errors.append('多余的闭合标签 </%s>' % tag)


def rel(path):
    return os.path.relpath(path, ROOT)


def main():
    problems = []

    css = open(os.path.join(ROOT, 'css', 'icons.css'), encoding='utf-8').read()
    defined = set(re.findall(r'\.ic[wg]?-([a-z0-9-]+)\s*\{', css))

    files = sorted(glob.glob(os.path.join(ROOT, '*.html'))) + \
        sorted(glob.glob(os.path.join(ROOT, 'js', '*.js')))

    used = set()
    links = set()
    for path in files:
        text = open(path, encoding='utf-8').read()

        used |= set(re.findall(r'\bic[wg]?-([a-z0-9-]+)\b', text))
        used |= set(re.findall(r"icon:\s*'([a-z0-9-]+)'", text))

        for href in re.findall(r"""(?:href|src)=["']([^"'#:]+)["']""", text):
            if href.endswith('.html'):
                links.add(href)
        # JS 里 APP.go('xxx.html') / location.href = 'xxx.html' 这类跳转
        links |= set(re.findall(r"""['"]([a-z0-9_-]+\.html)['"]""", text))

        if path.endswith('.html'):
            parser = Balance()
            parser.feed(text)
            for err in parser.errors:
                problems.append('%s: %s' % (rel(path), err))
            for tag in parser.stack:
                problems.append('%s: <%s> 未闭合' % (rel(path), tag))

    missing_icons = sorted(used - defined)
    if missing_icons:
        problems.append('缺少图标定义：' + ', '.join(missing_icons))

    missing_files = sorted(h for h in links if not os.path.exists(os.path.join(ROOT, h)))
    if missing_files:
        problems.append('链接指向的文件不存在：' + ', '.join(missing_files))

    print('页面数量：%d' % len(glob.glob(os.path.join(ROOT, '*.html'))))
    print('引用图标：%d 个（已定义 %d 个）' % (len(used), len(defined)))
    print('站内链接：%d 条' % len(links))

    if problems:
        print('\n发现 %d 个问题：' % len(problems))
        for p in problems:
            print('  - ' + p)
        raise SystemExit(1)

    print('\n自检通过：图标、链接、标签闭合均无问题。')


if __name__ == '__main__':
    main()
