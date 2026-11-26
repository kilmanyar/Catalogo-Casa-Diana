function escapePdfLiteral(line: string) {
  return line.replaceAll("₲", "Gs.").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapLine(line: string, maxChars: number) {
  if (line.length <= maxChars) return [line];
  const rows: string[] = [];
  let rest = line;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(" ", maxChars);
    if (cut < 8) cut = maxChars;
    rows.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  rows.push(rest);
  return rows;
}

function latin1(text: string) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i] = code <= 255 ? code : 63;
  }
  return bytes;
}

export function ticketFileName(text: string) {
  const code = text.match(/CD-\d+/)?.[0] ?? "pedido";
  return `Casa-Diana-${code}.pdf`;
}

export function ticketPdf(text: string) {
  const fontSize = 9;
  const leading = 12;
  const marginX = 18;
  const marginY = 24;
  const pageWidth = 260;
  const lines = text.replaceAll("\r", "").split("\n").flatMap((line) => wrapLine(line, 38));
  const pageHeight = Math.max(420, marginY * 2 + lines.length * leading);

  const stream = [
    "BT",
    `/F1 ${fontSize} Tf`,
    `${leading} TL`,
    `${marginX} ${pageHeight - marginY - fontSize} Td`,
    ...lines.flatMap((line, index) => (index === 0 ? [`(${escapePdfLiteral(line)}) Tj`] : ["T*", `(${escapePdfLiteral(line)}) Tj`])),
    "ET",
  ].join("\n");
  const streamBytes = latin1(stream);

  const chunks: Uint8Array[] = [];
  let pos = 0;
  const add = (data: Uint8Array) => {
    chunks.push(data);
    pos += data.length;
  };
  const ascii = (value: string) => add(latin1(value));
  const offsets = [0];
  const obj = (body: string) => {
    offsets.push(pos);
    ascii(body);
  };

  ascii("%PDF-1.4\n");
  obj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  obj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  obj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`);
  obj(`4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
  add(streamBytes);
  ascii("\nendstream\nendobj\n");
  obj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n");

  const xref = pos;
  let table = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  ascii(table);
  ascii(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const pdf = new Uint8Array(pos);
  let cursor = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, cursor);
    cursor += chunk.length;
  }
  return pdf;
}
