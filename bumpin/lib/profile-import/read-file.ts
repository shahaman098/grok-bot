import { unzipSync, strFromU8 } from "fflate";
import { exportBaseName, exportFileNames, MAX_EXPORT_TEXT, MAX_IMPORT_BYTES, parseLinkedInCsv, parseLinkedInPdf, type ImportDraft, type PdfProfilePage } from "./parse";

type TextPiece = { str: string; x: number; y: number };

function lines(pieces: TextPiece[]): string[] {
  const sorted = [...pieces].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: { y: number; pieces: TextPiece[] }[] = [];
  for (const piece of sorted) {
    const previous = rows.at(-1);
    if (previous && Math.abs(previous.y - piece.y) < 3) previous.pieces.push(piece);
    else rows.push({ y: piece.y, pieces: [piece] });
  }
  return rows.map(row => row.pieces.sort((a, b) => a.x - b.x).map(p => p.str).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

async function readPdf(bytes: Uint8Array): Promise<ImportDraft> {
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes("%PDF-")) throw new Error("This file is not a valid PDF.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker-${pdfjs.version}.min.mjs`;
  const task = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: true, stopAtErrors: true });
  try {
    const doc = await task.promise;
    if (doc.numPages > 20) throw new Error("Use a profile PDF of 20 pages or fewer.");
    const pages: PdfProfilePage[] = [];
    let textLength = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pieces: TextPiece[] = content.items.flatMap(item => "str" in item ? [{ str: item.str, x: item.transform[4], y: item.transform[5] }] : []);
      textLength += pieces.reduce((sum, item) => sum + item.str.length, 0);
      if (textLength > 60000) throw new Error("This PDF has too much text. Export only your LinkedIn profile.");
      const sidebarEdge = page.getViewport({ scale: 1 }).width * 0.3;
      const sidebar = pieces.filter(p => p.x < sidebarEdge);
      const hasSidebar = sidebar.some(p => /^(?:contact|top skills)$/i.test(p.str.trim()));
      pages.push(hasSidebar
        ? { main: lines(pieces.filter(p => p.x >= sidebarEdge)), sidebar: lines(sidebar) }
        : { main: lines(pieces), sidebar: [] });
      page.cleanup();
    }
    if (textLength < 20) throw new Error("This PDF has no readable text. Scanned PDFs are not supported; use LinkedIn’s text PDF or CSV export.");
    const result = parseLinkedInPdf(pages);
    result.warnings.unshift("PDF layouts vary. Check the extracted sections before sharing.");
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new Error("This PDF is password protected. Use an unlocked copy of your own profile export.");
    throw error;
  } finally {
    await task.destroy();
  }
}

/** Called from a user gesture in the browser. Source files never leave the device. */
export async function readLinkedInFiles(files: File[]): Promise<ImportDraft> {
  if (!files.length) throw new Error("Choose your own LinkedIn profile PDF or export.");
  if (files.length > 4 || files.reduce((sum, file) => sum + file.size, 0) > MAX_IMPORT_BYTES) throw new Error("Choose up to four files, totaling 8 MB or less.");
  if (files.length === 1 && /\.pdf$/i.test(files[0].name)) return readPdf(new Uint8Array(await files[0].arrayBuffer()));
  if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
    let expanded = 0;
    const entries = unzipSync(new Uint8Array(await files[0].arrayBuffer()), { filter: file => {
      if (!exportFileNames.has(exportBaseName(file.name))) return false;
      expanded += file.originalSize;
      if (!Number.isFinite(file.originalSize) || file.originalSize > MAX_EXPORT_TEXT || expanded > MAX_EXPORT_TEXT) throw new Error("The profile files in this ZIP are too large. Select individual profile CSVs instead.");
      return true;
    } });
    return parseLinkedInCsv(Object.entries(entries).map(([name, bytes]) => ({ name, text: strFromU8(bytes) })));
  }
  if (files.some(file => !exportFileNames.has(exportBaseName(file.name)))) throw new Error("Choose one PDF/ZIP, or the Profile.csv, Skills.csv, Positions.csv and Education.csv files from your LinkedIn export.");
  if (files.some(file => file.size > MAX_EXPORT_TEXT)) throw new Error("A selected CSV is too large. Export only your profile details.");
  return parseLinkedInCsv(await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() }))));
}
