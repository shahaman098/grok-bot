import { z } from "zod";

export const professionalProfileSchema = z.object({
  headline: z.string().trim().max(240),
  about: z.string().trim().max(2000),
  skills: z.string().trim().max(1000),
  experience: z.string().trim().max(4000),
  education: z.string().trim().max(2000),
}).strict();

export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export const emptyProfessionalProfile: ProfessionalProfile = {
  headline: "", about: "", skills: "", experience: "", education: "",
};
export const professionalFields = [
  { name: "headline", label: "Headline", max: 240, rows: 2 },
  { name: "about", label: "About", max: 2000, rows: 4 },
  { name: "skills", label: "Skills", max: 1000, rows: 3 },
  { name: "experience", label: "Experience", max: 4000, rows: 6 },
  { name: "education", label: "Education", max: 2000, rows: 4 },
] as const;

export function hasProfessionalDetails(profile: ProfessionalProfile | null | undefined): boolean {
  return !!profile && professionalFields.some(({ name }) => profile[name].trim());
}

/** Defensive decoding for persisted JSON and the public directory projection. */
export function readProfessionalProfile(value: unknown): ProfessionalProfile | null {
  const result = professionalProfileSchema.safeParse(value);
  return result.success && hasProfessionalDetails(result.data) ? result.data : null;
}
