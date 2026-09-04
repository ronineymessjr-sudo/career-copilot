function clean(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); }
function escapeXml(value) { return clean(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(value) { return [value & 255, (value >>> 8) & 255]; }
function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
function zipStore(entries) {
  const encoder = new TextEncoder(); const local = []; const central = []; let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name); const data = encoder.encode(entry.content); const crc = crc32(data);
    const header = new Uint8Array([0x50,0x4b,0x03,0x04,...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);
    local.push(header, data);
    const c = new Uint8Array([0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
    central.push(c); offset += header.length + data.length;
  }
  const centralLength = central.reduce((sum, value) => sum + value.length, 0);
  const end = new Uint8Array([0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(centralLength),...u32(offset),...u16(0)]);
  const length = offset + centralLength + end.length; const output = new Uint8Array(length); let cursor = 0;
  for (const part of [...local, ...central, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}
function paragraph(text, style = "") { return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`; }
function records(rows = []) { return rows.flatMap((row) => [paragraph(String(row.title || row.name || row.company || ""), "Heading2"), paragraph(String(row.description || row.summary || row.detail || ""))]); }
export function tailoredResumeDocx(application = {}, job = {}, pack = {}) {
  const resume = pack.tailored_resume || pack.content_bundle?.tailored_resume || {};
  const candidate = resume.candidate || {};
  const paragraphs = [
    paragraph(candidate.name || "候选人", "Title"), paragraph([candidate.headline, candidate.email, candidate.phone, candidate.city].filter(Boolean).join(" · ")),
    paragraph("个人简介", "Heading1"), paragraph(resume.summary || ""), paragraph("技能", "Heading1"), paragraph((resume.skills || []).join("、")),
    paragraph("经历", "Heading1"), ...records(resume.experience), paragraph("项目", "Heading1"), ...records(resume.projects),
    paragraph("教育", "Heading1"), ...records(resume.education), paragraph(`目标岗位：${job.company_name || ""} · ${job.title || ""}`),
  ];
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`;
  return zipStore([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", content: documentXml },
    { name: "word/_rels/document.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>` },
  ]);
}

export function validateRenderedResumeDocx(bytes, application = {}, job = {}, pack = {}) {
  const data = new TextDecoder().decode(bytes instanceof Uint8Array ? bytes : new Uint8Array());
  const candidate = pack.tailored_resume?.candidate || pack.content_bundle?.tailored_resume?.candidate || {};
  const resume = pack.tailored_resume || pack.content_bundle?.tailored_resume || {};
  const requirements = {
    zip_container: bytes instanceof Uint8Array && bytes[0] === 0x50 && bytes[1] === 0x4b,
    document_xml_present: data.includes("<w:document") && data.includes("</w:document>"),
    candidate_name_present: Boolean(String(candidate.name || "").trim() && data.includes(String(candidate.name))),
    summary_present: Boolean(String(resume.summary || "").trim() && data.includes(String(resume.summary))),
    target_title_present: Boolean(String(job.title || "").trim() && data.includes(String(job.title))),
  };
  return { passed: Object.values(requirements).every(Boolean), checks: requirements, missing: Object.entries(requirements).filter(([, passed]) => !passed).map(([name]) => name) };
}
