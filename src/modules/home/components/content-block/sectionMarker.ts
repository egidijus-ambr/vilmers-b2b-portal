// Shared section-marker contract (must match the admin editor byte-for-byte).
// A single stored `description` string can hold multiple text columns separated
// by an in-string delimiter. Legacy strings with no delimiter yield a single
// section (the whole string) plus empty tail sections.

export function splitSections(raw?: string | null): string[] {
  return (raw ?? "").split(/\n*:::section-break:::\n*/)
}
