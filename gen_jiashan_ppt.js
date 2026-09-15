const pptxgen = require("pptxgenjs");

// ─── Constants ──────────────────────────────────
const C = {
  NAVY: "1B2A4A",
  BLUE: "2563EB",
  TEAL: "0891B2",
  GREEN: "059669",
  GREEN_LIGHT: "D1FAE5",
  AMBER: "D97706",
  AMBER_LIGHT: "FEF3C7",
  WHITE: "FFFFFF",
  LIGHT: "F1F5F9",
  LIGHTER: "F8FAFC",
  DARK: "1E293B",
  MUTED: "64748B",
  BORDER: "E2E8F0",
  CARD_BG: "FFFFFF",
};

const FONT = {
  TITLE: "Arial",
  BODY: "Arial",
};

// Helper: create fresh shadow object (avoid reuse pitfall)
const cardShadow = () => ({ type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.08 });
const cardBorder = () => ({ pt: 0.5, color: C.BORDER });

// ─── Initialize ─────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "小河马平台";
pres.title = "佳膳悠选项目进展汇报";

// ══════════════════════════════════════════════════
// SLIDE 1 — 封面 / 项目总览
// ══════════════════════════════════════════════════
const s1 = pres.addSlide();
s1.background = { color: C.NAVY };

// Top accent bar
s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.TEAL } });

// Project tag
s1.addText("小河马平台 · 项目进展汇报", {
  x: 0.8, y: 0.5, w: 4, h: 0.35,
  fontSize: 11, fontFace: FONT.BODY, color: C.TEAL,
  bold: true, charSpacing: 3, margin: 0,
});

// Main title
s1.addText("佳膳悠选", {
  x: 0.8, y: 1.1, w: 8.4, h: 0.9,
  fontSize: 42, fontFace: FONT.TITLE, color: C.WHITE,
  bold: true, margin: 0,
});

// Subtitle
s1.addText([
  { text: "全员销售线上化 ", options: { color: C.WHITE } },
  { text: "|", options: { color: C.TEAL } },
  { text: " 门店-大仓-中台全链路打通", options: { color: C.WHITE } },
], {
  x: 0.8, y: 2.05, w: 8.4, h: 0.55,
  fontSize: 20, fontFace: FONT.BODY, color: C.TEAL,
  margin: 0,
});

// Divider line
s1.addShape(pres.shapes.LINE, { x: 0.8, y: 2.85, w: 2.5, h: 0, line: { color: C.TEAL, width: 2 } });

// Stats row — 3 big number callouts
const statY = 3.2;
const statW = 2.6;
const statGap = 0.3;

const stats = [
  { num: "6", unit: "项", label: "系统任务全部上线", sub: "7月2日 — 7月17日" },
  { num: "25,000", unit: "罐", label: "8-12月销量预估", sub: "RSP ¥188 / 罐" },
  { num: "全链路", unit: "", label: "联调通过", sub: "6大系统协同打通" },
];

stats.forEach((s, i) => {
  const sx = 0.8 + i * (statW + statGap);

  // Card background
  s1.addShape(pres.shapes.RECTANGLE, {
    x: sx, y: statY, w: statW, h: 1.6,
    fill: { color: C.WHITE, transparency: 92 },
    line: { pt: 0.5, color: C.WHITE, transparency: 80 },
    rectRadius: 0,
  });

  // Number
  s1.addText(s.num, {
    x: sx, y: statY + 0.15, w: statW, h: 0.7,
    fontSize: 36, fontFace: FONT.TITLE, color: C.WHITE,
    bold: true, align: "center", valign: "middle", margin: 0,
  });
  // Label
  s1.addText(s.label, {
    x: sx, y: statY + 0.9, w: statW, h: 0.35,
    fontSize: 13, fontFace: FONT.BODY, color: C.WHITE,
    align: "center", valign: "middle", margin: 0,
  });
  // Sub
  s1.addText(s.sub, {
    x: sx, y: statY + 1.25, w: statW, h: 0.25,
    fontSize: 9, fontFace: FONT.BODY, color: C.TEAL,
    align: "center", valign: "middle", margin: 0,
  });
});

// Footer
s1.addText("2025年7月  |  小河马平台团队", {
  x: 0.8, y: 5.1, w: 8.4, h: 0.3,
  fontSize: 9, fontFace: FONT.BODY, color: C.MUTED,
  align: "right", margin: 0,
});

// ══════════════════════════════════════════════════
// SLIDE 2 — 系统执行链路 & 售价测算
// ══════════════════════════════════════════════════
const s2 = pres.addSlide();
s2.background = { color: C.LIGHT };

// ── Section header ──
s2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.BLUE } });
s2.addText("系统执行链路 & 售价测算", {
  x: 0.5, y: 0.2, w: 9, h: 0.5,
  fontSize: 22, fontFace: FONT.TITLE, color: C.DARK,
  bold: true, margin: 0,
});

// ── LEFT COLUMN: System Tasks (6 cards in 2x3) ──
s2.addText("关键交付内容", {
  x: 0.5, y: 0.85, w: 4, h: 0.3,
  fontSize: 13, fontFace: FONT.BODY, color: C.MUTED,
  bold: true, charSpacing: 2, margin: 0,
});

const tasks = [
  { title: "三方收款开通", desc: "汇付平台", date: "7/2" },
  { title: "线上下单履约", desc: "小河马 ↔ 管易云OMS", date: "7/6" },
  { title: "绩点奖励改造", desc: "小河马 ↔ 中台 ↔ 达生", date: "7/3" },
  { title: "财务核销流程", desc: "管易云OMS ↔ 汇付", date: "7/17" },
  { title: "电子发票对接", desc: "小河马 ↔ 电票平台", date: "7/10" },
  { title: "全链路业务联调", desc: "6大系统协同联调", date: "7/17" },
];

const cardW = 1.75;
const cardH = 1.1;
const cardStartX = 0.5;
const cardStartY = 1.25;
const cardGapX = 0.1;
const cardGapY = 0.12;
const cols = 3;

tasks.forEach((t, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cx = cardStartX + col * (cardW + cardGapX);
  const cy = cardStartY + row * (cardH + cardGapY);

  // Card bg
  s2.addShape(pres.shapes.RECTANGLE, {
    x: cx, y: cy, w: cardW, h: cardH,
    fill: { color: C.CARD_BG },
    shadow: cardShadow(),
    line: cardBorder(),
  });
  // Left accent on each card
  const accentColor = i === 5 ? C.BLUE : C.GREEN;
  s2.addShape(pres.shapes.RECTANGLE, {
    x: cx, y: cy, w: 0.06, h: cardH,
    fill: { color: accentColor },
  });
  // Title
  s2.addText(t.title, {
    x: cx + 0.15, y: cy + 0.12, w: cardW - 0.25, h: 0.3,
    fontSize: 10, fontFace: FONT.BODY, color: C.DARK,
    bold: true, margin: 0, valign: "middle",
  });
  // Completed status
  s2.addText("已完成", {
    x: cx + 0.15, y: cy + 0.42, w: 0.45, h: 0.2,
    fontSize: 7, fontFace: FONT.BODY, color: C.GREEN,
    bold: true, margin: 0, valign: "middle",
  });
  // Description
  s2.addText(t.desc, {
    x: cx + 0.6, y: cy + 0.42, w: cardW - 0.72, h: 0.2,
    fontSize: 8, fontFace: FONT.BODY, color: C.MUTED,
    margin: 0, valign: "middle",
  });
  // Date
  s2.addText(t.date, {
    x: cx + 0.15, y: cy + 0.72, w: cardW - 0.25, h: 0.25,
    fontSize: 10, fontFace: FONT.BODY, color: C.BLUE,
    bold: true, margin: 0, valign: "middle",
  });
});

// ── RIGHT COLUMN: Pricing Table ──
const rX = 6.2;
const rW = 3.5;

s2.addText("售价测算（8-12月）", {
  x: rX, y: 0.85, w: rW, h: 0.3,
  fontSize: 13, fontFace: FONT.BODY, color: C.MUTED,
  bold: true, charSpacing: 2, margin: 0,
});

// Pricing table
const pricingHeader = [
  { text: "事项", options: { fill: { color: C.NAVY }, color: C.WHITE, bold: true, fontSize: 9, fontFace: FONT.BODY, align: "center" } },
  { text: "金额", options: { fill: { color: C.NAVY }, color: C.WHITE, bold: true, fontSize: 9, fontFace: FONT.BODY, align: "center" } },
  { text: "备注", options: { fill: { color: C.NAVY }, color: C.WHITE, bold: true, fontSize: 9, fontFace: FONT.BODY, align: "center" } },
];

const pricingRows = [
  ["销量预估", "25,000 罐", "8-12月累计"],
  ["RSP零售价", "¥188 /罐", "官方建议零售价"],
  ["平台销售价(含税)", "¥153 /罐", "小河马零售价"],
  ["NNS(不含税)", "¥135.4 /罐", "零售价不含税"],
  ["预估运费", "¥8 /罐", "大仓直发"],
  ["汇付手续费", "¥0.92 /罐", "0.6%费率"],
  ["单罐激励", "¥10 /罐", "与微商城一致"],
];

const pricingData = [
  pricingHeader,
  ...pricingRows.map((r) => r.map((c, ci) => ({
    text: c,
    options: {
      fill: { color: C.CARD_BG },
      color: ci === 1 ? C.DARK : C.MUTED,
      bold: ci === 1,
      fontSize: 9,
      fontFace: FONT.BODY,
      align: ci === 0 ? "left" : "center",
      margin: [3, 6, 3, 6],
    },
  }))),
];

s2.addTable(pricingData, {
  x: rX, y: 1.25, w: rW, h: 2.9,
  colW: [1.3, 1, 1.2],
  border: { pt: 0.5, color: C.BORDER },
  rowH: [0.3, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28],
});

// Investment highlight
s2.addShape(pres.shapes.RECTANGLE, {
  x: rX, y: 4.3, w: rW, h: 0.45,
  fill: { color: C.AMBER_LIGHT },
  line: { pt: 1, color: C.AMBER },
});
s2.addText([
  { text: "投资费用申请总计：", options: { color: C.DARK, bold: false, fontSize: 10 } },
  { text: "¥250,000", options: { color: C.AMBER, bold: true, fontSize: 16 } },
], {
  x: rX, y: 4.3, w: rW, h: 0.45,
  align: "center", valign: "middle", fontFace: FONT.BODY, margin: 0,
});

// ── BOTTOM: Business Flow ──
const flowY = 3.7;
s2.addText("业务运行链路", {
  x: 0.5, y: flowY, w: 5.5, h: 0.3,
  fontSize: 13, fontFace: FONT.BODY, color: C.MUTED,
  bold: true, charSpacing: 2, margin: 0,
});

// 3 flow steps
const flows = [
  { step: "01", title: "终端下单", desc: "消费者小河马\n线上下单购买" },
  { step: "02", title: "大仓履约", desc: "公司大仓统一\n发货至消费者" },
  { step: "03", title: "门店激励", desc: "中台发放\n门店售卖激励" },
];

const flowCardW = 1.65;
const flowStartX = 0.5;

flows.forEach((f, i) => {
  const fx = flowStartX + i * (flowCardW + 0.15);
  const fy = 4.05;

  s2.addShape(pres.shapes.RECTANGLE, {
    x: fx, y: fy, w: flowCardW, h: 1.05,
    fill: { color: C.CARD_BG },
    shadow: cardShadow(),
    line: cardBorder(),
  });
  // Step number circle
  s2.addShape(pres.shapes.OVAL, {
    x: fx + 0.1, y: fy + 0.1, w: 0.35, h: 0.35,
    fill: { color: C.BLUE },
  });
  s2.addText(f.step, {
    x: fx + 0.1, y: fy + 0.1, w: 0.35, h: 0.35,
    fontSize: 11, fontFace: FONT.TITLE, color: C.WHITE,
    bold: true, align: "center", valign: "middle", margin: 0,
  });
  // Title
  s2.addText(f.title, {
    x: fx + 0.55, y: fy + 0.12, w: flowCardW - 0.65, h: 0.3,
    fontSize: 11, fontFace: FONT.BODY, color: C.DARK,
    bold: true, margin: 0, valign: "middle",
  });
  // Desc
  s2.addText(f.desc, {
    x: fx + 0.12, y: fy + 0.55, w: flowCardW - 0.24, h: 0.45,
    fontSize: 9, fontFace: FONT.BODY, color: C.MUTED,
    margin: 0, valign: "top",
  });
  // Arrow between flow cards (except last)
  if (i < 2) {
    s2.addText("→", {
      x: fx + flowCardW + 0.02, y: fy + 0.35, w: 0.15, h: 0.3,
      fontSize: 16, fontFace: FONT.BODY, color: C.BLUE,
      bold: true, align: "center", valign: "middle", margin: 0,
    });
  }
});

// ── Next Steps section (right of flows) ──
const nsX = 6.2;
const nsY = 5.18;

s2.addText("下一步跟进事项", {
  x: nsX, y: nsY - 0.05, w: rW, h: 0.25,
  fontSize: 11, fontFace: FONT.BODY, color: C.MUTED,
  bold: true, margin: 0,
});

const nextSteps = [
  { title: "费用申请流程", owner: "东达" },
  { title: "业务推广方案", owner: "东达 & Digital & CRM" },
];

nextSteps.forEach((ns, i) => {
  const ny = nsY + 0.22 + i * 0.22;
  s2.addShape(pres.shapes.RECTANGLE, {
    x: nsX, y: ny, w: 0.18, h: 0.18,
    fill: { color: C.AMBER_LIGHT },
    line: { pt: 0.5, color: C.AMBER },
  });
  s2.addText((i + 1).toString(), {
    x: nsX, y: ny, w: 0.18, h: 0.18,
    fontSize: 8, fontFace: FONT.TITLE, color: C.AMBER,
    bold: true, align: "center", valign: "middle", margin: 0,
  });
  s2.addText(ns.title, {
    x: nsX + 0.25, y: ny - 0.02, w: 1.5, h: 0.22,
    fontSize: 9, fontFace: FONT.BODY, color: C.DARK,
    margin: 0, valign: "middle",
  });
  s2.addText(ns.owner, {
    x: nsX + 1.8, y: ny - 0.02, w: 1.6, h: 0.22,
    fontSize: 8, fontFace: FONT.BODY, color: C.MUTED,
    margin: 0, valign: "middle",
  });
});

// ══════════════════════════════════════════════════
// SLIDE 3 — 平台价值 & 业务支撑
// ══════════════════════════════════════════════════
const s3 = pres.addSlide();
s3.background = { color: C.LIGHT };

s3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.TEAL } });

// Title
s3.addText("平台价值与业务支撑", {
  x: 0.5, y: 0.2, w: 9, h: 0.5,
  fontSize: 22, fontFace: FONT.TITLE, color: C.DARK,
  bold: true, margin: 0,
});

// Subtitle
s3.addText("小河马平台作为公司数字化零售基础设施，为佳膳悠选全员销售战略提供端到端技术支撑", {
  x: 0.5, y: 0.75, w: 9, h: 0.35,
  fontSize: 12, fontFace: FONT.BODY, color: C.MUTED,
  margin: 0,
});

// ── 4 Value Cards (2x2 grid) ──
const vCards = [
  {
    icon: "01",
    title: "全链路数字化闭环",
    desc: "打通「下单—履约—结算—激励」完整链路，消费者线上下单、大仓直发、门店自动获得激励，实现业务流、物流、资金流三流合一。",
    accent: C.BLUE,
  },
  {
    icon: "02",
    title: "多系统高效协同",
    desc: "小河马平台作为中枢，无缝对接汇付支付、管易云OMS、中台、达生、越海仓、电票平台共6个外部系统，保障业务高效运转。",
    accent: C.TEAL,
  },
  {
    icon: "03",
    title: "门店零库存轻运营",
    desc: "门店无需备货，通过小河马领取任务即可参与销售并获取激励，大幅降低门店参与门槛，快速实现全员销售覆盖。",
    accent: C.GREEN,
  },
  {
    icon: "04",
    title: "数据驱动业务增长",
    desc: "平台沉淀全链条交易数据，支持实时追踪销量、激励发放、履约效率，为后续精准营销和运营优化提供数据基础。",
    accent: C.AMBER,
  },
];

const vStartY = 1.3;
const vCardW = 4.2;
const vCardH = 1.8;
const vGapX = 0.6;
const vGapY = 0.2;

vCards.forEach((vc, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const vx = 0.5 + col * (vCardW + vGapX);
  const vy = vStartY + row * (vCardH + vGapY);

  // Card bg
  s3.addShape(pres.shapes.RECTANGLE, {
    x: vx, y: vy, w: vCardW, h: vCardH,
    fill: { color: C.CARD_BG },
    shadow: cardShadow(),
    line: cardBorder(),
  });

  // Top accent bar
  s3.addShape(pres.shapes.RECTANGLE, {
    x: vx, y: vy, w: vCardW, h: 0.06,
    fill: { color: vc.accent },
  });

  // Icon circle
  s3.addShape(pres.shapes.OVAL, {
    x: vx + 0.2, y: vy + 0.25, w: 0.5, h: 0.5,
    fill: { color: vc.accent, transparency: 12 },
    line: { pt: 1.5, color: vc.accent },
  });
  s3.addText(vc.icon, {
    x: vx + 0.2, y: vy + 0.25, w: 0.5, h: 0.5,
    fontSize: 16, fontFace: FONT.TITLE, color: vc.accent,
    bold: true, align: "center", valign: "middle", margin: 0,
  });

  // Title
  s3.addText(vc.title, {
    x: vx + 0.85, y: vy + 0.28, w: vCardW - 1.1, h: 0.4,
    fontSize: 14, fontFace: FONT.BODY, color: C.DARK,
    bold: true, margin: 0, valign: "middle",
  });

  // Description
  s3.addText(vc.desc, {
    x: vx + 0.2, y: vy + 0.9, w: vCardW - 0.4, h: 0.75,
    fontSize: 10, fontFace: FONT.BODY, color: C.MUTED,
    margin: 0, valign: "top", lineSpacingMultiple: 1.5,
  });
});

// ── Bottom Banner ──
const bnrY = 5.05;
s3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: bnrY, w: 9, h: 0.42,
  fill: { color: C.NAVY },
});

s3.addText([
  { text: "平台定位：", options: { bold: true, color: C.TEAL } },
  { text: "小河马平台作为公司数字化零售中枢，将持续支撑佳膳悠选及更多品类的线上化销售与激励闭环，助力公司全员销售战略落地。", options: { color: C.WHITE } },
], {
  x: 0.7, y: bnrY, w: 8.6, h: 0.42,
  fontSize: 10, fontFace: FONT.BODY,
  align: "left", valign: "middle", margin: 0,
});

// ─── Generate ────────────────────────────────────
const outPath = "C:/Users/CNYangMe8/Documents/work/AI_coding/佳膳悠选项目进展汇报_v2.pptx";
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("PPT generated: " + outPath);
}).catch((err) => {
  console.error("Error:", err);
});
