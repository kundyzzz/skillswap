// Small helpers shared by several pages.

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Profile fields that count as "filled in" (US-01).
export const PROFILE_FIELDS = [
  { key: 'name', label: 'Full name' },
  { key: 'university', label: 'University' },
  { key: 'faculty', label: 'School' },
  { key: 'year', label: 'Year of study' },
  { key: 'bio', label: 'About me' }
];

export function isFilled(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

// Completion = 5 profile fields + at least one "teach" + at least one "learn" skill.
export function profileCompletion(profile, skills = []) {
  const checks = [
    ...PROFILE_FIELDS.map((f) => isFilled(profile?.[f.key])),
    skills.some((s) => s.type === 'teach'),
    skills.some((s) => s.type === 'learn')
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
