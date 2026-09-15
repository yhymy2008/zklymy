const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "小河马平台项目组";
pres.title = "佳膳悠选线上售卖项目结项汇报";

// ─── 配色方案 ────────────────────────────
const C = {
  navy: "1A365D",
  teal: "2B6CB0",
  lightBlue: "BEE3F8",
  bgGray: "F7FAFC",
  white: "FFFFFF",
  darkText: "1A202C",
  grayText: "718096",
  success: "38A169",
  warning: "D69E2E",
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 4, offset: 2, angle: 135, opacity: 0.06,
});

// ================================================================
// SLIDE 1：项目概况 — 核心业务链路 + 关键成果
// ================================================================
const slide1 = pres.addSlide();
slide1.background = { color: C.white };

// 顶部深色横条
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 1.3,
  fill: { color: C.navy },
});

slide1.addText("佳膳悠选线上售卖项目结项汇报", {
  x: 0.6, y: 0.12, w: 8.8, h: 0.48,
  fontSize: 26, fontFace: "Microsoft YaHei", color: C.white, bold: true, margin: 0,
});
slide1.addText("小河马平台  ·  全链路打通  ·  正式上线", {
  x: 0.6, y: 0.62, w: 8.8, h: 0.3,
  fontSize: 13, fontFace: "Microsoft YaHei", color: "A3C5E8", margin: 0,
});
slide1.addText("2026年7月  |  项目结项", {
  x: 0.6, y: 0.94, w: 8.8, h: 0.22,
  fontSize: 10, fontFace: "Microsoft YaHei", color: "7FA8D0", margin: 0,
});

// 章节标题：业务运行链路
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0.6, y: 1.52, w: 0.07, h: 0.32,
  fill: { color: C.teal },
});
slide1.addText("业务运行链路", {
  x: 0.85, y: 1.5, w: 3, h: 0.36,
  fontSize: 15, fontFace: "Microsoft YaHei", color: C.navy, bold: true, margin: 0,
});

// 三步卡片
const cardW = 2.7;
const cardH = 1.6;
const cardY = 2.0;
const cardGap = 0.28;
const cardStartX = 0.55;

const flowSteps = [
  { num: "01", title: "终端下单", desc: "消费者在小河马平台\n线上下单购买佳膳悠选" },
  { num: "02", title: "大仓履约发货", desc: "订单由公司大仓统一\n发货到消费者\n无需门店备货" },
  { num: "03", title: "门店激励结算", desc: "依托现有公司中台能力\n门店领取任务\n获得售卖激励" },
];

flowSteps.forEach((step, i) => {
  const cx = cardStartX + i * (cardW + cardGap);

  // 卡片底色
  slide1.addShape(pres.shapes.RECTANGLE, {
    x: cx, y: cardY, w: cardW, h: cardH,
    fill: { color: C.bgGray },
    shadow: makeShadow(),
  });

  // 序号圆圈
  slide1.addShape(pres.shapes.OVAL, {
    x: cx + 0.15, y: cardY + 0.14, w: 0.4, h: 0.4,
    fill: { color: C.teal },
  });
  slide1.addText(step.num, {
    x: cx + 0.15, y: cardY + 0.14, w: 0.4, h: 0.4,
    fontSize: 14, fontFace: "Arial", color: C.white, bold: true,
    align: "center", valign: "middle", margin: 0,
  });

  // 步骤标题
  slide1.addText(step.title, {
    x: cx + 0.7, y: cardY + 0.12, w: cardW - 0.9, h: 0.44,
    fontSize: 14, fontFace: "Microsoft YaHei", color: C.navy, bold: true, margin: 0,
  });

  // 描述文字
  slide1.addText(step.desc, {
    x: cx + 0.2, y: cardY + 0.7, w: cardW - 0.4, h: cardH - 0.85,
    fontSize: 11, fontFace: "Microsoft YaHei", color: C.grayText, margin: 0,
    lineSpacingMultiple: 1.6,
  });
});

// 步骤间箭头
for (let i = 0; i < 2; i++) {
  const ax = cardStartX + (i + 1) * cardW + i * cardGap + cardGap / 2 - 0.12;
  slide1.addText("\u25B6", {
    x: ax, y: cardY + cardH / 2 - 0.16, w: 0.28, h: 0.32,
    fontSize: 14, color: C.teal, align: "center", valign: "middle", margin: 0,
  });
}

// 底部关键数据条
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0.6, y: 3.9, w: 8.8, h: 0.015,
  fill: { color: "CBD5E0" },
});

const kpiData = [
  { value: "6项", label: "系统交付完成", sub: "全部按时上线" },
  { value: "6方", label: "平台对接集成", sub: "全链路联调通过" },
  { value: "5位", label: "一线业务代表访谈", sub: "北区调研完成" },
];

const kpiW = 2.85;
kpiData.forEach((k, i) => {
  const kx = 0.6 + i * (kpiW + 0.1);
  slide1.addText(k.value, {
    x: kx, y: 4.15, w: kpiW, h: 0.48,
    fontSize: 28, fontFace: "Arial", color: C.teal, bold: true,
    align: "center", margin: 0,
  });
  slide1.addText(k.label, {
    x: kx, y: 4.6, w: kpiW, h: 0.28,
    fontSize: 12, fontFace: "Microsoft YaHei", color: C.darkText, align: "center", margin: 0,
  });
  slide1.addText(k.sub, {
    x: kx, y: 4.85, w: kpiW, h: 0.22,
    fontSize: 10, fontFace: "Microsoft YaHei", color: C.grayText, align: "center", margin: 0,
  });
});

// 页脚
slide1.addText("小河马平台项目组  |  2026年7月", {
  x: 0.6, y: 5.28, w: 8.8, h: 0.2,
  fontSize: 8, fontFace: "Microsoft YaHei", color: C.grayText, align: "right", margin: 0,
});

// ================================================================
// SLIDE 2：关键交付里程碑
// ================================================================
const slide2 = pres.addSlide();
slide2.background = { color: C.white };

// 顶部深色横条
slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 1.0,
  fill: { color: C.navy },
});
slide2.addText("关键交付与完成内容", {
  x: 0.6, y: 0.12, w: 8.8, h: 0.42,
  fontSize: 22, fontFace: "Microsoft YaHei", color: C.white, bold: true, margin: 0,
});
slide2.addText("6大关键节点全部按时交付，全链路系统正式打通上线", {
  x: 0.6, y: 0.56, w: 8.8, h: 0.28,
  fontSize: 11, fontFace: "Microsoft YaHei", color: "A3C5E8", margin: 0,
});

// 交付项列表
const milestones = [
  { no: "1", title: "三方平台收款账号开通", sub: "汇付平台", date: "7月2日" },
  { no: "2", title: "用户线上下单履约", sub: "小河马平台 \u2194 管易云", date: "7月6日" },
  { no: "3", title: "绩点奖励流程改造", sub: "小河马 \u2192 中台 \u2192 达生平台", date: "7月3日" },
  { no: "4", title: "财务核销流程", sub: "管易云 OMS \u2194 汇付平台", date: "7月17日" },
  { no: "5", title: "电子发票对接", sub: "小河马 \u2192 诺诺电子发票平台", date: "7月10日" },
  { no: "6", title: "全链路业务联调", sub: "小河马 \u2192 中台 \u2192 达生 \u2192 管易云 \u2192 越海仓 \u2192 汇付平台", date: "7月17日" },
];

const rowY = 1.2;
const rowH = 0.62;
const rowGap = 0.08;

milestones.forEach((m, i) => {
  const ry = rowY + i * (rowH + rowGap);

  // 行底色（斑马纹）
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: ry, w: 8.8, h: rowH,
    fill: { color: i % 2 === 0 ? C.bgGray : C.white },
  });

  // 序号标识
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: ry + 0.11, w: 0.4, h: 0.4,
    fill: { color: C.teal },
  });
  slide2.addText(m.no, {
    x: 0.7, y: ry + 0.11, w: 0.4, h: 0.4,
    fontSize: 15, fontFace: "Arial", color: C.white, bold: true,
    align: "center", valign: "middle", margin: 0,
  });

  // 标题
  slide2.addText(m.title, {
    x: 1.3, y: ry + 0.04, w: 4.2, h: 0.3,
    fontSize: 13, fontFace: "Microsoft YaHei", color: C.darkText, bold: true, margin: 0,
  });

  // 子标题（平台名称）
  slide2.addText(m.sub, {
    x: 1.3, y: ry + 0.34, w: 4.2, h: 0.22,
    fontSize: 10, fontFace: "Microsoft YaHei", color: C.grayText, margin: 0,
  });

  // 完成状态标签
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: 6.5, y: ry + 0.16, w: 0.82, h: 0.3,
    fill: { color: C.success },
  });
  slide2.addText("\u2713 已完成", {
    x: 6.5, y: ry + 0.16, w: 0.82, h: 0.3,
    fontSize: 9, fontFace: "Microsoft YaHei", color: C.white, bold: true,
    align: "center", valign: "middle", margin: 0,
  });

  // 分隔线
  slide2.addShape(pres.shapes.LINE, {
    x: 7.5, y: ry + 0.14, w: 0, h: 0.34,
    line: { color: "CBD5E0", width: 1 },
  });

  // 日期
  slide2.addText(m.date, {
    x: 7.7, y: ry + 0.04, w: 1.6, h: 0.54,
    fontSize: 12, fontFace: "Microsoft YaHei", color: C.grayText, margin: 0,
    valign: "middle",
  });
});

// 底部提示
slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0.6, y: 4.95, w: 8.8, h: 0.015,
  fill: { color: "CBD5E0" },
});
slide2.addText("最后联调完成日期：2026年7月17日，项目具备正式上线条件", {
  x: 0.6, y: 5.05, w: 8.8, h: 0.3,
  fontSize: 10, fontFace: "Microsoft YaHei", color: C.grayText, align: "center", margin: 0,
});
slide2.addText("小河马平台项目组  |  2026年7月", {
  x: 0.6, y: 5.3, w: 8.8, h: 0.18,
  fontSize: 8, fontFace: "Microsoft YaHei", color: C.grayText, align: "right", margin: 0,
});

// ================================================================
// SLIDE 3：一线调研 + 下一步计划
// ================================================================
const slide3 = pres.addSlide();
slide3.background = { color: C.white };

// 顶部深色横条
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 1.0,
  fill: { color: C.navy },
});
slide3.addText("一线调研与下一步计划", {
  x: 0.6, y: 0.12, w: 8.8, h: 0.42,
  fontSize: 22, fontFace: "Microsoft YaHei", color: C.white, bold: true, margin: 0,
});
slide3.addText("业务代表访谈 & 后续推进事项", {
  x: 0.6, y: 0.56, w: 8.8, h: 0.28,
  fontSize: 11, fontFace: "Microsoft YaHei", color: "A3C5E8", margin: 0,
});

// ─── 左侧：访谈 ───
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.6, y: 1.25, w: 4.2, h: 3.9,
  fill: { color: C.bgGray },
  shadow: makeShadow(),
});

// 章节标题
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.38, w: 0.055, h: 0.3,
  fill: { color: C.teal },
});
slide3.addText("业务代表沟通访谈", {
  x: 1.0, y: 1.36, w: 3.5, h: 0.34,
  fontSize: 15, fontFace: "Microsoft YaHei", color: C.navy, bold: true, margin: 0,
});

// 大数字
slide3.addShape(pres.shapes.OVAL, {
  x: 0.8, y: 1.95, w: 0.6, h: 0.6,
  fill: { color: C.teal },
});
slide3.addText("5", {
  x: 0.8, y: 1.95, w: 0.6, h: 0.6,
  fontSize: 24, fontFace: "Arial", color: C.white, bold: true,
  align: "center", valign: "middle", margin: 0,
});
slide3.addText("位北区业务代表", {
  x: 1.6, y: 2.0, w: 2.8, h: 0.5,
  fontSize: 18, fontFace: "Microsoft YaHei", color: C.darkText, bold: true, margin: 0,
});

slide3.addText("已完成一线业务代表深度访谈，收集对线上售卖\n流程的反馈与优化建议，为后续业务推广输入。", {
  x: 0.8, y: 2.7, w: 3.7, h: 0.7,
  fontSize: 11, fontFace: "Microsoft YaHei", color: C.grayText, margin: 0,
  lineSpacingMultiple: 1.6,
});

// 分隔
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.5, w: 3.7, h: 0.012,
  fill: { color: "CBD5E0" },
});

slide3.addText("访谈聚焦", {
  x: 0.8, y: 3.65, w: 3.7, h: 0.26,
  fontSize: 11, fontFace: "Microsoft YaHei", color: C.navy, bold: true, margin: 0,
});

const interviewPoints = [
  "线上售卖流程的操作体验反馈",
  "门店激励结算机制的优化建议",
  "消费者下单到收货的履约体验",
];

interviewPoints.forEach((pt, i) => {
  const iy = 3.95 + i * 0.3;
  slide3.addText("\u2022 " + pt, {
    x: 0.95, y: iy, w: 3.5, h: 0.26,
    fontSize: 10, fontFace: "Microsoft YaHei", color: C.grayText, margin: 0,
  });
});

// ─── 右侧：下一步计划 ───
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 5.15, y: 1.25, w: 4.4, h: 3.9,
  fill: { color: C.navy },
  shadow: makeShadow(),
});

slide3.addText("下一步跟进事项", {
  x: 5.4, y: 1.36, w: 3.9, h: 0.34,
  fontSize: 15, fontFace: "Microsoft YaHei", color: C.white, bold: true, margin: 0,
});

// 子卡片 1
const ncItems = [
  {
    title: "费用申请流程",
    owner: "责任方：东达",
    status: "待业务反馈",
    sColor: C.warning,
  },
  {
    title: "业务推广",
    owner: "责任方：东达 & Digital & CRM",
    status: "推进中",
    sColor: C.teal,
  },
];

ncItems.forEach((n, i) => {
  const ny = 1.95 + i * 1.55;

  // 卡片
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: ny, w: 3.9, h: 1.25,
    fill: { color: "254B6E" },
  });

  // 状态圆点
  slide3.addShape(pres.shapes.OVAL, {
    x: 5.58, y: ny + 0.14, w: 0.16, h: 0.16,
    fill: { color: n.sColor },
  });

  // 标题
  slide3.addText(n.title, {
    x: 5.88, y: ny + 0.06, w: 3.2, h: 0.32,
    fontSize: 14, fontFace: "Microsoft YaHei", color: C.white, bold: true, margin: 0,
  });

  // 责任方
  slide3.addText(n.owner, {
    x: 5.58, y: ny + 0.46, w: 3.5, h: 0.28,
    fontSize: 11, fontFace: "Microsoft YaHei", color: "A3C5E8", margin: 0,
  });

  // 状态
  slide3.addText("状态：" + n.status, {
    x: 5.58, y: ny + 0.76, w: 3.5, h: 0.28,
    fontSize: 11, fontFace: "Microsoft YaHei", color: "7FA8D0", margin: 0,
  });
});

// 页脚
slide3.addText("小河马平台项目组  |  2026年7月", {
  x: 0.6, y: 5.3, w: 8.8, h: 0.18,
  fontSize: 8, fontFace: "Microsoft YaHei", color: C.grayText, align: "right", margin: 0,
});

// ─── 输出 ──────────────────────────────
pres.writeFile({ fileName: "佳膳悠选项目结项汇报.pptx" }).then(() => {
  console.log("PPT generated: 佳膳悠选项目结项汇报.pptx");
}).catch(err => {
  console.error("Error:", err);
});
