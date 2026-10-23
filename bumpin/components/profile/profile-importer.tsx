"use client";

import { useId, useState } from "react";
import { FileUp } from "lucide-react";
import { hasProfessionalDetails, professionalFields, professionalProfileSchema, type ProfessionalProfile } from "@/lib/professional-profile";

export function ProfileImporter({ profile, onSave }: {
  profile: ProfessionalProfile | null;
  onSave: (profile: ProfessionalProfile | null) => Promise<void>;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState<ProfessionalProfile | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState("");
  async function save(value: ProfessionalProfile | null) {
    if (busy) return;
    setBusy(true); setError(null); setSaved(null);
    try {
      await onSave(value ? professionalProfileSchema.parse(value) : null);
      setDraft(null); setWarnings([]);
      setFileNames("");
      setSaved(value ? "Imported profile saved." : "Imported profile removed.");
    } catch {
      setError("Could not save your imported profile. Your draft is still here; please retry.");
    } finally { setBusy(false); }
  }
  return (
    <details className="profile-import">
      <summary><FileUp size={18} aria-hidden="true" /> {profile ? "Manage imported profile" : "Import your LinkedIn profile"}</summary>
      <div className="profile-import-content">
        <p className="muted">Bring your experience into the room. Choose your own English LinkedIn profile PDF, or Profile, Skills, Positions and Education CSVs (also accepted in a ZIP). Up to 8 MB; PDFs up to 20 pages.</p>
        <p className="profile-import-privacy">Your file stays on this device. Only the details you review and save are shared with event members while your profile is visible.</p>
        <details className="profile-export-help">
          <summary>Where do I get my export?</summary>
          <p className="muted">On LinkedIn desktop, open your own profile → More or Resources → Save to PDF. For CSVs, open Settings &amp; Privacy → Data privacy → Get a copy of your data. Export availability varies by account.</p>
        </details>
        <label className="field profile-file-field">
          <span>Your LinkedIn profile files</span>
          <input type="file" name="linkedinExport" accept=".pdf,.zip,.csv" multiple disabled={busy}
            onChange={async event => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (!files.length) return;
              setBusy(true); setError(null); setSaved(null);
              try {
                const { readLinkedInFiles } = await import("@/lib/profile-import/read-file");
                const result = await readLinkedInFiles(files);
                setDraft(result.profile); setWarnings(result.warnings);
                setFileNames(files.map(file => file.name).join(", "));
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not read this export. Try another profile PDF or CSV.");
              } finally { setBusy(false); }
            }} />
        </label>
        {fileNames && <p className="muted">Read on this device: {fileNames}</p>}
        {busy && <p role="status">Working on your profile…</p>}
        {error && <p role="alert" className="error-note">{error}</p>}
        {saved && <p role="status">{saved}</p>}
        {draft ? (
          <form className="profile-import-review" onSubmit={event => { event.preventDefault(); void save(draft); }}>
            <h3>Review before sharing</h3>
            <p className="muted">Check the sections below and clear anything you do not want to share. Saving replaces your previously imported details. Your event offers and goals stay as you set them.</p>
            {warnings.map(warning => <p className="profile-import-warning" key={warning}>{warning}</p>)}
            {professionalFields.map(field => (
              <div className="field" key={field.name}>
                <label htmlFor={`${fieldId}-${field.name}`}>{field.label}</label>
                <textarea id={`${fieldId}-${field.name}`} name={field.name} value={draft[field.name]} maxLength={field.max} rows={field.rows} disabled={busy}
                  onChange={event => setDraft({ ...draft, [field.name]: event.target.value })} />
              </div>
            ))}
            <button type="submit" className="primary-button" disabled={busy || !hasProfessionalDetails(draft)}>Save reviewed profile</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => { setDraft(null); setWarnings([]); setError(null); setFileNames(""); }}>Discard draft</button>
          </form>
        ) : profile ? (
          <div className="profile-import-actions">
            <button type="button" className="secondary-button" disabled={busy} onClick={() => { setDraft({ ...profile }); setWarnings([]); setSaved(null); setError(null); }}>Edit saved details</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => void save(null)}>Remove imported profile</button>
          </div>
        ) : null}
      </div>
    </details>
  );
}
