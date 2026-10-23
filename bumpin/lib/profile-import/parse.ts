import { emptyProfessionalProfile, hasProfessionalDetails, professionalFields, type ProfessionalProfile } from "@/lib/professional-profile";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export const MAX_EXPORT_TEXT = 1024 * 1024;
export const exportFileNames = new Set(["profile.csv", "skills.csv", "positions.csv", "education.csv"]);
export type ImportDraft = { profile: ProfessionalProfile; warnings: string[] };

export function exportBaseName(name: string): string {
  return name.replaceAll("\\", "/").split("/").pop()?.toLowerCase() ?? "";
}

function finish(profile: ProfessionalProfile): ImportDraft {
  const warnings: string[] = [];
  for (const field of professionalFields) {
    if (profile[field.name].length > field.max) {
      profile[field.name] = profile[field.name].slice(0, field.max).trim();
      warnings.push(`${field.label} was shortened to fit your profile. Please review it.`);
    }
  }
  if (!hasProfessionalDetails(profile)) throw new Error("No supported profile details found. Use a LinkedIn profile PDF or the Profile, Skills, Positions and Education CSVs from your own export.");
  return { profile, warnings };
}

/** Bounded RFC 4180-style CSV reader, including quotes, BOM and multiline cells. */
export function parseCsv(text: string): Record<string, string>[] {
  if (text.length > MAX_EXPORT_TEXT) throw new Error("This CSV is too large. Select only your profile export files.");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i <= input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (!quoted && cell !== "") throw new Error("This export contains malformed CSV quotes.");
      else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n" || char === undefined)) {
      row.push(cell.replace(/\r$/, "").trim()); cell = "";
      if (char !== ",") { if (row.some(Boolean)) rows.push(row); row = []; }
    } else if (char !== undefined) cell += char;
    if (rows.length > 2000 || row.length > 100) throw new Error("This export has too many rows or columns.");
  }
  if (quoted) throw new Error("This CSV has an unfinished quoted field. Download the export again.");
  const headers = rows.shift()?.map(value => value.toLowerCase()) ?? [];
  return rows.map(values => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

/** Only allowlisted professional columns are read; account/contact fields are ignored. */
export function parseLinkedInCsv(files: { name: string; text: string }[]): ImportDraft {
  const profile = { ...emptyProfessionalProfile };
  const seen = new Set<string>();
  for (const file of files) {
    const name = exportBaseName(file.name);
    if (!exportFileNames.has(name)) continue;
    if (seen.has(name)) throw new Error(`Select just one ${name} file per import.`);
    seen.add(name);
    const rows = parseCsv(file.text);
    if (name === "profile.csv") {
      profile.headline = rows[0]?.headline ?? "";
      profile.about = rows[0]?.summary ?? "";
    } else if (name === "skills.csv") {
      profile.skills = [...new Set(rows.map(row => row.name ?? row.skill ?? "").filter(Boolean))].join(", ");
    } else if (name === "positions.csv") {
      profile.experience = rows.map(row => [
        [row.title, row["company name"]].filter(Boolean).join(" · "),
        [row["started on"], row["finished on"]].filter(Boolean).join(" – "),
        row.description,
      ].filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
    } else if (name === "education.csv") {
      profile.education = rows.map(row => [
        row["school name"], row["degree name"],
        [row["start date"], row["end date"]].filter(Boolean).join(" – "),
        row.notes,
      ].filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
    }
  }
  return finish(profile);
}

const headings = new Map<string, keyof ProfessionalProfile | null>([
  ["summary", "about"], ["about", "about"], ["experience", "experience"],
  ["education", "education"], ["top skills", "skills"], ["skills", "skills"],
  ["contact", null], ["languages", null], ["certifications", null],
  ["honors-awards", null], ["honors & awards", null], ["publications", null],
  ["patents", null], ["volunteering", null], ["volunteer experience", null],
]);

export type PdfProfilePage = { main: string[]; sidebar: string[] };

export function parseLinkedInPdf(pages: PdfProfilePage[]): ImportDraft {
  const profile = { ...emptyProfessionalProfile };
  let section: keyof ProfessionalProfile | null = null;
  let foundHeading = false;
  const header: string[] = [];
  const append = (field: keyof ProfessionalProfile, line: string) => {
    profile[field] += (profile[field] ? "\n" : "") + line;
  };
  for (const page of pages) {
    for (const raw of page.main) {
      const line = raw.trim();
      if (!line || /^Page\s+\d+\s+(?:of|\/)\s*\d+$/i.test(line)) continue;
      const heading = line.toLowerCase().replace(/:$/, "");
      if (headings.has(heading)) { section = headings.get(heading) ?? null; foundHeading = true; continue; }
      if (section) append(section, line);
      else if (!foundHeading) header.push(line);
    }
    let sidebarSection: keyof ProfessionalProfile | null = null;
    for (const raw of page.sidebar) {
      const line = raw.trim();
      const heading = line.toLowerCase().replace(/:$/, "");
      if (headings.has(heading)) sidebarSection = headings.get(heading) ?? null;
      else if (sidebarSection === "skills" && line) append("skills", line);
    }
  }
  // Standard LinkedIn PDF header: name, headline (possibly wrapped), location.
  if (foundHeading && header.length >= 2) profile.headline = (header.length > 2 ? header.slice(1, -1) : header.slice(1)).join(" ");
  return finish(profile);
}
