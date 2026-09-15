import zipfile
import xml.etree.ElementTree as ET
import sys
sys.stdout.reconfigure(encoding='utf-8')

zf = zipfile.ZipFile(r'C:\Users\CNYangMe8\Documents\work\AI_coding\佳膳悠选项目进展汇报.pptx')
slides = sorted([f for f in zf.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')])
NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'

for s in slides:
    tree = ET.parse(zf.open(s))
    print(f'=== {s} ===')
    count = 0
    for t in tree.iter(f'{{{NS}}}t'):
        if t.text and t.text.strip():
            print(f'  {t.text.strip()}')
            count += 1
    print(f'  (total: {count} text elements)')
    print()
