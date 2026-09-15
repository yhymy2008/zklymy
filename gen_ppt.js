const pptxgen = require("pptxgenjs");

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "小河马平台";
  pres.title = "佳膳悠选项目进展汇报";

  // ─── Color Palette ────────────────────────────────────
  const C = {
    dark:     "1B2A3A",
    primary:  "0D6B5D",
    primaryL: "1A8B7B",
    accent:   "C6953A",
    accentL:  "F5DEB3",
    bg:       "F2F5F4",
    white:    "FFFFFF",
    text:     "2C3E50",
    muted:    "7F8C8D",
    green:    "27AE60",
    greenBg:  "E8F8F5",
    amber:    "D4A843",
    amberBg:  "FEF9E7",
    gray:     "BDC3C7"
  };

  const FONT = "Microsoft YaHei";
  const FONT_NUM = "Arial";

  // ─── HELPERS ──────────────────────────────────────────
  const topBar = (slide) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 10, h: 0.05, fill: { color: C.primary }
    });
  };
  const bottomBar = (slide) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 5.525, w: 10, h: 0.1, fill: { color: C.primary }
    });
  };
  const sectionHeader = (slide, x, y, w, text, color) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h: 0.42, fill: { color }
    });
    slide.addText(text, {
      x, y, w, h: 0.42,
      fontSize: 13, fontFace: FONT, color: C.white,
      bold: true, align: "center", valign: "middle", margin: 0
    });
  };

  // ========================================================
  // SLIDE 1 — COVER
  // ========================================================
  const s1 = pres.addSlide();
  s1.background = { color: C.dark };

  // Top accent line
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.05, fill: { color: C.accent }
  });

  // Left decorative bar
  s1.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: 1.5, w: 0.06, h: 1.7, fill: { color: C.accent }
  });

  // Main title
  s1.addText("佳膳悠选项目", {
    x: 1.1, y: 1.5, w: 8, h: 0.85,
    fontSize: 42, fontFace: FONT, color: C.white,
    bold: true, margin: 0
  });
  s1.addText("进展汇报", {
    x: 1.1, y: 2.3, w: 8, h: 0.85,
    fontSize: 42, fontFace: FONT, color: C.accent,
    bold: true, margin: 0
  });

  // Subtitle tags
  s1.addText("小河马平台 · 全员销售 · 总部大仓履约", {
    x: 1.1, y: 3.4, w: 8, h: 0.5,
    fontSize: 16, fontFace: FONT, color: C.muted, margin: 0
  });

  // Date
  s1.addText("2026年7月", {
    x: 7.5, y: 4.8, w: 2, h: 0.4,
    fontSize: 14, fontFace: FONT_NUM, color: C.muted,
    align: "right", margin: 0
  });

  bottomBar(s1);

  // ========================================================
  // SLIDE 2 — 业务链路 + 系统交付
  // ========================================================
  const s2 = pres.addSlide();
  s2.background = { color: C.white };
  topBar(s2);

  // Page number
  s2.addText("01", {
    x: 9.2, y: 0.15, w: 0.6, h: 0.3,
    fontSize: 11, fontFace: FONT_NUM, color: C.muted, align: "right"
  });

  s2.addText("业务运行链路与系统交付", {
    x: 0.6, y: 0.15, w: 8, h: 0.65,
    fontSize: 26, fontFace: FONT, color: C.primary, bold: true, margin: 0
  });

  // ── LEFT: Business Flow ──
  sectionHeader(s2, 0.6, 1.0, 4.2, "业务运行链路", C.primary);

  const flowX = [0.6, 2.05, 3.5];
  const flowW = 1.35;
  const flowY0 = 1.65;
  const flows = [
    { n: "1", t: "消费者下单", d: "小河马平台线上下单\n购买佳膳悠选" },
    { n: "2", t: "总部大仓履约", d: "公司大仓统一发货\n直达消费者" },
    { n: "3", t: "门店激励结算", d: "中台发放门店激励\n小河马领取任务" }
  ];

  flows.forEach((f, i) => {
    const fx = flowX[i];
    // Card bg
    s2.addShape(pres.shapes.RECTANGLE, {
      x: fx, y: flowY0, w: flowW, h: 1.35,
      fill: { color: C.bg }
    });
    // Top accent
    s2.addShape(pres.shapes.RECTANGLE, {
      x: fx, y: flowY0, w: flowW, h: 0.05,
      fill: { color: i === 2 ? C.accent : C.primaryL }
    });
    // Number circle
    s2.addShape(pres.shapes.OVAL, {
      x: fx + flowW / 2 - 0.18, y: flowY0 + 0.15, w: 0.36, h: 0.36,
      fill: { color: i === 2 ? C.accent : C.primaryL }
    });
    s2.addText(f.n, {
      x: fx + flowW / 2 - 0.18, y: flowY0 + 0.15, w: 0.36, h: 0.36,
      fontSize: 15, fontFace: FONT_NUM, color: C.white,
      bold: true, align: "center", valign: "middle", margin: 0
    });
    // Title
    s2.addText(f.t, {
      x: fx + 0.08, y: flowY0 + 0.6, w: flowW - 0.16, h: 0.28,
      fontSize: 11, fontFace: FONT, color: C.text,
      bold: true, align: "center", valign: "middle", margin: 0
    });
    // Desc
    s2.addText(f.d, {
      x: fx + 0.08, y: flowY0 + 0.9, w: flowW - 0.16, h: 0.38,
      fontSize: 8, fontFace: FONT, color: C.muted,
      align: "center", valign: "top", margin: 0
    });

    // Arrow
    if (i < 2) {
      s2.addShape(pres.shapes.LINE, {
        x: fx + flowW + 0.02, y: flowY0 + 0.65, w: 0.06, h: 0,
        line: { color: C.gray, width: 1.2 }
      });
    }
  });

  // ── RIGHT: System Checklist ──
  sectionHeader(s2, 5.2, 1.0, 4.2, "系统关键交付项", C.accent);

  const checks = [
    { t: "第三方收款开通（汇付平台）",              d: "7月2日" },
    { t: "绩点奖励流程改造（小河马-中台-达生）",     d: "7月3日" },
    { t: "线上下单履约（小河马对接管易云OMS）",      d: "7月6日" },
    { t: "电子发票对接（小河马-电票平台）",          d: "7月10日" },
    { t: "财务核销流程（管易云OMS-汇付平台）",       d: "7月17日" },
    { t: "全链路业务联调（6方系统集成）",            d: "7月17日" }
  ];

  const checkY0 = 1.62;
  const rowH = 0.44;
  checks.forEach((c, i) => {
    const cy = checkY0 + i * rowH;
    const bgColor = i % 2 === 0 ? C.bg : C.white;
    s2.addShape(pres.shapes.RECTANGLE, {
      x: 5.3, y: cy + 0.02, w: 4.0, h: rowH - 0.04,
      fill: { color: bgColor }
    });
    // Checkmark
    s2.addShape(pres.shapes.OVAL, {
      x: 5.38, y: cy + 0.09, w: 0.24, h: 0.24,
      fill: { color: C.green }
    });
    s2.addText("✓", {
      x: 5.38, y: cy + 0.09, w: 0.24, h: 0.24,
      fontSize: 10, fontFace: FONT, color: C.white,
      align: "center", valign: "middle", margin: 0
    });
    // Text
    s2.addText(c.t, {
      x: 5.7, y: cy, w: 2.8, h: rowH,
      fontSize: 10, fontFace: FONT, color: C.text,
      valign: "middle", margin: 0
    });
    // Date
    s2.addText(c.d, {
      x: 8.55, y: cy, w: 0.7, h: rowH,
      fontSize: 9, fontFace: FONT_NUM, color: C.green,
      align: "right", valign: "middle", margin: 0
    });
  });

  // Bottom status bar
  s2.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 4.7, w: 8.8, h: 0.55,
    fill: { color: C.greenBg }
  });
  s2.addText([
    { text: "6 项系统关键交付全部完成：", options: { color: C.text, bold: true } },
    { text: "系统搭建全部完成，全链路业务联调通过，具备正式上线运营能力", options: { color: C.primary } }
  ], {
    x: 0.6, y: 4.7, w: 8.8, h: 0.55,
    fontSize: 13, fontFace: FONT, align: "center", valign: "middle", margin: 0
  });

  bottomBar(s2);

  // ========================================================
  // SLIDE 3 — 售价测算 + 下一步 + 平台价值
  // ========================================================
  const s3 = pres.addSlide();
  s3.background = { color: C.white };
  topBar(s3);

  s3.addText("02", {
    x: 9.2, y: 0.15, w: 0.6, h: 0.3,
    fontSize: 11, fontFace: FONT_NUM, color: C.muted, align: "right"
  });

  s3.addText("售价测算 · 下一步计划 · 平台价值", {
    x: 0.6, y: 0.15, w: 8, h: 0.65,
    fontSize: 26, fontFace: FONT, color: C.primary, bold: true, margin: 0
  });

  // ── LEFT COLUMN: Pricing ──
  sectionHeader(s3, 0.6, 1.0, 4.5, "售价测算", C.primary);

  // Two big number cards
  const cardW = 2.1, cardH = 0.95;
  const cards = [
    { x: 0.6,  val: "153", unit: "元/罐", label: "平台含税零售价", color: C.primary },
    { x: 0.6 + cardW + 0.3, val: "25,000", unit: "罐", label: "8-12月预估销量", color: C.accent }
  ];

  cards.forEach((card) => {
    s3.addShape(pres.shapes.RECTANGLE, {
      x: card.x, y: 1.65, w: cardW, h: cardH,
      fill: { color: C.bg }
    });
    s3.addText([
      { text: card.val, options: { fontSize: 28, bold: true, color: card.color } },
      { text: " " + card.unit, options: { fontSize: 12, color: C.muted } }
    ], {
      x: card.x, y: 1.7, w: cardW, h: 0.55,
      fontFace: FONT_NUM, align: "center", valign: "middle", margin: 0
    });
    s3.addText(card.label, {
      x: card.x, y: 2.25, w: cardW, h: 0.3,
      fontSize: 9, fontFace: FONT, color: C.muted,
      align: "center", valign: "top", margin: 0
    });
  });

  // Pricing detail table
  const priceRows = [
    { l: "RSP（建议零售价）",               v: "188 元/罐",  hl: false },
    { l: "平台含税售价",                     v: "153 元/罐",  hl: true },
    { l: "平台不含税售价 (NNS)",             v: "135.4 元/罐", hl: false },
    { l: "运费",                             v: "8 元/罐",    hl: false },
    { l: "汇付平台手续费 (0.6%)",            v: "0.92 元/罐", hl: false },
    { l: "单罐门店激励",                     v: "10 元/罐",   hl: false },
    { l: "投资费用申请",                     v: "25 万元",    hl: true }
  ];

  const priceY0 = 2.85;
  const pRowH = 0.3;
  priceRows.forEach((pr, i) => {
    const py = priceY0 + i * pRowH;
    s3.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y: py, w: 4.5, h: pRowH,
      fill: { color: i % 2 === 0 ? C.bg : C.white }
    });
    s3.addText(pr.l, {
      x: 0.7, y: py, w: 2.8, h: pRowH,
      fontSize: 9, fontFace: FONT,
      color: pr.hl ? C.primary : C.muted,
      bold: pr.hl, valign: "middle", margin: 0
    });
    s3.addText(pr.v, {
      x: 3.5, y: py, w: 1.5, h: pRowH,
      fontSize: 9, fontFace: FONT_NUM,
      color: pr.hl ? C.primary : C.text,
      bold: pr.hl, align: "right", valign: "middle", margin: 0
    });
  });

  // ── RIGHT COLUMN: Next Steps ──
  sectionHeader(s3, 5.4, 1.0, 4.0, "下一步计划", C.accent);

  const nsItems = [
    { n: "1", t: "费用申请流程",  p: "负责人：东达",           s: "待业务反馈" },
    { n: "2", t: "业务推广",      p: "负责人：东达 & Digital & CRM", s: "待启动" }
  ];

  nsItems.forEach((item, i) => {
    const nsy = 1.65 + i * 0.85;
    s3.addShape(pres.shapes.RECTANGLE, {
      x: 5.4, y: nsy, w: 4.0, h: 0.7,
      fill: { color: C.bg }
    });
    // Number
    s3.addShape(pres.shapes.OVAL, {
      x: 5.55, y: nsy + 0.13, w: 0.38, h: 0.38,
      fill: { color: C.primaryL }
    });
    s3.addText(item.n, {
      x: 5.55, y: nsy + 0.13, w: 0.38, h: 0.38,
      fontSize: 14, fontFace: FONT_NUM, color: C.white,
      bold: true, align: "center", valign: "middle", margin: 0
    });
    // Title / person
    s3.addText(item.t, {
      x: 6.1, y: nsy + 0.05, w: 2.2, h: 0.28,
      fontSize: 11, fontFace: FONT, color: C.text, bold: true, margin: 0
    });
    s3.addText(item.p, {
      x: 6.1, y: nsy + 0.32, w: 2.2, h: 0.24,
      fontSize: 9, fontFace: FONT, color: C.muted, margin: 0
    });
    // Status badge
    const isPending = item.s.includes("待");
    s3.addShape(pres.shapes.RECTANGLE, {
      x: 7.8, y: nsy + 0.2, w: 1.5, h: 0.28,
      fill: { color: isPending ? C.amberBg : C.greenBg }
    });
    s3.addText(item.s, {
      x: 7.8, y: nsy + 0.2, w: 1.5, h: 0.28,
      fontSize: 9, fontFace: FONT,
      color: isPending ? C.amber : C.green,
      align: "center", valign: "middle", margin: 0
    });
  });

  // ── RIGHT BOTTOM: Platform Value ──
  s3.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: 3.5, w: 4.0, h: 1.85,
    fill: { color: C.dark }
  });

  s3.addText("平台价值与业务支撑", {
    x: 5.55, y: 3.6, w: 3.7, h: 0.38,
    fontSize: 13, fontFace: FONT, color: C.accent, bold: true, margin: 0
  });

  const values = [
    "打通「线上下单 – 大仓履约 – 门店激励」全链路闭环",
    "支撑公司全员销售佳膳悠选战略落地",
    "终端门店零库存、零备货，降低运营成本",
    "依托现有中台能力，可快速复制至更多品类"
  ];

  values.forEach((v, i) => {
    s3.addText([
      { text: "✦  ", options: { color: C.accent, fontSize: 8 } },
      { text: v, options: { color: C.white, fontSize: 9 } }
    ], {
      x: 5.55, y: 4.1 + i * 0.3, w: 3.7, h: 0.26,
      fontFace: FONT, margin: 0, valign: "middle"
    });
  });

  bottomBar(s3);

  // ─── SAVE ───────────────────────────────────────────
  const outPath = "佳膳悠选项目进展汇报.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log(`PPT generated: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
