const {
  Document, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageOrientation, convertInchesToTwip,
  NumberFormat, Footer, PageNumber, Header
} = require('docx');

function buildWordDocument(topic, introData) {
  const { paragraphs, references } = introData;

  const children = [];

  // ── Title ──────────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: topic, bold: true, size: 28, font: 'Times New Roman' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // ── Section heading: Introduction ─────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'I. INTRODUCTION', bold: true, size: 24, font: 'Times New Roman' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 }
    })
  );

  // ── Body paragraphs ────────────────────────────────────────────────────────
  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: para, size: 24, font: 'Times New Roman' })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240, line: 480 }, // double spacing
        indent: { firstLine: convertInchesToTwip(0.5) }
      })
    );
  }

  // ── References heading ─────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'REFERENCES', bold: true, size: 24, font: 'Times New Roman' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 240 }
    })
  );

  // ── Reference entries ──────────────────────────────────────────────────────
  for (const ref of references) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `[${ref.index}] `, bold: true, size: 22, font: 'Times New Roman' }),
          new TextRun({ text: ref.text, size: 22, font: 'Times New Roman' })
        ],
        spacing: { after: 120 },
        indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.5) }
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1)
            }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: 20 })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  return doc;
}

module.exports = { buildWordDocument };
