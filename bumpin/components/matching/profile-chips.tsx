"use client";
export const PROFILE_CHOICES = [
  { label: "Build apps", value: "Software development" },
  { label: "Design", value: "Product design" },
  { label: "AI & data", value: "AI data" },
  { label: "Pitch & sell", value: "Sales pitching" },
  { label: "Run events", value: "Event organising" },
  { label: "Mentor", value: "Mentoring" },
] as const;
export function ProfileChips({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="profile-choice">
      <legend>{title}</legend>
      <div className="profile-chip-list">
        {PROFILE_CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            className="profile-chip"
            aria-pressed={value === choice.value}
            disabled={disabled}
            onClick={() => onChange(value === choice.value ? "" : choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
