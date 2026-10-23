import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { readLinkedInFiles } from "./read-file";
import { MAX_IMPORT_BYTES, MAX_EXPORT_TEXT } from "./parse";

describe("local profile file reading", () => {
  it("reads standalone CSV files and only extracts allowlisted files from a ZIP", async () => {
    const csv = new File(["Name\nReact"], "Skills.csv");
    expect((await readLinkedInFiles([csv])).profile.skills).toBe("React");
    const zip = zipSync({ "Export/Skills.csv": strToU8("Name\nRust"), "Messages.csv": strToU8("Private conversations") });
    const result = await readLinkedInFiles([new File([zip as Uint8Array<ArrayBuffer>], "export.zip")]);
    expect(result.profile.skills).toBe("Rust");
    expect(JSON.stringify(result)).not.toContain("Private");
  });
  it("rejects oversized inputs, unsupported files and expanded ZIP payloads", async () => {
    await expect(readLinkedInFiles([new File([new Uint8Array(MAX_IMPORT_BYTES + 1)], "profile.pdf")])).rejects.toThrow(/8 MB/);
    await expect(readLinkedInFiles([new File(["not pdf"], "profile.pdf")])).rejects.toThrow(/valid PDF/);
    await expect(readLinkedInFiles([new File(["text"], "resume.docx")])).rejects.toThrow(/Choose one/);
    const zip = zipSync({ "Skills.csv": new Uint8Array(MAX_EXPORT_TEXT + 1) });
    await expect(readLinkedInFiles([new File([zip as Uint8Array<ArrayBuffer>], "export.zip")])).rejects.toThrow(/too large/);
  });
});
