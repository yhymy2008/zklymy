import io, re
s = io.open('preview.html', encoding='utf-8').read()
for tag in ['div', 'section', 'template', 'svg', 'symbol', 'button', 'span']:
    o = len(re.findall(r'<%s[\s>]' % tag, s))
    c = len(re.findall(r'</%s>' % tag, s))
    print(tag, o, c, 'OK' if o == c else 'MISMATCH')
print('pages', len(re.findall(r'class="page"', s)))
print('bytes', len(s))
