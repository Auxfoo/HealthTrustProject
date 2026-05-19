function toPdfAscii(value) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function escapePdf(value) {
  return toPdfAscii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function cleanLine(value) {
  return toPdfAscii(value)
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(value, maxChars = 86) {
  const words = cleanLine(value).split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function rgb(hex) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function textCommand(text, x, y, size = 10, font = "F1", color = "#102033") {
  return `BT /${font} ${size} Tf ${rgb(color)} rg ${x} ${y} Td (${escapePdf(text)}) Tj ET`;
}

function rectCommand(x, y, width, height, color, stroke = "") {
  const fill = `${rgb(color)} rg ${x} ${y} ${width} ${height} re f`;
  if (!stroke) return fill;
  return `q ${fill} Q ${rgb(stroke)} RG ${x} ${y} ${width} ${height} re S`;
}

function lineCommand(x1, y1, x2, y2, color = "#d7e2ec") {
  return `${rgb(color)} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S`;
}

export function createHealthTrustPdf({ title, subtitle = "", meta = [], sections = [], footer = "HealthTrust prototype report" }) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 44;
  const pages = [];
  let commands = [];
  let y = 0;

  function startPage() {
    commands = [];
    commands.push(rectCommand(0, 0, pageWidth, pageHeight, "#f5f8fb"));
    commands.push(rectCommand(0, 712, pageWidth, 80, "#0a84ff"));
    commands.push(rectCommand(0, 712, pageWidth, 12, "#22b8aa"));
    commands.push(rectCommand(44, 734, 38, 38, "#22b8aa"));
    commands.push(textCommand("HT", 54, 746, 15, "F2", "#ffffff"));
    commands.push(textCommand("HealthTrust", 94, 755, 12, "F2", "#ffffff"));
    commands.push(textCommand("Encrypted medical record sharing", 94, 739, 9, "F1", "#eaf7ff"));
    commands.push(textCommand(new Date().toLocaleString(), 430, 755, 8, "F1", "#eaf7ff"));
    y = 682;
  }

  function finishPage() {
    commands.push(lineCommand(margin, 38, pageWidth - margin, 38, "#d7e2ec"));
    commands.push(textCommand(footer, margin, 24, 8, "F1", "#647486"));
    pages.push(commands.join("\n"));
  }

  function ensureSpace(height) {
    if (y - height < 58) {
      finishPage();
      startPage();
    }
  }

  function addWrapped(text, x, maxChars, size = 10, font = "F1", color = "#102033", leading = 14) {
    const lines = wrapText(text, maxChars);
    lines.forEach((line) => {
      commands.push(textCommand(line, x, y, size, font, color));
      y -= leading;
    });
  }

  startPage();
  commands.push(textCommand(title, margin, y, 22, "F2", "#061524"));
  y -= 20;
  if (subtitle) {
    addWrapped(subtitle, margin, 82, 10, "F1", "#647486", 14);
  }
  y -= 10;

  if (meta.length) {
    const cardHeight = 52;
    const gap = 10;
    const cardWidth = (pageWidth - margin * 2 - gap) / 2;
    for (let index = 0; index < meta.length; index += 2) {
      ensureSpace(cardHeight + 14);
      [0, 1].forEach((offset) => {
        const item = meta[index + offset];
        if (!item) return;
        const x = margin + offset * (cardWidth + gap);
        commands.push(rectCommand(x, y - cardHeight + 12, cardWidth, cardHeight, "#ffffff", "#d7e2ec"));
        commands.push(rectCommand(x, y + 2, 5, 10, "#22b8aa"));
        commands.push(textCommand(item.label, x + 16, y - 6, 8, "F2", "#647486"));
        wrapText(item.value, 34).slice(0, 2).forEach((line, lineIndex) => {
          commands.push(textCommand(line, x + 16, y - 22 - lineIndex * 12, 9, "F1", "#102033"));
        });
      });
      y -= cardHeight + 10;
    }
  }

  sections.forEach((section) => {
    ensureSpace(72);
    y -= 6;
    commands.push(rectCommand(margin, y - 24, pageWidth - margin * 2, 30, "#ffffff", "#d7e2ec"));
    commands.push(rectCommand(margin, y - 24, 6, 30, section.accent || "#0a84ff"));
    commands.push(textCommand(section.heading, margin + 16, y - 12, 13, "F2", "#061524"));
    y -= 42;

    (section.rows || []).forEach((row) => {
      const label = typeof row === "string" ? "" : row.label;
      const value = typeof row === "string" ? row : row.value;
      const lines = wrapText(value, label ? 72 : 86);
      ensureSpace(lines.length * 13 + 24);
      if (label) {
        commands.push(textCommand(label, margin, y, 8, "F2", "#647486"));
        y -= 12;
      }
      addWrapped(value, margin, 86, 10, "F1", "#102033", 13);
      y -= 5;
    });
  });

  finishPage();

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >> endobj`,
    "3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
  ];

  pages.forEach((stream, index) => {
    const pageRef = 5 + index * 2;
    const contentRef = pageRef + 1;
    objects.push(
      `${pageRef} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >> endobj`
    );
    objects.push(`${contentRef} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
