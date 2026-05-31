import { jsPDF } from "jspdf";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 44;
const SCALE = 2;
const BODY_FONT = "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif";

function hasRtlText(value) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(value ?? ""));
}

function cleanLine(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(ctx, value, maxWidth) {
  const words = cleanLine(value).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  function pushLongWord(word) {
    let chunk = "";
    Array.from(word).forEach((char) => {
      const next = `${chunk}${char}`;
      if (ctx.measureText(next).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    });
    current = chunk;
  }

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width > maxWidth) {
      pushLongWord(word);
    } else {
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function fillRect(ctx, x, y, width, height, color, stroke = "") {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
}

function drawText(ctx, text, x, y, options = {}) {
  const { size = 10, bold = false, color = "#102033", maxWidth = 0 } = options;
  const value = String(text ?? "");
  const rtl = hasRtlText(value);
  ctx.save();
  ctx.font = `${bold ? 700 : 400} ${size}px ${BODY_FONT}`;
  ctx.fillStyle = color;
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl && maxWidth ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, rtl && maxWidth ? x + maxWidth : x, y);
  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, options = {}) {
  const { size = 10, bold = false, color = "#102033", leading = 14 } = options;
  ctx.save();
  ctx.font = `${bold ? 700 : 400} ${size}px ${BODY_FONT}`;
  const lines = wrapText(ctx, text, maxWidth);
  ctx.restore();
  lines.forEach((line, index) => {
    drawText(ctx, line, x, y + index * leading, { size, bold, color, maxWidth });
  });
  return lines.length * leading;
}

function createPageCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * SCALE;
  canvas.height = PAGE_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  return { canvas, ctx };
}

function buildImagePdf(pageCanvases) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    compress: true,
  });

  pageCanvases.forEach((canvas, index) => {
    if (index > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], "portrait");
    pdf.addImage(canvas, "PNG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, "FAST");
  });

  return pdf.output("blob");
}

export function createHealthTrustPdf({ title, subtitle = "", meta = [], sections = [], footer = "HealthTrust prototype report" }) {
  const pages = [];
  let current = null;
  let y = 0;

  function startPage() {
    current = createPageCanvas();
    const { ctx } = current;
    fillRect(ctx, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, "#f5f8fb");
    fillRect(ctx, 0, 0, PAGE_WIDTH, 80, "#0a84ff");
    fillRect(ctx, 0, 80, PAGE_WIDTH, 12, "#22b8aa");
    fillRect(ctx, 44, 18, 38, 38, "#22b8aa");
    drawText(ctx, "HT", 54, 43, { size: 15, bold: true, color: "#ffffff" });
    drawText(ctx, "HealthTrust", 94, 32, { size: 12, bold: true, color: "#ffffff" });
    drawText(ctx, "Encrypted medical record sharing", 94, 50, { size: 9, color: "#eaf7ff" });
    drawText(ctx, new Date().toLocaleString(), 430, 32, { size: 8, color: "#eaf7ff" });
    y = 118;
  }

  function finishPage() {
    if (!current) return;
    const { canvas, ctx } = current;
    ctx.strokeStyle = "#d7e2ec";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN, PAGE_HEIGHT - 38);
    ctx.lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 38);
    ctx.stroke();
    drawText(ctx, footer, MARGIN, PAGE_HEIGHT - 24, { size: 8, color: "#647486", maxWidth: PAGE_WIDTH - MARGIN * 2 });
    pages.push(canvas);
    current = null;
  }

  function ensureSpace(height) {
    if (y + height > PAGE_HEIGHT - 58) {
      finishPage();
      startPage();
    }
  }

  startPage();
  y += drawWrappedText(current.ctx, title, MARGIN, y + 24, PAGE_WIDTH - MARGIN * 2, { size: 22, bold: true, color: "#061524", leading: 26 });
  if (subtitle) {
    y += 4;
    y += drawWrappedText(current.ctx, subtitle, MARGIN, y + 14, PAGE_WIDTH - MARGIN * 2, { size: 10, color: "#647486", leading: 14 });
  }
  y += 10;

  if (meta.length) {
    const cardHeight = 58;
    const gap = 10;
    const cardWidth = (PAGE_WIDTH - MARGIN * 2 - gap) / 2;
    for (let index = 0; index < meta.length; index += 2) {
      ensureSpace(cardHeight + 16);
      [0, 1].forEach((offset) => {
        const item = meta[index + offset];
        if (!item) return;
        const x = MARGIN + offset * (cardWidth + gap);
        fillRect(current.ctx, x, y, cardWidth, cardHeight, "#ffffff", "#d7e2ec");
        fillRect(current.ctx, x, y, 5, 10, "#22b8aa");
        drawText(current.ctx, item.label, x + 16, y + 30, { size: 8, bold: true, color: "#647486", maxWidth: cardWidth - 32 });
        current.ctx.save();
        current.ctx.font = `400 9px ${BODY_FONT}`;
        wrapText(current.ctx, item.value, cardWidth - 32)
          .slice(0, 2)
          .forEach((line, lineIndex) => {
            drawText(current.ctx, line, x + 16, y + 47 + lineIndex * 12, { size: 9, color: "#102033", maxWidth: cardWidth - 32 });
          });
        current.ctx.restore();
      });
      y += cardHeight + 10;
    }
  }

  sections.forEach((section) => {
    ensureSpace(78);
    y += 8;
    fillRect(current.ctx, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 30, "#ffffff", "#d7e2ec");
    fillRect(current.ctx, MARGIN, y, 6, 30, section.accent || "#0a84ff");
    drawText(current.ctx, section.heading, MARGIN + 16, y + 20, { size: 13, bold: true, color: "#061524", maxWidth: PAGE_WIDTH - MARGIN * 2 - 32 });
    y += 48;

    (section.rows || []).forEach((row) => {
      const label = typeof row === "string" ? "" : row.label;
      const value = typeof row === "string" ? row : row.value;
      current.ctx.save();
      current.ctx.font = `400 10px ${BODY_FONT}`;
      const lines = wrapText(current.ctx, value, PAGE_WIDTH - MARGIN * 2);
      current.ctx.restore();
      ensureSpace(lines.length * 14 + (label ? 18 : 6));
      if (label) {
        drawText(current.ctx, label, MARGIN, y, { size: 8, bold: true, color: "#647486", maxWidth: PAGE_WIDTH - MARGIN * 2 });
        y += 12;
      }
      y += drawWrappedText(current.ctx, value, MARGIN, y, PAGE_WIDTH - MARGIN * 2, { size: 10, color: "#102033", leading: 14 });
      y += 7;
    });
  });

  finishPage();
  return buildImagePdf(pages);
}
