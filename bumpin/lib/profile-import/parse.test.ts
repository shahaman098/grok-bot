import { describe, expect, it } from "vitest";
import { emptyProfessionalProfile, professionalProfileSchema } from "@/lib/professional-profile";
import { parseCsv, parseLinkedInCsv, parseLinkedInPdf, MAX_EXPORT_TEXT } from "./parse";

describe("LinkedIn export parsing", () => {
  it("handles BOM, quoted commas, escaped quotes and multiline descriptions", () => {
    expect(parseCsv('\uFEFFTitle,Description\r\nEngineer,"Built APIs, and \"\"tools\"\"\nwith React"\r\n')).toEqual([
      { title: "Engineer", description: 'Built APIs, and "tools"\nwith React' },
    ]);
  });
  it("imports only professional columns from the supported CSV files", () => {
    const { profile } = parseLinkedInCsv([
      { name: "export/Profile.csv", text: 'First Name,Headline,Summary,Email Address,Address\nAlex,Engineer,Building useful tools,private@example.com,Private street' },
      { name: "Skills.csv", text: 'Name\nReact\nTypeScript\nReact' },
      { name: "Positions.csv", text: 'Company Name,Title,Description,Started On,Finished On\nAcme,Engineer,"Shipped APIs, and tools",2023,2025' },
      { name: "Education.csv", text: 'School Name,Degree Name,Start Date,End Date,Notes\nExample University,BSc,2018,2021,Computer science' },
      { name: "Contacts.csv", text: 'Email\nprivate@example.com' },
    ]);
    expect(profile).toEqual({
      headline: "Engineer", about: "Building useful tools", skills: "React, TypeScript",
      experience: "Engineer · Acme\n2023 – 2025\nShipped APIs, and tools",
      education: "Example University\nBSc\n2018 – 2021\nComputer science",
    });
    expect(JSON.stringify(profile)).not.toMatch(/private|Private|Alex/);
  });
  it("does not interpret an unrelated or malformed export as a profile", () => {
    expect(() => parseLinkedInCsv([{ name: "Connections.csv", text: "Email\nprivate@example.com" }])).toThrow(/No supported/);
    expect(() => parseCsv('Name\n"unfinished')).toThrow(/unfinished/);
    expect(() => parseLinkedInCsv([{ name: "Skills.csv", text: "Name\nReact" }, { name: "folder/Skills.csv", text: "Name\nRust" }])).toThrow(/just one/);
  });
  it("bounds input and warns when a section is shortened", () => {
    expect(() => parseCsv("a".repeat(MAX_EXPORT_TEXT + 1))).toThrow(/too large/);
    const result = parseLinkedInCsv([{ name: "Profile.csv", text: "Headline\n" + "a".repeat(300) }]);
    expect(result.profile.headline).toHaveLength(240);
    expect(result.warnings).toEqual([expect.stringContaining("Headline was shortened")]);
  });
  it("extracts a two-column LinkedIn PDF without sidebar contact details", () => {
    const { profile } = parseLinkedInPdf([
      { main: ["Alex Example", "Software engineer", "London", "Summary", "I build accessible tools.", "Experience", "Acme", "Engineer", "2022 – 2025", "Page 1 of 2"],
        sidebar: ["Contact", "private@example.com", "+44 7000 000000", "Top Skills", "React", "TypeScript", "Languages", "English"] },
      { main: ["Built event tools.", "Education", "Example University", "BSc Computer Science", "Page 2 of 2"], sidebar: [] },
    ]);
    expect(profile).toEqual({ headline: "Software engineer", about: "I build accessible tools.", skills: "React\nTypeScript", experience: "Acme\nEngineer\n2022 – 2025\nBuilt event tools.", education: "Example University\nBSc Computer Science" });
    expect(JSON.stringify(profile)).not.toMatch(/private|7000|Page|English/);
  });
  it("does not invent profile sections from an unrecognized PDF", () => {
    expect(() => parseLinkedInPdf([{ main: ["An invoice", "Total 200"], sidebar: [] }])).toThrow(/No supported/);
    expect(professionalProfileSchema.safeParse({ ...emptyProfessionalProfile, skills: ["React"] }).success).toBe(false);
    expect(professionalProfileSchema.safeParse({ ...emptyProfessionalProfile, email: "private@example.com" }).success).toBe(false);
  });
});
