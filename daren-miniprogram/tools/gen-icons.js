/**
 * 图标生成脚本
 * ---------------------------------------------------------------
 * 小程序的 <image> 与 iconfont 都依赖二进制资源，不便纳入代码版本管理。
 * 这里从 preview.html 的 SVG sprite 中提取图元，生成 WXSS 可用的
 * base64/URL 编码 data-uri 背景图，零二进制资源即可用上整套图标。
 *
 * 用法：node tools/gen-icons.js
 * 产物：styles/icons.wxss
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'preview.html')
const OUT = path.join(ROOT, 'styles', 'icons.wxss')

// 三种常用色：品牌紫 / 白色（渐变底上使用）/ 中性灰（箭头、次要图标）
const COLORS = [
  { prefix: 'ic', color: '#6D5DFC' },
  { prefix: 'icw', color: '#FFFFFF' },
  { prefix: 'icg', color: '#949AB2' }
]

function encode(svg) {
  return svg
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ')
    .replace(/ /g, '%20')
}

function build(symbolId, inner, color) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    "stroke='" + color + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    inner +
    '</svg>'
  )
}

function main() {
  const html = fs.readFileSync(SRC, 'utf8')
  const re = /<symbol id="(i-[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/symbol>/g

  const symbols = []
  let m
  while ((m = re.exec(html)) !== null) {
    const name = m[1].replace(/^i-/, '')
    const inner = m[2].replace(/\s+/g, ' ').trim()
    if (inner) symbols.push({ name: name, inner: inner })
  }

  if (!symbols.length) {
    console.error('未从 preview.html 中解析到任何 symbol，请检查文件是否被移动。')
    process.exit(1)
  }

  const lines = []
  lines.push('/* 由 tools/gen-icons.js 自动生成，请勿手动修改 */')
  lines.push('/* 用法：<view class="ic ic-bell" /> 或 <view class="ic icw-bell" style="width:40rpx;height:40rpx" /> */')
  lines.push('')
  lines.push('.ic {')
  lines.push('  display: block;')
  lines.push('  background-repeat: no-repeat;')
  lines.push('  background-position: center;')
  lines.push('  background-size: 100% 100%;')
  lines.push('  flex: none;')
  lines.push('}')
  lines.push('')

  symbols.forEach(function (s) {
    COLORS.forEach(function (c) {
      const svg = build(s.name, s.inner, c.color)
      lines.push('.' + c.prefix + '-' + s.name + ' { background-image: url("data:image/svg+xml,' + encode(svg) + '"); }')
    })
    lines.push('')
  })

  // 常用尺寸，避免每个页面重复写 width/height
  lines.push('/* 尺寸 */')
  const sizes = [
    ['ic-xs', 24],
    ['ic-sm', 32],
    ['ic-md', 40],
    ['ic-lg', 48],
    ['ic-xl', 56]
  ]
  sizes.forEach(function (it) {
    lines.push('.ic-' + it[0].replace('ic-', '') + ' { width: ' + it[1] + 'rpx; height: ' + it[1] + 'rpx; }')
  })
  lines.push('')

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')

  console.log('已生成 ' + symbols.length + ' 个图标 × ' + COLORS.length + ' 色 → ' + path.relative(ROOT, OUT))
  console.log('文件大小：' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB')
}

main()
